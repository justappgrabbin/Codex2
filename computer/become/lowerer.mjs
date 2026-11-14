// Lowerer: turns source code into SWARM-OS formations, so the swarm itself runs it.
// The owner's v0.5.1 patch shipped the primitive VM with zero lowerers; this is one.
//   function            -> formation (its parameters are the formation's inputs)
//   operation           -> one step (one swarm unit): add, lt, select, sqrt, ...
//   call to a function  -> a `use` step: the formation composes another formation
// Executed by the owner's RecursivePrimitiveKernel over PrimitiveExecutionVM.
// What cannot be expressed in the VM's operators is listed with the exact reason;
// those functions keep their original code path (nothing is faked).
import { parse } from '../donors/Back-up-/vendor/pure-synthia-v0.4.0/src/synthia/morph-engine/vendor/acorn.mjs';
import { RecursivePrimitiveKernel } from './vendor/swarm-os/source/recursive-primitive-kernel.mjs';
import { toJavaScript } from './module-runtime.mjs';

const BIN = { '+': 'add', '-': 'sub', '*': 'mul', '/': 'div', '%': 'mod', '**': 'pow', '===': 'eq', '==': 'eq', '!==': 'neq', '!=': 'neq', '<': 'lt', '<=': 'lte', '>': 'gt', '>=': 'gte' };
const MATH = { abs: 'abs', sqrt: 'sqrt', exp: 'exp', log: 'log', sin: 'sin', cos: 'cos', tanh: 'tanh', min: 'min', max: 'max', pow: 'pow' };
// Which dimension each operator acts in (provisional): transforms = Evolution, decisions/form = Design,
// composition with other formations = Space, held values = Being, sequencing in time = Movement.
const OP_DIMENSION = { add: 'Evolution', sub: 'Evolution', mul: 'Evolution', div: 'Evolution', mod: 'Evolution', pow: 'Evolution', abs: 'Evolution', sqrt: 'Evolution', exp: 'Evolution', log: 'Evolution', sin: 'Evolution', cos: 'Evolution', tanh: 'Evolution', min: 'Evolution', max: 'Evolution',
  eq: 'Design', neq: 'Design', lt: 'Design', lte: 'Design', gt: 'Design', gte: 'Design', and: 'Design', or: 'Design', not: 'Design', select: 'Design', identity: 'Being', const: 'Being', concat: 'Space', use: 'Space' };

class Unlowerable extends Error {}

function parseModule(source, name) {
  const js = toJavaScript(source, name);
  try { return parse(js, { ecmaVersion: 'latest', sourceType: 'module' }); }
  catch { return parse(js, { ecmaVersion: 'latest', sourceType: 'script' }); }
}

/** Collect top-level functions (declarations and const arrow/function expressions). */
function topFunctions(ast) {
  const out = [];
  const take = (id, fn) => { if (id && fn && /^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(fn.type)) out.push({ name: id.name, fn }); };
  for (let node of ast.body) {
    if (/^Export(Named|Default)Declaration$/.test(node.type) && node.declaration) node = node.declaration;
    if (node.type === 'FunctionDeclaration') take(node.id, node);
    if (node.type === 'VariableDeclaration') for (const d of node.declarations) take(d.id, d.init);
  }
  return out;
}

function lowerFunction({ name, fn }, known) {
  if (fn.async || fn.generator) throw new Unlowerable('async/generator functions move in time; the VM computes values');
  const inputs = fn.params.map(p => { if (p.type !== 'Identifier') throw new Unlowerable('destructured or default parameters'); return p.name; });
  const steps = [], scope = new Map(inputs.map(i => [i, i])), uses = new Set(); let n = 0;
  const id = () => `u${n++}`;
  const step = (op, args, extra = {}) => { const s = { id: id(), op, args, ...extra }; steps.push(s); return s.id; };
  const lit = v => ({ value: v });
  const expr = e => {
    switch (e.type) {
      case 'Literal': if (e.regex || typeof e.value === 'bigint') throw new Unlowerable('regex/bigint literal'); return lit(e.value);
      case 'Identifier':
        if (scope.has(e.name)) return scope.get(e.name);
        if (e.name === 'undefined') return lit(undefined); if (e.name === 'Infinity') return lit(Infinity); if (e.name === 'NaN') return lit(NaN);
        throw new Unlowerable(`reads outside value "${e.name}"`);
      case 'TemplateLiteral': if (!e.expressions.length) return lit(e.quasis[0].value.cooked);
        throw new Unlowerable('joins text (the VM add operator is numeric)');
      case 'BinaryExpression': { const op = BIN[e.operator]; if (!op) throw new Unlowerable(`operator ${e.operator}`); return step(op, [expr(e.left), expr(e.right)]); }
      case 'LogicalExpression': { const a = expr(e.left), b = expr(e.right);
        if (e.operator === '&&') return step('select', [a, b, a]); if (e.operator === '||') return step('select', [a, a, b]);
        throw new Unlowerable(`operator ${e.operator}`); }
      case 'UnaryExpression':
        if (e.operator === '!') return step('not', [expr(e.argument)]);
        if (e.operator === '-') return step('sub', [lit(0), expr(e.argument)]);
        if (e.operator === '+') return step('identity', [expr(e.argument)]);
        throw new Unlowerable(`unary ${e.operator}`);
      case 'ConditionalExpression': return step('select', [expr(e.test), expr(e.consequent), expr(e.alternate)]);
      case 'MemberExpression':
        if (e.object.name === 'Math' && !e.computed && typeof Math[e.property.name] === 'number') return lit(Math[e.property.name]);
        throw new Unlowerable('reads a property of an object (state the VM does not hold)');
      case 'ArrayExpression': return step('concat', e.elements.map(x => { if (!x || x.type === 'SpreadElement') throw new Unlowerable('holes/spread in array'); return expr(x); }));
      case 'CallExpression': {
        const c = e.callee;
        if (c.type === 'MemberExpression' && c.object.name === 'Math' && !c.computed && MATH[c.property.name]) return step(MATH[c.property.name], e.arguments.map(expr));
        if (c.type === 'Identifier' && known.has(c.name) && c.name !== name) {
          const target = known.get(c.name); if (e.arguments.length !== target.length) throw new Unlowerable(`call to ${c.name} with ${e.arguments.length} of ${target.length} arguments`);
          uses.add(c.name); const s = { id: id(), use: c.name, args: e.arguments.map(expr) }; steps.push(s); return s.id; }
        if (c.type === 'Identifier' && c.name === name) throw new Unlowerable('recursion (a formation cannot contain itself)');
        throw new Unlowerable(`calls ${c.type === 'Identifier' ? c.name : 'a method'} that is not a swarm formation`);
      }
      default: throw new Unlowerable(`${e.type}`);
    }
  };
  // statements: const bindings, early returns (become select), one final return
  const block = stmts => {
    for (let i = 0; i < stmts.length; i++) {
      const s = stmts[i];
      if (s.type === 'VariableDeclaration') { if (s.kind !== 'const') throw new Unlowerable(`${s.kind} (values that change in time)`);
        for (const d of s.declarations) { if (d.id.type !== 'Identifier' || !d.init) throw new Unlowerable('destructuring'); scope.set(d.id.name, expr(d.init)); } continue; }
      if (s.type === 'ReturnStatement') return s.argument ? expr(s.argument) : lit(undefined);
      if (s.type === 'IfStatement') {
        const yes = s.consequent.type === 'BlockStatement' ? s.consequent.body : [s.consequent];
        const no = s.alternate ? (s.alternate.type === 'BlockStatement' ? s.alternate.body : [s.alternate]) : stmts.slice(i + 1);
        const saved = new Map(scope); const a = block(yes); scope.clear(); for (const [k, v] of saved) scope.set(k, v);
        const b = block(no); return step('select', [expr(s.test), a, b]);
      }
      if (s.type === 'EmptyStatement') continue;
      throw new Unlowerable(`${s.type} (side effects or loops)`);
    }
    throw new Unlowerable('no return value');
  };
  let out = fn.body.type === 'BlockStatement' ? block(fn.body.body) : expr(fn.body);
  if (typeof out !== 'string') out = step('identity', [out]);           // literal or parameter result
  else if (inputs.includes(out)) out = step('identity', [out]);
  const dims = {}; for (const st of steps) { const d = OP_DIMENSION[st.op || 'use']; dims[d] = (dims[d] || 0) + 1; }
  return { name, inputs, steps, output: out, uses: [...uses], ontology: { source: 'lowered-javascript', units: steps.length, dimensions: dims } };
}

/** Lower one file. Returns formations in dependency order plus everything that stayed code, with reasons. */
export function lowerSource(source, file = 'input.js') {
  const fns = topFunctions(parseModule(source, file));
  const known = new Map(fns.map(f => [f.name, f.fn.params]));
  const lowered = new Map(), skipped = [];
  for (const f of fns) { try { lowered.set(f.name, lowerFunction(f, known)); } catch (e) { if (e instanceof Unlowerable) skipped.push({ name: f.name, reason: e.message }); else throw e; } }
  // a formation that uses a skipped one cannot form either
  let changed = true; while (changed) { changed = false;
    for (const [k, f] of lowered) { const bad = f.uses.find(u => !lowered.has(u)); if (bad) { lowered.delete(k); skipped.push({ name: k, reason: `uses ${bad}, which stayed code` }); changed = true; } } }
  const order = [], seen = new Set();
  const visit = k => { if (seen.has(k)) return; seen.add(k); for (const u of lowered.get(k).uses) visit(u); order.push(lowered.get(k)); };
  for (const k of lowered.keys()) visit(k);
  return { file, formations: order, skipped, total: fns.length };
}

/** The swarm as executor: forms every lowered function in the owner's kernel and runs them. */
export class SwarmExecutor {
  constructor() { this.kernel = new RecursivePrimitiveKernel(); this.names = new Map(); }
  formFile(source, file) {
    const r = lowerSource(source, file), prefix = file.replace(/[^\w]/g, '_') + '__';
    for (const f of r.formations) {
      const name = prefix + f.name;
      this.kernel.form({ name, inputs: f.inputs, output: f.output, ontology: { ...f.ontology, file, function: f.name },
        parents: f.uses.map(u => prefix + u), steps: f.steps.map(s => s.use ? { ...s, use: prefix + s.use } : s) });
      this.names.set(`${file}#${f.name}`, name);
    }
    return r;
  }
  has(toolId) { return this.names.has(toolId); }
  async run(toolId, args = []) {
    const name = this.names.get(toolId); if (!name) throw new Error(`${toolId} is not a swarm formation`);
    const f = this.kernel.get(name); const inputs = Object.fromEntries(f.inputs.map((k, i) => [k, args[i]]));
    const r = await this.kernel.execute(name, inputs);
    return r && typeof r === 'object' && 'value' in r ? r.value : r;
  }
  formations() { return [...this.names.entries()].map(([tool, name]) => ({ tool, name, ...this.kernel.get(name) })); }
}
export default lowerSource;
