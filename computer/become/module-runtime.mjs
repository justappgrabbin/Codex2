// Module runtime for the Universal Execution Bridge's registered-runtime slot.
// Runs modern JavaScript (import/export) and TypeScript/JSX as real ES modules:
//   strip types (sucrase) -> rewrite sibling imports to data: URLs -> import()
// Works in Node and in the browser (data: module URLs are allowed in both).
// It never pretends: a missing sibling file or an outside package is reported
// as a requirement, and the bridge moves on to its next stage.
import { transform } from './vendor/sucrase.mjs';

const ext = (n = '') => (String(n).toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1] || '';
const MODULE_KINDS = new Set(['javascript', 'typescript', 'ts', 'tsx', 'jsx', 'mjs', 'mts', 'cts']);
const textOf = a => typeof a?.content === 'string' ? a.content : typeof a?.text === 'string' ? a.text
  : a?.bytes instanceof Uint8Array ? new TextDecoder().decode(a.bytes) : '';
const nameOf = a => a?.path || a?.name || a?.originalName || 'artifact.mjs';

export class ModuleRequirementError extends Error {
  constructor(code, detail) { super(`${code}: ${detail}`); this.code = code; this.detail = detail; }
}

/** Strip TypeScript / JSX so the browser or Node can load it. */
export function toJavaScript(source, name) {
  const e = ext(name), transforms = [];
  if (['ts', 'tsx', 'mts', 'cts'].includes(e)) transforms.push('typescript');
  if (['tsx', 'jsx'].includes(e) || (e === 'js' && /<[A-Z][\w.]*[\s/>]/.test(source) && /return\s*\(?\s*</.test(source))) transforms.push('jsx');
  if (!transforms.length) return source;
  return transform(source, { transforms, production: true, jsxRuntime: 'automatic', disableESTransforms: true, filePath: name }).code;
}

function resolveSibling(from, spec, files) {
  const dir = from.split('/').slice(0, -1), stack = [];
  for (const p of (spec.startsWith('/') ? spec.slice(1).split('/') : [...dir, ...spec.split('/')])) { if (p === '..') stack.pop(); else if (p && p !== '.') stack.push(p); }
  const base = stack.join('/');
  for (const c of [base, ...['.ts', '.tsx', '.js', '.mjs', '.jsx', '.json'].map(x => base + x), base + '/index.ts', base + '/index.tsx', base + '/index.js'])
    if (files.has(c)) return c;
  if (/^[@~]\//.test(spec)) { const leaf = spec.slice(2); for (const p of files.keys()) if (p.replace(/\.\w+$/, '').endsWith(leaf)) return p; }
  return null;
}

const toDataURL = (code, mime = 'text/javascript') => `data:${mime};base64,` + (typeof Buffer !== 'undefined'
  ? Buffer.from(code, 'utf8').toString('base64') : btoa(unescape(encodeURIComponent(code))));

/** Direct relative imports of one file, resolved to file names (for build order). */
export function importsOf(name, files) {
  const code = files.get(name) || '', out = [];
  for (const m of code.matchAll(/(?:\bimport\s+(?:[\s\S]*?\sfrom\s+)?|\bimport\s*\(\s*|\bexport\s+(?:\*|\{[^}]*\})\s*from\s+)(['"])([^'"]+)\1/g)) {
    if (!/^\.{0,2}\/|^[@~]\//.test(m[2])) continue;
    const hit = resolveSibling(name, m[2], files); if (hit) out.push(hit);
  }
  return [...new Set(out)];
}

/** Build a self-contained module graph: every relative import becomes a data: URL. */
export function linkModules(entryName, files, { packages = {} } = {}) {
  const made = new Map(), missing = [], external = new Set();
  const link = (name, stack) => {
    if (made.has(name)) return made.get(name);
    if (stack.includes(name)) throw new ModuleRequirementError('CIRCULAR_IMPORT', [...stack, name].join(' -> '));
    let code = files.get(name);
    if (ext(name) === 'json') { const u = toDataURL(`export default ${code};`); made.set(name, u); return u; }
    code = toJavaScript(code, name);
    code = code.replace(/(\bimport\s+(?:[\s\S]*?\sfrom\s+)?|\bimport\s*\(\s*|\bexport\s+(?:\*|\{[^}]*\})\s*from\s+)(['"])([^'"]+)\2/g, (m, pre, q, spec) => {
      if (/^(data:|https?:)/.test(spec)) return m;
      if (/^\.{0,2}\/|^[@~]\//.test(spec) && !/^@[\w-]+\/[\w-]/.test(spec.replace(/^@\//, ''))) {
        const hit = resolveSibling(name, spec, files);
        if (!hit) { missing.push({ from: name, spec }); return m; }
        return pre + q + link(hit, [...stack, name]) + q;
      }
      const pkg = spec.split('/').slice(0, spec.startsWith('@') ? 2 : 1).join('/');
      if (packages[spec] || packages[pkg]) return pre + q + (packages[spec] || packages[pkg]) + q;
      external.add(pkg); return m;
    });
    const u = toDataURL(code); made.set(name, u); return u;
  };
  const url = link(entryName, []);
  return { url, modules: made.size, missing, external: [...external] };
}

export function createModuleRuntime({ packages = {}, settleMs = 0 } = {}) {
  return {
    id: 'synthia-module-runtime',
    kinds: [...MODULE_KINDS],
    canRun({ artifact, kind }) {
      const src = textOf(artifact), e = ext(nameOf(artifact));
      return MODULE_KINDS.has(kind) || MODULE_KINDS.has(e) ? (/^\s*(import|export)\b/m.test(src) || ['ts', 'tsx', 'jsx', 'mts', 'cts'].includes(e)) : false;
    },
    async execute({ artifact, context = {} }) {
      const entry = nameOf(artifact);
      const files = new Map((context.files || []).map(f => [nameOf(f), textOf(f)]));
      files.set(entry, textOf(artifact));
      let graph;
      try { graph = linkModules(entry, files, { packages: { ...packages, ...(context.packages || {}) } }); }
      catch (e) { return { ok: false, engine: 'synthia-module-runtime', stdout: [], stderr: [String(e.message)], requirements: [e.code || 'TRANSFORM'] }; }
      if (graph.missing.length || graph.external.length)
        return { ok: false, engine: 'synthia-module-runtime', stdout: [], stderr: [], modules: graph.modules,
          requirements: [...graph.missing.map(m => `file:${m.spec}`), ...graph.external.map(p => `package:${p}`)], missing: graph.missing, external: graph.external };
      const lines = [], orig = globalThis.console;
      const push = (...a) => lines.push(a.map(v => typeof v === 'string' ? v : JSON.stringify(v)).join(' '));
      globalThis.console = { ...orig, log: push, info: push, warn: push, error: push };
      try {
        const mod = await import(/* @vite-ignore */ graph.url);
        if (settleMs) await new Promise(r => setTimeout(r, settleMs)); else await null;
        const exportsSummary = Object.fromEntries(Object.entries(mod).map(([k, v]) => [k, typeof v]));
        return { ok: true, engine: 'synthia-module-runtime', stdout: lines, stderr: [], modules: graph.modules, exports: exportsSummary, returnValue: mod };
      } catch (e) {
        return { ok: false, engine: 'synthia-module-runtime', stdout: lines, stderr: [String(e?.message || e)], modules: graph.modules, requirements: ['runtime-error'] };
      } finally { globalThis.console = orig; }
    },
  };
}
export default createModuleRuntime;
