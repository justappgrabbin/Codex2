"""Package this continuing Computer source and Kimi build for its local Node host."""
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
destination = root / 'android/app/src/main/assets/computer-assets.zip'
destination.parent.mkdir(parents=True, exist_ok=True)

# Only the locked host dependencies are eligible for the packaged runtime.
locked_packages = json.loads((root / 'package-lock.json').read_text())['packages']
dependency_roots = [Path(name) for name in locked_packages if name.startswith('node_modules/')]
for package in dependency_roots:
    if not (root / package / 'package.json').is_file():
        raise RuntimeError(f'Missing locked host dependency: {package}; run npm --prefix computer ci')

def included(path):
    relative = path.relative_to(root)
    parts = relative.parts
    if parts[:2] == ('runtime', 'data') or '.local-state' in parts:
        return False
    if parts[0] == 'node_modules':
        return any(relative.is_relative_to(package) for package in dependency_roots) and (path.suffix in {'.js', '.mjs', '.cjs', '.wasm', '.json'} or path.name.startswith('LICENSE'))
    if parts[0] in {'android', 'tests', 'platforms'}:
        return False
    if any(part in {'node_modules', '.git', 'tests', 'test', 'source-archives', '__pycache__'} for part in parts):
        return False
    if parts[:2] == ('shell', 'kimi-linux') and 'dist' not in parts:
        return False
    if path.suffix in {'.zip', '.pdf', '.md', '.pyc'}:
        return False
    return True

generative_root = root.parent / 'sources/Generative-address-system/Synthia-Generative-Address-Morphology-Integrated-v0.2.1-RUNNABLE'
if not (generative_root / 'src/index-generative.mjs').is_file():
    raise RuntimeError('Initialize the pinned Generative-address-system submodule before packaging')

with ZipFile(destination, 'w', ZIP_DEFLATED, compresslevel=7) as archive:
    for path in sorted(root.rglob('*')):
        if path.is_file() and included(path):
            archive.write(path, path.relative_to(root).as_posix())
    for path in sorted(generative_root.rglob('*')):
        relative = path.relative_to(generative_root)
        if not path.is_file() or any(part in {'node_modules', '.git', 'tests', 'test', '.local-state', 'data'} for part in relative.parts):
            continue
        if relative.parts[0] not in {'src', 'authorities', 'extensions'} and relative.as_posix() != 'package.json':
            continue
        if path.suffix in {'.mjs', '.js', '.json', '.wasm'} or path.name.startswith('LICENSE'):
            archive.write(path, (Path('bundled-sources/generative') / relative).as_posix())

print(f'{destination}: {destination.stat().st_size} bytes')
