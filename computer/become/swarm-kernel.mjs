// STATUS: EXPERIMENTAL EXTENSION — not the primary engine. The primary swarm engine is the
// owner's original SWARM-OS RecursivePrimitiveKernel (see lowerer.mjs + equivalence.mjs).
// Results from here are labeled 'extended-swarm' and must be proven against reference
// execution before any operator is proposed for the original kernel.
// Swarm kernel: the owner's RecursivePrimitiveKernel rules (formations of steps,
// `use` composes another formation) running on the owner's PrimitiveExecutionVM,
// with more kinds of units registered through the VM's own registerOperator():
//   object units  obj get set merge has keys values entries
//   list units    list at len push slice join each filter find reduce some every
//   text units    text str lower upper trim split replace includes startsWith endsWith
//   choice units  branch (lazy: only the chosen side runs; the owner's select is eager)
//   time units    await
//   form units    jsx  (what to draw: a tree the swarm forms itself)
//   effect units  effect (console / state / dom intents, recorded, performed by the swarm)
// The original kernel and VM files are untouched; this sits beside them.
import { PrimitiveExecutionVM } from './vendor/swarm-os/source/universal-primitive-execution-bridge.mjs';

const copy = v => { try { return structuredClone(v); } catch { return v; } };
const KEY = (n, k) => n[k];

export const EXTRA_UNITS = Object.freeze({
  obj: (args, n) => Object.fromEntries((n.keys || []).map((k, i) => [k, args[i]])),
  get: ([o, k], n) => o == null ? undefined : o[n.key ?? k],
  set: ([o, v], n) => ({ ...(o || {}), [n.key]: v }),
  omit: ([o], n) => { const c = { ...(o || {}) }; for (const k of n.keys || []) delete c[k]; return c; },
  classes: args => { const out = []; const walk = a => { if (!a) return; if (typeof a === 'string' || typeof a === 'number') out.push(String(a)); else if (Array.isArray(a)) a.forEach(walk); else if (typeof a === 'object') for (const [k, v] of Object.entries(a)) if (v) out.push(k); }; args.forEach(walk); return out.join(' '); },
  floor: ([a]) => Math.floor(a), ceil: ([a]) => Math.ceil(a), round: ([a]) => Math.round(a), trunc: ([a]) => Math.trunc(a), sign: ([a]) => Math.sign(a),
  now: () => Date.now(), from: ([a, n]) => Array.from(a ?? { length: n?.length ?? 0 }),
  merge: args => Object.assign({}, ...args.map(a => a || {})),
  has: ([o, k]) => o != null && k in Object(o),
  keys: ([o]) => Object.keys(o || {}), values: ([o]) => Object.values(o || {}), entries: ([o]) => Object.entries(o || {}),
  list: args => args.slice(), at: ([a, i]) => a?.at?.(i), len: ([a]) => a?.length ?? 0,
  push: ([a, ...v]) => [...(a || []), ...v], join: ([a, s]) => (a || []).join(s ?? ','),
  text: args => args.map(x => x == null ? '' : String(x)).join(''), str: ([a]) => String(a),
  lower: ([s]) => String(s).toLowerCase(), upper: ([s]) => String(s).toUpperCase(), trim: ([s]) => String(s).trim(),
  split: ([s, d]) => String(s).split(d), replace: ([s, a, b]) => String(s).replace(a, b),
  includes: ([s, x]) => s?.includes?.(x) ?? false, startswith: ([s, x]) => String(s).startsWith(x), endswith: ([s, x]) => String(s).endsWith(x),
  num: ([a]) => Number(a), bool: ([a]) => Boolean(a), isarray: ([a]) => Array.isArray(a),
  typeof: ([a]) => typeof a, json: ([a]) => JSON.stringify(a), parsejson: ([a]) => JSON.parse(a),
  loose_eq: ([a, b]) => a == b, nullish: ([a, b]) => a ?? b, await: async ([a]) => await a,
  jsx: ([type, props, ...children], n) => ({ $form: true, type: n.tag ?? type, props: props || {}, children: children.flat(Infinity).filter(c => c !== false && c != null) }),
});

export class SwarmKernel {
  #formations = new Map(); #journal = [];
  constructor({ vm = new PrimitiveExecutionVM() } = {}) {
    this.vm = vm; this.effects = [];
    for (const [k, fn] of Object.entries(EXTRA_UNITS)) vm.registerOperator(k, fn);
    // units that call back into the swarm: other formations as values
    const call = (name, args) => this.execute(name, args).then(r => r.value);
    vm.registerOperator('each', async ([a, ...cap], n) => { const out = []; for (const [i, x] of (a || []).entries()) out.push(await call(n.fn, [x, i, ...cap])); return out; });
    vm.registerOperator('filter', async ([a, ...cap], n) => { const out = []; for (const [i, x] of (a || []).entries()) if (await call(n.fn, [x, i, ...cap])) out.push(x); return out; });
    vm.registerOperator('find', async ([a, ...cap], n) => { for (const [i, x] of (a || []).entries()) if (await call(n.fn, [x, i, ...cap])) return x; });
    vm.registerOperator('some', async ([a, ...cap], n) => { for (const [i, x] of (a || []).entries()) if (await call(n.fn, [x, i, ...cap])) return true; return false; });
    vm.registerOperator('every', async ([a, ...cap], n) => { for (const [i, x] of (a || []).entries()) if (!(await call(n.fn, [x, i, ...cap]))) return false; return true; });
    vm.registerOperator('reduce', async ([a, init, ...cap], n) => { let acc = init; for (const [i, x] of (a || []).entries()) acc = await call(n.fn, [acc, x, i, ...cap]); return acc; });
    vm.registerOperator('callf', async ([...args], n) => call(n.fn, args));            // a formation used as a value
    vm.registerOperator('closure', (cap, n) => ({ $formation: n.fn, captured: cap, arity: n.arity ?? 0 })); // a formation handed out (e.g. onClick)
    vm.registerOperator('invoke', async ([f, ...args]) => { if (f?.$formation) { const a = args.slice(0, f.arity); while (a.length < f.arity) a.push(undefined); return call(f.$formation, [...a, ...f.captured]); } return typeof f === 'function' ? f(...args) : undefined; });
    // lazy choice: only the chosen side's sub-formation runs
    vm.registerOperator('branch', async ([c, ...cap], n) => call(c ? n.then : n.else, cap));
    vm.registerOperator('effect', (args, n) => { const e = { kind: n.kind, target: n.target ?? null, args: copy(args) }; this.effects.push(e); return undefined; });
  }
  form({ name, inputs = [], steps = [], output, ontology = {} }) {
    if (this.#formations.has(name)) throw Error(`formation ${name} already exists`);
    const known = new Set(inputs);
    for (const s of steps) {
      if (s.use && !this.#formations.has(s.use)) throw Error(`${name}: uses ${s.use}, which has not formed`);
      if (!s.use && !this.vm.operators.has(String(s.op).toLowerCase())) throw Error(`${name}: no unit kind ${s.op}`);
      for (const a of s.args) if (typeof a === 'string' && !known.has(a)) throw Error(`${name}: unknown reference ${a}`);
      known.add(s.id);
    }
    if (!known.has(output)) throw Error(`${name}: output ${output} missing`);
    const f = Object.freeze(copy({ name, inputs, steps, output, ontology }));
    this.#formations.set(name, f); this.#journal.push({ event: 'form', name, units: steps.length }); return f;
  }
  has(name) { return this.#formations.has(name); }
  get(name) { const f = this.#formations.get(name); return f ? copy(f) : null; }
  lower(name) {
    const form = this.#formations.get(name); let serial = 0; const nodes = [];
    const inline = (f, bind) => { const env = new Map(f.inputs.map((k, i) => [k, bind[i]]));
      for (const s of f.steps) { const refs = s.args.map(a => typeof a === 'string' ? env.get(a) : copy(a));
        if (s.use) env.set(s.id, inline(this.#formations.get(s.use), refs));
        else { const id = `r${serial++}`; const node = { ...copy(s), id, op: s.op, inputs: refs }; delete node.args; nodes.push(node); env.set(s.id, id); } }
      return env.get(f.output); };
    const out = inline(form, form.inputs);
    return { nodes, out };
  }
  async execute(name, args = []) {
    const f = this.#formations.get(name); if (!f) throw Error(`unknown formation ${name}`);
    const inputs = Array.isArray(args) ? Object.fromEntries(f.inputs.map((k, i) => [k, args[i]])) : args;
    const { nodes, out } = this.lower(name);
    let ref = out; if (!nodes.some(n => n.id === out)) { nodes.push({ id: `r${nodes.length}`, op: 'identity', inputs: [out] }); ref = nodes.at(-1).id; }
    const r = await this.vm.run({ nodes, outputs: [ref] }, { inputs });
    this.#journal.push({ event: 'execute', name, units: r.trace.length });
    return { value: r.returnValue[ref], trace: r.trace };
  }
  journal() { return copy(this.#journal); }
}
export default SwarmKernel;
