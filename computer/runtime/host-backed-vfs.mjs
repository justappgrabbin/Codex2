import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, sep, relative } from 'node:path';

export function resolveHostPath(hostRoot, vfsPath) {
  const raw = String(vfsPath || '/');
  if (!raw.startsWith('/') || raw.includes('\0')) throw new TypeError('Invalid path.');
  const parts = raw.split('/').filter((part) => part && part !== '.');
  if (parts.some((part) => part === '..')) throw new TypeError('Path escape.');
  const root = resolve(hostRoot);
  const full = parts.length ? resolve(root, ...parts) : root;
  if (full !== root && !full.startsWith(root + sep)) throw new TypeError('Path escape.');
  return full;
}

function vfsPathFromHost(hostRoot, hostPath) {
  const rel = relative(resolve(hostRoot), resolve(hostPath));
  if (!rel || rel.startsWith('..')) throw new TypeError('Path escape.');
  return '/' + rel.split(sep).join('/');
}

function collectFilesSync(dir, found = []) {
  let entries = [];
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return found; }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectFilesSync(full, found);
    else if (entry.isFile()) found.push(full);
  }
  return found;
}

async function collectFiles(dir, found = []) {
  let entries = [];
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return found; }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await collectFiles(full, found);
    else if (entry.isFile()) found.push(full);
  }
  return found;
}

/** Wraps the original VirtualFileSystem so admitted files also live as real host files. */
export class HostBackedFileSystem {
  constructor({ inner, hostRoot }) {
    if (!inner) throw new TypeError('An inner virtual filesystem is required.');
    this.inner = inner;
    this.hostRoot = resolve(hostRoot);
    this.bus = inner.bus;
    this.state = inner.state;
  }

  async write(path, content, meta = {}) {
    const hostPath = resolveHostPath(this.hostRoot, path);
    await mkdir(dirname(hostPath), { recursive: true });
    const encoding = meta.encoding === 'base64' ? 'base64' : 'utf8';
    const bytes = encoding === 'base64'
      ? Buffer.from(String(content ?? ''), 'base64')
      : Buffer.from(String(content ?? ''), 'utf8');
    await writeFile(hostPath, bytes);
    return this.inner.write(path, content, { ...meta, hostPath, size: bytes.length });
  }

  read(path) {
    const record = this.inner.read(path);
    let hostPath;
    try { hostPath = resolveHostPath(this.hostRoot, path); } catch { return record; }
    if (!existsSync(hostPath)) return record;
    let info;
    try { info = statSync(hostPath); } catch { return record; }
    if (!info.isFile()) return record;
    const encoding = record?.meta?.encoding === 'base64' ? 'base64' : 'utf8';
    const bytes = readFileSync(hostPath);
    const content = encoding === 'base64' ? bytes.toString('base64') : bytes.toString('utf8');
    if (!record) {
      return {
        path: String(path).replace(/\/+$/, '') || '/',
        content,
        meta: { encoding, size: bytes.length, hostPath, source: 'host' },
        updatedAt: info.mtimeMs,
      };
    }
    return { ...record, content, meta: { ...record.meta, size: bytes.length, hostPath }, updatedAt: record.updatedAt ?? info.mtimeMs };
  }

  list(prefix = '/') {
    const fromState = this.inner.list(prefix);
    const found = new Map();
    for (const record of fromState) found.set(record.path, this.read(record.path) ?? record);
    const start = (() => { try { return resolveHostPath(this.hostRoot, prefix); } catch { return null; } })();
    if (start && existsSync(start)) {
      for (const hostPath of collectFilesSync(start)) {
        const vfsPath = vfsPathFromHost(this.hostRoot, hostPath);
        const prefixNorm = String(prefix).replace(/\/+$/, '') || '/';
        if (prefixNorm !== '/' && vfsPath !== prefixNorm && !vfsPath.startsWith(prefixNorm + '/')) continue;
        if (!found.has(vfsPath)) found.set(vfsPath, this.read(vfsPath));
      }
    }
    return [...found.values()].filter(Boolean);
  }

  async hydrate() {
    await mkdir(this.hostRoot, { recursive: true });
    const files = await collectFiles(this.hostRoot);
    for (const hostPath of files) {
      const vfsPath = vfsPathFromHost(this.hostRoot, hostPath);
      if (this.inner.read(vfsPath)) continue;
      const bytes = await readFile(hostPath);
      const binary = bytes.includes(0);
      await this.inner.write(vfsPath, binary ? bytes.toString('base64') : bytes.toString('utf8'), {
        encoding: binary ? 'base64' : 'utf8',
        size: bytes.length,
        hostPath,
        source: 'host-hydrate',
      });
    }
    return files.length;
  }

  async ensureUserTree() {
    const folders = [
      '/home/user', '/home/user/Desktop', '/home/user/Documents', '/home/user/Downloads',
      '/home/user/Imports', '/home/user/Music', '/home/user/Pictures', '/home/user/Videos',
    ];
    for (const folder of folders) await mkdir(resolveHostPath(this.hostRoot, folder), { recursive: true });
  }
}
