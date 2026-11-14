// Browser stand-in for node:fs/promises. Reads go over HTTP (the computer's own files are
// served next to it). There is no disk to write to here, so writes throw a clear error;
// callers already treat host persistence as optional (the browser uses localStorage).
const noDisk = name => async () => { const e = new Error(`${name}: no disk in the browser`); e.code = 'ENOSYS'; throw e; };
export async function readFile(p, opts) {
  const r = await fetch(String(p));
  const spa = !/\.html?$/i.test(String(p)) && /text\/html/i.test(r.headers.get('content-type') || '');
  if (!r.ok || spa) { const e = new Error(`ENOENT: ${p}`); e.code = 'ENOENT'; throw e; }
  const enc = typeof opts === 'string' ? opts : opts?.encoding;
  return enc ? r.text() : new Uint8Array(await r.arrayBuffer());
}
export async function stat(p) { const r = await fetch(String(p), { method: 'HEAD' }); if (!r.ok) { const e = new Error(`ENOENT: ${p}`); e.code = 'ENOENT'; throw e; } return { isFile: () => true, isDirectory: () => false, size: Number(r.headers.get('content-length') || 0) }; }
export const readdir = noDisk('readdir'), writeFile = noDisk('writeFile'), appendFile = noDisk('appendFile'),
  mkdir = noDisk('mkdir'), mkdtemp = noDisk('mkdtemp'), rm = noDisk('rm'), chmod = noDisk('chmod'), cp = noDisk('cp');
export default { readFile, stat, readdir, writeFile, appendFile, mkdir, mkdtemp, rm, chmod, cp };
