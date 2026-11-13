#!/usr/bin/env python3
"""Package the qualified source/runtime; never modify donor originals."""
import hashlib
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / 'release' / 'Synthia-Local-Computer.zip'
SKIP = {'.git', 'node_modules', 'local-data', '.local-state', '__pycache__', '.aws', '.codex', '.agents'}
ARCHIVE = re.compile(r'\.(zip|apk|aab|tar|gz|tgz|7z|rar|part\d+)$', re.I)
CREDENTIAL = re.compile(r'(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-[A-Za-z0-9]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|eyJhbGciOi[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,})')

def included(path):
    rel = path.relative_to(ROOT)
    if rel.parts[0] == 'release':
        return False
    if any(part in SKIP for part in rel.parts) or path.is_symlink():
        return False
    if rel.parts[:3] == ('computer', 'runtime', 'data'):
        return False
    if path.name in {'.env', 'core'} or path.name.startswith(('.env.', 'core.')) or path.suffix in {'.tsbuildinfo', '.pyc'}:
        return False
    return True

def main():
    if not (ROOT / 'computer/shell/kimi-linux/dist/index.html').is_file():
        raise SystemExit('Build the original desktop before packaging')
    files, exclusions, blocked = [], [], []
    for path in sorted(ROOT.rglob('*')):
        if not path.is_file() or not included(path):
            continue
        rel = path.relative_to(ROOT).as_posix()
        content = path.read_bytes()
        entry = {'path': rel, 'sha256': hashlib.sha256(content).hexdigest(), 'bytes': len(content)}
        if ARCHIVE.search(path.name):
            exclusions.append({**entry, 'reason': 'Original archive retained in checkout; not needed by qualified local runtime and not audited for public redistribution'})
            continue
        try:
            if CREDENTIAL.search(content.decode('utf-8')):
                blocked.append(rel)
        except UnicodeDecodeError:
            pass
        files.append((path, entry))
    if blocked:
        raise SystemExit('Credential signature review required in: ' + ', '.join(blocked))
    revision = subprocess.check_output(['git', '-C', str(ROOT), 'rev-parse', 'HEAD'], text=True).strip()
    changed = bool(subprocess.check_output(['git', '-C', str(ROOT), 'status', '--porcelain'], text=True).strip())
    manifest = {'schema': 'synthia.local-package.v1', 'sourceRevision': revision,
                'workingTreeOverlay': changed, 'files': [entry for _, entry in files], 'excludedOriginalArchives': exclusions,
                'credentialCheck': 'No matches for listed common token/private-key signatures in included UTF-8 text; not an exhaustive secret audit',
                'notAnInstaller': True}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUTPUT, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for path, entry in files:
            info = zipfile.ZipInfo('Synthia-Local-Computer/' + entry['path'], date_time=(2026, 11, 13, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (0o100755 if path.suffix == '.sh' else 0o100644) << 16
            archive.writestr(info, path.read_bytes())
        archive.writestr('Synthia-Local-Computer/FILES.json', json.dumps(manifest, indent=2) + '\n')
    result = {'path': str(OUTPUT), 'bytes': OUTPUT.stat().st_size, 'sha256': hashlib.sha256(OUTPUT.read_bytes()).hexdigest(), 'includedFiles': len(files), 'preservedExcludedArchives': len(exclusions)}
    OUTPUT.with_suffix('.sha256').write_text(result['sha256'] + '  ' + OUTPUT.name + '\n')
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()
