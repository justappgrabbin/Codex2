/**
 * Play runs the folder of the selected file.
 * Static index.html (her DevEnvironment preview) is served.
 * Anything else is run with LocalLinuxRuntime.runWorkspaceFile rules.
 */
import { mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { getBackend, runWorkspaceFile } from '../runtime/linux-container.mjs';

const ENTRY_NAMES = ['main.js', 'main.mjs', 'main.cjs', 'app.js', 'index.js', 'main.py', 'main.sh'];

function locate(userRoot, requested) {
  const root = path.resolve(userRoot);
  const raw = String(requested ?? '').trim();
  if (!raw || raw === '.') {
    return { rel: '', vfsPath: '/home/user', host: root };
  }
  let vfsPath;
  if (raw.startsWith('/')) {
    const hostUser = root;
    if (raw === hostUser || raw.startsWith(hostUser + path.sep)) {
      const rest = raw.slice(hostUser.length).replaceAll('\\', '/');
      vfsPath = `/home/user${rest}`;
    } else if (raw === '/home/user' || raw.startsWith('/home/user/')) vfsPath = raw.replaceAll('\\', '/');
    else throw new TypeError('Workspace path rejected');
  } else {
    if (raw.split(/[/\\]/).includes('..')) throw new TypeError('Workspace path rejected');
    vfsPath = `/home/user/${raw.replace(/^[/\\]+/, '').replaceAll('\\', '/')}`;
  }
  const rel = vfsPath === '/home/user' ? '' : vfsPath.slice('/home/user/'.length);
  if (!rel && vfsPath !== '/home/user') throw new TypeError('Workspace path rejected');
  if (rel.split('/').includes('..') || rel.startsWith('/')) throw new TypeError('Workspace path rejected');
  const host = rel ? path.resolve(root, ...rel.split('/')) : root;
  if (host !== root && !host.startsWith(root + path.sep)) throw new TypeError('Workspace path rejected');
  return { rel, vfsPath, host };
}

async function fileNames(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
}

function previewUrl(rel) {
  const parts = rel.split('/').filter(Boolean).map(encodeURIComponent);
  return `/preview/${parts.join('/')}`;
}

export async function playProject({ userRoot, vfs, path: requested, content, timeoutMs } = {}) {
  if (!userRoot) throw new Error('No user shell root is configured.');
  const located = locate(userRoot, requested);
  if (typeof content === 'string') {
    if (!located.rel) throw new TypeError('Play content needs a file path.');
    await mkdir(path.dirname(located.host), { recursive: true });
    if (vfs?.write) await vfs.write(located.vfsPath, content, { type: 'text', source: 'project-play' });
    else {
      const { writeFile } = await import('node:fs/promises');
      await writeFile(located.host, content);
    }
  }
  const target = await stat(located.host).catch(() => null);
  if (!target && typeof content !== 'string') throw new TypeError('workspace-file-not-found');
  const projectHost = target?.isDirectory() ? located.host : path.dirname(located.host);
  const projectRel = path.relative(path.resolve(userRoot), projectHost).split(path.sep).join('/');
  const project = projectRel && projectRel !== '.' ? `/home/user/${projectRel}` : '/home/user';
  const names = await fileNames(projectHost);
  const selectedIsHtml = !target?.isDirectory() && located.rel.toLowerCase().endsWith('.html');
  if (names.includes('index.html') || selectedIsHtml) {
    const page = names.includes('index.html') ? 'index.html' : path.basename(located.rel);
    const rel = names.includes('index.html')
      ? (projectRel && projectRel !== '.' ? `${projectRel}/${page}` : page)
      : located.rel;
    return { ok: true, mode: 'preview', project, entry: page, previewUrl: previewUrl(rel) };
  }

  let entryRel = '';
  if (target?.isFile() || typeof content === 'string') entryRel = located.rel;
  else {
    const named = ENTRY_NAMES.find((name) => names.includes(name));
    const only = names.filter((name) => /\.(sh|py|pyw|js|mjs|cjs)$/i.test(name));
    const chosen = named || (only.length === 1 ? only[0] : '');
    if (chosen) entryRel = projectRel && projectRel !== '.' ? `${projectRel}/${chosen}` : chosen;
  }
  if (!entryRel) throw new TypeError('No project entry to run.');
  const result = await runWorkspaceFile(entryRel, { enabled: true, workdir: userRoot, timeoutMs });
  const backend = getBackend();
  return {
    ok: result.code === 0 && !result.timedOut,
    mode: 'run',
    project,
    entry: entryRel,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.code,
    code: result.code,
    timedOut: result.timedOut,
    backend: result.backend || backend.id,
    engine: result.engine || (backend.id === 'proot' ? 'embedded-proot-linux' : 'host-shell'),
  };
}
