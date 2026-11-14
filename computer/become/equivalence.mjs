// Observe(Swarm(L(P))) ≡ Observe(JS(P))
//
// Three execution modes, never mixed:
//   native-swarm  JavaScript -> lowerer.mjs (L) -> formations -> the owner's ORIGINAL,
//                 unmodified SWARM-OS RecursivePrimitiveKernel over PrimitiveExecutionVM.
//   reference     the original JavaScript, run separately, ONLY to compare against.
//                 Its results are never reported as swarm results.
//   latent        a function L cannot express in the kernel's operators. It stays in the
//                 genotype with its dependencies and the translator requirement it is
//                 missing. It does not execute anywhere.
//
// Observe(...) = { returned value | thrown error } per call, plus effects. For the
// operators the original kernel has, formations are pure, so the effect list is empty.
import { lowerSource, SwarmExecutor } from './lowerer.mjs';
import { linkModules } from './module-runtime.mjs';

export const MODES = Object.freeze({ SWARM: 'native-swarm', REFERENCE: 'reference', LATENT: 'latent' });

// What the translator / kernel would need for each kind of refusal.
export function requirementOf(reason) {
  if (/destructured|default parameters/.test(reason)) return 'operator: read field of an object input';
  if (/reads a property of an object/.test(reason)) return 'operator: read field / length of a held value';
  if (/calls .* not a swarm formation|calls a method/.test(reason)) return 'operator: the called function as a primitive (or its own formation)';
  if (/joins text/.test(reason)) return 'operator: text concatenation';
  if (/recursion/.test(reason)) return 'kernel: self-reference (bounded recursion)';
  if (/async/.test(reason)) return 'kernel: time (await)';
  if (/outside value/.test(reason)) return 'binding: value defined outside the function';
  if (/side effects|loops|Statement/.test(reason)) return 'kernel: statements with effects or loops';
  if (/uses .*stayed/.test(reason)) return 'dependency: a formation it uses is latent';
  return 'translator: ' + reason;
}

const observe = async (thunk) => { try { return { ok: true, value: await thunk() }; } catch (e) { return { ok: false, error: e?.name || 'Error' }; } };
const same = (a, b) => a.ok === b.ok && (a.ok ? (Object.is(a.value, b.value) || JSON.stringify(a.value) === JSON.stringify(b.value)) : a.error === b.error);

/** Translate one real file and set up both sides, kept apart. */
export async function prepare(source, file) {
  const lowered = lowerSource(source, file);
  const swarm = new SwarmExecutor();            // ORIGINAL RecursivePrimitiveKernel inside
  swarm.formFile(source, file);
  const genotype = [
    ...lowered.formations.map(f => ({ tool: `${file}#${f.name}`, mode: MODES.SWARM, inputs: f.inputs, units: f.steps.length, uses: f.uses, ontology: f.ontology })),
    ...lowered.skipped.map(s => ({ tool: `${file}#${s.name}`, mode: MODES.LATENT, reason: s.reason, requires: requirementOf(s.reason) })),
  ];
  const g = linkModules(file, new Map([[file, source]]));           // reference side only
  const reference = await import(/* @vite-ignore */ g.url);
  return { file, lowered, swarm, reference, genotype };
}

/** Compare swarm vs reference on every case for every swarm-native function. */
export async function compare(prep, cases) {
  const rows = [];
  for (const t of prep.genotype.filter(x => x.mode === MODES.SWARM)) {
    const name = t.tool.split('#')[1], argsList = cases[name] || [];
    for (const args of argsList) {
      const s = await observe(() => prep.swarm.run(t.tool, args));
      const r = await observe(() => prep.reference[name](...args));
      rows.push({ tool: t.tool, args, swarm: s, reference: r, equal: same(s, r) });
    }
  }
  return { rows, equal: rows.every(r => r.equal), compared: rows.length,
    latent: prep.genotype.filter(x => x.mode === MODES.LATENT) };
}

/** Deterministic number cases (seeded), with the edge values that matter: 0, negatives, fractions. */
export function numberCases(arity, n = 40, seed = 7) {
  let x = seed >>> 0; const rnd = () => (x = (Math.imul(x ^ (x >>> 15), 2246822519) + 0x9e3779b9) >>> 0) / 2 ** 32;
  const edges = [0, 1, -1, 0.5, 3, 100, -7.25];
  const out = [];
  for (let i = 0; i < n; i++) out.push(Array.from({ length: arity }, (_, k) => i < edges.length ** 1 && k === arity - 1 ? edges[i % edges.length] : Math.round((rnd() * 200 - 100) * 1000) / 1000));
  for (const a of edges) for (const b of edges) if (arity === 2) out.push([a, b]);
  return out;
}
