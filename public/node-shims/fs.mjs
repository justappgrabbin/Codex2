// Browser stand-in for node:fs (sync). The runtime reads small config/data files
// synchronously at startup; a synchronous HTTP request to the computer's own files does
// the same job here. Writes have no disk to go to and throw a clear error.
function syncGet(path, method = 'GET') {
  const x = new XMLHttpRequest();
  x.open(method, String(path), false);
  try { x.send(); } catch { return null; }
  if (!(x.status >= 200 && x.status < 300)) return null;
  // Static hosts often answer unknown paths with the app page (SPA fallback): that is not the file.
  if (!/\.html?$/i.test(String(path)) && /text\/html/i.test(x.getResponseHeader('content-type') || '')) return null;
  return x;
}
const enoent = p => { const e = new Error(`ENOENT: ${p}`); e.code = 'ENOENT'; return e; };
export const existsSync = p => !!syncGet(p, 'HEAD');
export function readFileSync(p, opts) {
  const x = syncGet(p); if (!x) throw enoent(p);
  const enc = typeof opts === 'string' ? opts : opts?.encoding;
  return enc ? x.responseText : new TextEncoder().encode(x.responseText);
}
export function statSync(p) { const x = syncGet(p, 'HEAD'); if (!x) throw enoent(p); return { isFile: () => true, isDirectory: () => false, size: Number(x.getResponseHeader('content-length') || 0) }; }
const noDisk = name => () => { const e = new Error(`${name}: no disk in the browser`); e.code = 'ENOSYS'; throw e; };
export const readdirSync = noDisk('readdirSync'), writeFileSync = noDisk('writeFileSync'), mkdirSync = noDisk('mkdirSync');
export default { existsSync, readFileSync, statSync, readdirSync, writeFileSync, mkdirSync };
