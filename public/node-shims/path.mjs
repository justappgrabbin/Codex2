// Browser stand-in for node:path, working on URL-style strings ("http://host/a/b.mjs") and
// plain posix paths alike. Joins and resolves the way posix path does.
const isUrl = s => /^[a-z][a-z0-9+.-]*:\/\//i.test(s);
function split(p) { p = String(p); const m = p.match(/^([a-z][a-z0-9+.-]*:\/\/[^/]*)(.*)$/i); return m ? [m[1], m[2] || '/'] : ['', p]; }
function norm(pathname) {
  const abs = pathname.startsWith('/'), out = [];
  for (const part of pathname.split('/')) { if (!part || part === '.') continue; if (part === '..') out.pop(); else out.push(part); }
  return (abs ? '/' : '') + out.join('/');
}
export const sep = '/';
export function join(...parts) { const [o, p] = split(parts.filter(Boolean).join('/')); return o + norm(p); }
export function resolve(...parts) {
  let acc = '';
  for (const p of parts.filter(x => x != null && x !== '')) acc = (isUrl(p) || p.startsWith('/')) ? p : (acc ? acc.replace(/\/?$/, '/') + p : p);
  const [o, p] = split(acc || '/'); return o + norm(p.startsWith('/') ? p : '/' + p);
}
export function dirname(p) { const [o, q] = split(p); const i = q.replace(/\/$/, '').lastIndexOf('/'); return o + (i <= 0 ? '/' : q.slice(0, i)); }
export function basename(p, ext = '') { const b = split(p)[1].replace(/\/$/, '').split('/').pop(); return ext && b.endsWith(ext) ? b.slice(0, -ext.length) : b; }
export function extname(p) { const b = basename(p); const i = b.lastIndexOf('.'); return i > 0 ? b.slice(i) : ''; }
export function relative(from, to) {
  const a = split(from)[1].split('/').filter(Boolean), b = split(to)[1].split('/').filter(Boolean);
  let i = 0; while (i < a.length && a[i] === b[i]) i++;
  return [...Array(a.length - i).fill('..'), ...b.slice(i)].join('/');
}
export const normalize = p => { const [o, q] = split(p); return o + norm(q); };
export const isAbsolute = p => isUrl(p) || String(p).startsWith('/');
export const posix = { sep, join, resolve, dirname, basename, extname, relative, normalize, isAbsolute };
export default posix;
