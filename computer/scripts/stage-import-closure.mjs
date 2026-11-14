// Copy only the files a module actually imports (static imports, re-exports and literal
// dynamic imports), following relative paths. Used to stage big donor trees for the
// browser without shipping hundreds of megabytes.
import { readFile, mkdir, copyFile } from 'node:fs/promises';
import { dirname, resolve, relative, join } from 'node:path';
import { build } from 'esbuild';
// CommonJS files work in Node through interop but not in a browser; bundle each one into
// an ES module (its own require()s inlined) so `import x from './cjs.js'` still works.
const isCjs = t => /\bmodule\.exports\b|\bexports\.[A-Za-z_$]/.test(t) && !/^\s*(import|export)\s/m.test(t);
const SPEC = /(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
export async function stageClosure(srcRoot, entry, destRoot) {
  const seen = new Set(), queue = [resolve(srcRoot, entry)], missing = [];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue; seen.add(file);
    let text; try { text = await readFile(file, 'utf8'); } catch { missing.push(relative(srcRoot, file)); continue; }
    const out = join(destRoot, relative(srcRoot, file));
    await mkdir(dirname(out), { recursive: true });
    if (/\.(js|cjs)$/.test(file) && isCjs(text)) {
      await build({ entryPoints: [file], bundle: true, format: 'esm', platform: 'browser', outfile: out, logLevel: 'silent' });
      continue; // its requires are inlined, nothing further to follow
    }
    await copyFile(file, out);
    if (!/\.(m?js|cjs)$/.test(file)) continue;
    for (const m of text.matchAll(SPEC)) { const s = m[1] || m[2] || m[3]; if (s?.startsWith('.')) queue.push(resolve(dirname(file), s)); }
  }
  return { files: seen.size - missing.length, missing };
}
