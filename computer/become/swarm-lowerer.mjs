// STATUS: EXPERIMENTAL EXTENSION — not the primary engine. The primary swarm engine is the
// owner's original SWARM-OS RecursivePrimitiveKernel (see lowerer.mjs + equivalence.mjs).
// Results from here are labeled 'extended-swarm' and must be proven against reference
// execution before any operator is proposed for the original kernel.
// Swarm lowerer: the fuller translator. Real app code (objects, text, lists,
// callbacks, async, React-style components and their state) becomes formations
// on the SwarmKernel, so the swarm runs it. lowerer.mjs (strict, owner VM
// operators only) stays as it was.
import { parse } from '../donors/Back-up-/vendor/pure-synthia-v0.4.0/src/synthia/morph-engine/vendor/acorn.mjs';
import { transform } from './vendor/sucrase.mjs';
import { SwarmKernel } from './swarm-kernel.mjs';

const BIN = { '+': null, '-': 'sub', '*': 'mul', '/': 'div', '%': 'mod', '**': 'pow', '===': 'eq', '==': 'loose_eq', '!==': 'neq', '!=': 'neq', '<': 'lt', '<=': 'lte', '>': 'gt', '>=': 'gte', in: 'has' };
const MATH = new Set(['abs', 'sqrt', 'exp', 'log', 'sin', 'cos', 'tanh', 'min', 'max', 'pow', 'floor', 'ceil', 'round', 'trunc', 'sign']);
const METHOD = { toUpperCase: 'upper', toLowerCase: 'lower', trim: 'trim', split: 'split', replace: 'replace', includes: 'includes', startsWith: 'startswith', endsWith: 'endswith', join: 'join', toString: 'str', at: 'at' };
const CALLBACK = new Set(['map', 'filter', 'find', 'some', 'every', 'reduce', 'forEach']);
const GLOBAL = { 'JSON.stringify': 'json', 'JSON.parse': 'parsejson', Number: 'num', String: 'str', Boolean: 'bool', 'Array.isArray': 'isarray', 'Object.keys': 'keys', 'Object.values': 'values', 'Object.entries': 'entries', 'Object.assign': 'merge', parseFloat: 'num', cn: 'classes', clsx: 'classes', classNames: 'classes', 'Date.now': 'now', 'Array.from': 'from' };
const DIM = op => /^(add|sub|mul|div|mod|pow|abs|sqrt|exp|log|sin|cos|tanh|min|max|text|str|upper|lower|trim|split|replace|num|json|parsejson|each|reduce)$/.test(op) ? 'Evolution'
  : /^(eq|neq|lt|lte|gt|gte|and|or|not|select|branch|loose_eq|includes|startswith|endswith|filter|find|some|every|jsx)$/.test(op) ? 'Design'
  : /^(obj|get|set|merge|keys|values|entries|list|at|len|identity|usestate|nullish)$/.test(op) ? 'Being'
  : /^(await|effect|invoke)$/.test(op) ? 'Movement' : 'Space';

class Unlowerable extends Error {}
const nameOfCallee = c => c.type === 'Identifier' ? c.name : c.type === 'MemberExpression' && !c.computed && c.object.type === 'Identifier' ? `${c.object.name}.${c.property.name}` : null;

export function lowerSwarm(source, file = 'input.js', { externals = new Map() } = {}) {
  const ts = /\.(tsx?|mts|cts)$/i.test(file), jsx = /\.(tsx|jsx)$/i.test(file) || /<[A-Za-z][\w.]*[\s/>]/.test(source) && /return\s*\(?\s*</.test(source);
  const code = transform(source, { transforms: [...(ts ? ['typescript'] : []), ...(jsx ? ['jsx'] : [])], production: true, jsxRuntime: 'classic', jsxPragma: '__jsx', jsxFragmentPragma: '__Frag', disableESTransforms: true, filePath: file }).code;
  let ast; try { ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module' }); } catch { ast = parse(code, { ecmaVersion: 'latest', sourceType: 'script' }); }

  const formations = [], skipped = [], top = new Map();
  let defaultName = null;
  for (let node of ast.body) {
    if (node.type === 'ExportDefaultDeclaration') defaultName = node.declaration?.id?.name || (node.declaration?.type === 'Identifier' ? node.declaration.name : null);
    if (/^Export(Named|Default)Declaration$/.test(node.type) && node.declaration) node = node.declaration;
    if (node.type === 'FunctionDeclaration' && node.id) top.set(node.id.name, node);
    if (node.type === 'VariableDeclaration') for (const d of node.declarations) if (d.id.type === 'Identifier' && d.init) {
      if (/Function|Arrow/.test(d.init.type)) top.set(d.id.name, d.init);
      else if (/^(ObjectExpression|ArrayExpression|Literal|TemplateLiteral|BinaryExpression|UnaryExpression)$/.test(d.init.type)) { top.set(d.id.name, { type: 'ArrowFunctionExpression', params: [], body: d.init, $value: true }); } }
  }
  const formed = new Set(); let anon = 0;

  // A formation: params + captured outer bindings are its inputs.
  function formation(name, fn, outer, { owner = name } = {}) {
    const steps = [], scope = new Map(outer), inputs = [...outer.keys()].map(k => `cap:${k}`);
    for (const k of outer.keys()) scope.set(k, `cap:${k}`);
    const params = [];
    let n = 0; const id = () => `u${n++}`;
    const step = (op, args, extra = {}) => { const s = { id: id(), op, args, ...extra }; steps.push(s); return s.id; };
    const lit = v => ({ value: v });
    const sub = (fnNode, label) => { const nm = `${owner}::${label}${anon++}`; formation(nm, fnNode, scope, { owner }); return nm; };
    const bindPattern = (p, ref) => {
      if (p.type === 'Identifier') { scope.set(p.name, ref); return; }
      if (p.type === 'AssignmentPattern') { bindPattern(p.left, step('nullish', [ref, expr(p.right)])); return; }
      if (p.type === 'ObjectPattern') { const taken = []; for (const prop of p.properties) { if (prop.type === 'RestElement') { bindPattern(prop.argument, step('omit', [ref], { keys: taken })); continue; }
        if (!prop.computed) taken.push(prop.key.type === 'Identifier' ? prop.key.name : String(prop.key.value));
        const key = prop.key.type === 'Identifier' && !prop.computed ? prop.key.name : prop.key.value; bindPattern(prop.value, step('get', [ref], { key })); } return; }
      if (p.type === 'ArrayPattern') { p.elements.forEach((el, i) => { if (!el) return; if (el.type === 'RestElement') throw new Unlowerable('rest in list pattern'); bindPattern(el, step('at', [ref, lit(i)])); }); return; }
      throw new Unlowerable(`pattern ${p.type}`);
    };
    const pad = (fnNode, arity) => ({ ...fnNode, params: [...fnNode.params, ...Array.from({ length: Math.max(0, arity - fnNode.params.length) }, (_, k) => ({ type: 'Identifier', name: `_pad${k}` }))].slice(0, Math.max(arity, fnNode.params.length)) });
    const callbackFormation = (arg, label, arity = 2) => {
      if (arg && /Function|Arrow/.test(arg.type)) return sub(pad(arg, arity), label);
      if (arg?.type === 'Identifier' && top.has(arg.name)) { need(arg.name); return arg.name; }
      throw new Unlowerable('callback that is not a function written here');
    };
    const need = nm => { if (!formed.has(nm) && nm !== name) build(nm); if (!formed.has(nm)) throw new Unlowerable(`uses ${nm}, which stayed code`); };
    const expr = e => {
      switch (e.type) {
        case 'Literal': return e.regex ? lit(new RegExp(e.regex.pattern, e.regex.flags)) : lit(e.value);
        case 'Identifier':
          if (scope.has(e.name)) return scope.get(e.name);
          if (e.name === 'undefined') return lit(undefined);
          if (top.has(e.name) && top.get(e.name).$value) { need(e.name); const s = { id: id(), use: e.name, args: [] }; steps.push(s); return s.id; }
          if (top.has(e.name)) { need(e.name); return step('closure', [], { fn: e.name, arity: top.get(e.name).params.length }); }
          if (externals.has(e.name)) { const x = externals.get(e.name); return step('closure', [], { fn: x.formation, arity: x.arity, external: true }); }
          throw new Unlowerable(`reads outside value "${e.name}"`);
        case 'TemplateLiteral': { const parts = []; e.quasis.forEach((q, i) => { parts.push(lit(q.value.cooked)); if (e.expressions[i]) parts.push(expr(e.expressions[i])); }); return step('text', parts); }
        case 'BinaryExpression': {
          if (e.operator === '+') { const a = expr(e.left), b = expr(e.right); return step('select', [step('or', [step('eq', [step('typeof', [a]), lit('string')]), step('eq', [step('typeof', [b]), lit('string')])]), step('text', [a, b]), step('add', [a, b])]); }
          const op = BIN[e.operator]; if (!op) throw new Unlowerable(`operator ${e.operator}`);
          return e.operator === 'in' ? step('has', [expr(e.right), expr(e.left)]) : step(op, [expr(e.left), expr(e.right)]); }
        case 'LogicalExpression': { const a = expr(e.left), b = expr(e.right);
          return e.operator === '&&' ? step('select', [a, b, a]) : e.operator === '||' ? step('select', [a, a, b]) : step('nullish', [a, b]); }
        case 'UnaryExpression': {
          if (e.operator === '!') return step('not', [expr(e.argument)]); if (e.operator === '-') return step('sub', [lit(0), expr(e.argument)]);
          if (e.operator === '+') return step('num', [expr(e.argument)]); if (e.operator === 'typeof') return step('typeof', [expr(e.argument)]);
          throw new Unlowerable(`unary ${e.operator}`); }
        case 'ConditionalExpression': {
          const t = sub({ params: [], body: e.consequent, type: 'ArrowFunctionExpression' }, 'then'), f = sub({ params: [], body: e.alternate, type: 'ArrowFunctionExpression' }, 'else');
          return step('branch', [expr(e.test), ...[...scope.values()]], { then: t, else: f }); }
        case 'ArrayExpression': {
          if (e.elements.some(x => x?.type === 'SpreadElement')) return step('concat', e.elements.map(x => x.type === 'SpreadElement' ? expr(x.argument) : step('list', [expr(x)])));
          return step('list', e.elements.map(x => x ? expr(x) : lit(undefined))); }
        case 'ObjectExpression': {
          const pieces = []; let keys = [], vals = [];
          const flush = () => { if (keys.length) { pieces.push(step('obj', vals, { keys })); keys = []; vals = []; } };
          for (const p of e.properties) {
            if (p.type === 'SpreadElement') { flush(); pieces.push(expr(p.argument)); continue; }
            if (p.computed) throw new Unlowerable('computed object key');
            keys.push(p.key.type === 'Identifier' ? p.key.name : String(p.key.value));
            vals.push(p.value && /Function|Arrow/.test(p.value.type) ? step('closure', [...scope.values()], { fn: sub(p.value, 'method'), arity: p.value.params.length }) : expr(p.value)); }
          flush(); return pieces.length === 1 ? pieces[0] : step('merge', pieces.length ? pieces : [lit({})]); }
        case 'ChainExpression': return expr(e.expression);
        case 'MemberExpression': {
          if (e.object.type === 'Identifier' && e.object.name === 'Math' && !e.computed && typeof Math[e.property.name] === 'number') return lit(Math[e.property.name]);
          const o = expr(e.object);
          if (!e.computed && e.property.name === 'length') return step('len', [o]);
          return e.computed ? step('get', [o, expr(e.property)]) : step('get', [o], { key: e.property.name }); }
        case 'AwaitExpression': return step('await', [expr(e.argument)]);
        case 'ArrowFunctionExpression': case 'FunctionExpression': return step('closure', [...scope.values()], { fn: sub(e, 'fn'), arity: e.params.length });
        case 'CallExpression': {
          const c = e.callee, cn = nameOfCallee(c);
          if (cn === '__jsx') { const [type, props, ...kids] = e.arguments;
            const tag = type.type === 'Literal' ? type.value : type.type === 'Identifier' ? (top.has(type.name) ? (need(type.name), `formation:${type.name}`) : externals.has(type.name) ? `external:${externals.get(type.name).formation}` : type.name === '__Frag' ? 'fragment' : scope.has(type.name) ? null : (() => { throw new Unlowerable(`component ${type.name} from outside`); })()) : undefined;
            if (tag === undefined) return step('jsx', [expr(type), props.type === 'Literal' ? lit(null) : expr(props), ...kids.map(expr)]);
            return tag === null ? step('jsx', [scope.get(type.name), props.type === 'Literal' ? lit(null) : expr(props), ...kids.map(expr)]) : step('jsx', [lit(tag), props.type === 'Literal' ? lit(null) : expr(props), ...kids.map(expr)], { tag }); }
          if (cn?.startsWith('Math.') && MATH.has(cn.slice(5))) return step(cn.slice(5), e.arguments.map(expr));
          if (GLOBAL[cn]) return step(GLOBAL[cn], e.arguments.map(expr));
          if (cn === 'console.log' || cn === 'console.info' || cn === 'console.warn' || cn === 'console.error') return step('effect', e.arguments.map(expr), { kind: 'log' });
          const hook = cn?.replace(/^React\./, '');
          if (hook === 'useState') return step('usestate', e.arguments.map(expr), { key: `${owner}#${steps.length}` });
          if (hook === 'useRef') return step('usestate', [step('obj', [e.arguments[0] ? expr(e.arguments[0]) : lit(undefined)], { keys: ['current'] })], { key: `${owner}#ref${steps.length}`, ref: true });
          if (hook === 'useCallback') return expr(e.arguments[0]);
          if (hook === 'useMemo') return step('invoke', [expr(e.arguments[0])]);
          if (hook === 'useEffect' || hook === 'useLayoutEffect') return step('effect', [expr(e.arguments[0])], { kind: 'mount' });
          if (hook === 'forwardRef' || hook === 'memo') return expr(e.arguments[0]);
          if (externals.has(cn)) { const x = externals.get(cn); const s = { id: id(), use: x.formation, args: e.arguments.map(expr) }; while (s.args.length < x.arity) s.args.push(lit(undefined)); s.args = s.args.slice(0, x.arity); s.external = true; steps.push(s); return s.id; }
          if (c.type === 'Identifier' && top.has(c.name)) { need(c.name); const s = { id: id(), use: c.name, args: padArgs(e.arguments.map(expr), c.name) }; steps.push(s); return s.id; }
          if (c.type === 'Identifier' && scope.has(c.name)) return step('invoke', [scope.get(c.name), ...e.arguments.map(expr)]);
          if (c.type === 'MemberExpression' && !c.computed) {
            const m = c.property.name;
            if (CALLBACK.has(m)) { const fnName = callbackFormation(e.arguments[0], m, m === 'reduce' ? 3 : 2), cap = [...scope.values()];
              if (m === 'reduce') return step('reduce', [expr(c.object), e.arguments[1] ? expr(e.arguments[1]) : lit(undefined), ...cap], { fn: fnName });
              return step(m === 'forEach' ? 'each' : m === 'map' ? 'each' : m, [expr(c.object), ...cap], { fn: fnName }); }
            if (METHOD[m]) return step(METHOD[m], [expr(c.object), ...e.arguments.map(expr)]);
            if (m === 'concat') return step('concat', [expr(c.object), ...e.arguments.map(expr)]);
          }
          throw new Unlowerable(`calls ${cn || 'a computed function'} from outside the swarm`); }
        case 'SequenceExpression': { let last; for (const x of e.expressions) last = expr(x); return last; }
        default: throw new Unlowerable(e.type);
      }
    };
    const padArgs = (args, callee) => { const f = formationsByName.get(callee); const want = f ? f.inputs.length : args.length; while (args.length < want) args.push(lit(undefined)); return args.slice(0, want); };
    // statements
    const block = stmts => {
      for (let i = 0; i < stmts.length; i++) {
        const s = stmts[i];
        switch (s.type) {
          case 'VariableDeclaration': for (const d of s.declarations) { if (!d.init) throw new Unlowerable('declared without a value'); bindPattern(d.id, expr(d.init)); } continue;
          case 'ReturnStatement': return s.argument ? expr(s.argument) : lit(undefined);
          case 'ExpressionStatement': {
            const x = s.expression;
            if (x.type === 'AssignmentExpression' && x.left.type === 'Identifier' && scope.has(x.left.name) && x.operator === '=') { scope.set(x.left.name, expr(x.right)); continue; }
            if (x.type === 'AssignmentExpression' && x.left.type === 'Identifier' && scope.has(x.left.name) && BIN[x.operator.slice(0, -1)] !== undefined) {
              scope.set(x.left.name, expr({ type: 'BinaryExpression', operator: x.operator.slice(0, -1), left: x.left, right: x.right })); continue; }
            if (x.type === 'UpdateExpression' && x.argument.type === 'Identifier' && scope.has(x.argument.name)) {
              scope.set(x.argument.name, step(x.operator === '++' ? 'add' : 'sub', [scope.get(x.argument.name), lit(1)])); continue; }
            if (x.type === 'CallExpression' || x.type === 'AwaitExpression') { expr(x); continue; }
            throw new Unlowerable(`statement ${x.type}`); }
          case 'IfStatement': {
            const yes = s.consequent.type === 'BlockStatement' ? s.consequent.body : [s.consequent];
            const no = s.alternate ? (s.alternate.type === 'BlockStatement' ? s.alternate.body : [s.alternate]) : stmts.slice(i + 1);
            const t = sub({ params: [], body: { type: 'BlockStatement', body: yes.concat(s.alternate ? [] : stmts.slice(i + 1)) }, type: 'ArrowFunctionExpression' }, 'then');
            const f = sub({ params: [], body: { type: 'BlockStatement', body: no.concat(s.alternate ? stmts.slice(i + 1) : []) }, type: 'ArrowFunctionExpression' }, 'else');
            return step('branch', [expr(s.test), ...[...scope.values()]], { then: t, else: f }); }
          case 'EmptyStatement': continue;
          case 'BlockStatement': { const r = block(s.body.concat(stmts.slice(i + 1))); return r; }
          default: throw new Unlowerable(`${s.type} (loops, try or classes are not swarm units yet)`);
        }
      }
      return lit(undefined);
    };
    fn.params.forEach((p, i) => { const nm = p.type === 'Identifier' ? p.name : `p${i}`; params.push(nm); scope.set(nm, nm); });
    inputs.unshift(...params); for (const p of params) if (!scope.has(p)) scope.set(p, p);
    // destructured params unpack after every param name exists
    fn.params.forEach((p, i) => { if (p.type !== 'Identifier') bindPattern(p, `p${i}`); });
    let out = fn.body.type === 'BlockStatement' ? block(fn.body.body) : expr(fn.body);
    if (typeof out !== 'string' || inputs.includes(out)) out = step('identity', [out]);
    const dims = {}; for (const st of steps) { const d = st.use ? 'Space' : DIM(st.op); dims[d] = (dims[d] || 0) + 1; }
    // sub-formations take captured values in scope order; rename their inputs to match the caller's order
    const f = { name, inputs, steps, output: out, ontology: { source: 'swarm-lowered', file, units: steps.length, dimensions: dims } };
    formations.push(f); formationsByName.set(name, f); return f;
  }
  const formationsByName = new Map();
  const building = new Set();
  function build(nm) {
    if (formed.has(nm) || building.has(nm)) { if (building.has(nm)) throw new Unlowerable('recursion (a formation cannot contain itself)'); return; }
    building.add(nm);
    const mark = formations.length;
    try { formation(nm, top.get(nm), new Map()); formed.add(nm); }
    catch (e) { formations.length = mark; for (const k of [...formationsByName.keys()]) if (!formations.some(f => f.name === k)) formationsByName.delete(k);
      if (!(e instanceof Unlowerable)) throw e; if (!skipped.some(s => s.name === nm)) skipped.push({ name: nm, reason: e.message }); }
    finally { building.delete(nm); }
  }
  for (const nm of top.keys()) build(nm);
  return { file, formations, skipped, total: top.size, top: [...formed], defaultName };
}

function resolveImport(from, spec, texts) {
  if (!/^\.{0,2}\/|^[@~]\//.test(spec)) return null;
  const dir = from.split('/').slice(0, -1), stack = [];
  if (/^[@~]\//.test(spec)) { const leaf = spec.slice(2); for (const p of texts.keys()) if (p.replace(/\.\w+$/, '').endsWith(leaf)) return p; return null; }
  for (const part of [...dir, ...spec.split('/')]) { if (part === '..') stack.pop(); else if (part && part !== '.') stack.push(part); }
  const b = stack.join('/'); for (const c of [b, b + '.ts', b + '.tsx', b + '.js', b + '.jsx', b + '.mjs', b + '/index.ts', b + '/index.tsx', b + '/index.js']) if (texts.has(c)) return c;
  return null;
}

/** Swarm executor: forms a file's formations on the SwarmKernel and runs them. Components render to form trees. */
export class SwarmRuntime {
  constructor() { this.kernel = new SwarmKernel(); this.files = new Map(); this.state = new Map(); this.renders = 0;
    const vm = this.kernel.vm;
    vm.registerOperator('usestate', ([init], n) => { if (!this.state.has(n.key)) this.state.set(n.key, init); return [this.state.get(n.key), { $setter: n.key }]; });
    const invoke = vm.operators.get('invoke');
    vm.registerOperator('invoke', async ([f, ...args]) => {
      if (f?.$setter) { const prev = this.state.get(f.$setter); const next = f.fn ? await invoke([f.fn, prev]) : (args[0]?.$formation ? await invoke([args[0], prev]) : args[0]); this.state.set(f.$setter, next); this.kernel.effects.push({ kind: 'state', target: f.$setter, args: [next] }); return undefined; }
      return invoke([f, ...args]);
    });
  }
  formFile(source, file, externals = new Map()) {
    const r = lowerSwarm(source, file, { externals }), p = file.replace(/[^\w]/g, '_') + '__';
    const rename = nm => p + nm;
    const fix = st => ({ ...st, ...(st.use && !st.external ? { use: rename(st.use) } : {}), ...(st.fn && !st.external ? { fn: rename(st.fn) } : {}), ...(st.then ? { then: rename(st.then), else: rename(st.else) } : {}),
      ...(st.tag && String(st.tag).startsWith('formation:') ? { tag: 'formation:' + rename(st.tag.slice(10)) } : {}),
      args: st.args.map(a => a && typeof a === 'object' && 'value' in a && typeof a.value === 'string' && a.value.startsWith('formation:') ? { value: 'formation:' + rename(a.value.slice(10)) } : a) });
    for (const f of r.formations) if (!this.kernel.has(rename(f.name))) this.kernel.form({ ...f, name: rename(f.name), steps: f.steps.map(fix) });
    this.files.set(file, { prefix: p, result: r });
    return r;
  }
  /** Form a whole project: files that are imported form first, and imported names link to their formations. */
  formProject(files) {
    const texts = new Map(files.map(f => [f.path || f.name, f.text ?? f.content ?? ''])), done = new Map(), visiting = new Set();
    const isCode = p => /\.(m?[jt]sx?|cjs)$/i.test(p);
    const visit = file => {
      if (done.has(file) || visiting.has(file) || !isCode(file)) return; visiting.add(file);
      const src = texts.get(file), externals = new Map();
      for (const m of src.matchAll(/import\s+(?:(\w+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s*['"]([^'"]+)['"]/g)) {
        const target = resolveImport(file, m[3], texts); if (!target) continue; visit(target);
        const info = this.files.get(target); if (!info) continue;
        const names = (m[2] || '').split(',').map(x => x.trim()).filter(Boolean).map(x => x.split(/\s+as\s+/));
        if (m[1]) names.push(['default', m[1]]);
        for (const [orig, local = orig] of names) { const fname = orig === 'default' ? info.result.defaultName : orig;
          if (fname && info.result.top.includes(fname)) { const f = this.kernel.get(info.prefix + fname); externals.set(local, { formation: info.prefix + fname, arity: f.inputs.filter(k => !k.startsWith('cap:')).length }); } }
      }
      try { done.set(file, this.formFile(src, file, externals)); } catch (e) { done.set(file, { file, error: String(e.message), formations: [], skipped: [], top: [], total: 0 }); }
      visiting.delete(file);
    };
    for (const f of texts.keys()) visit(f);
    return [...done.values()];
  }
  name(file, fn) { return this.files.get(file).prefix + fn; }
  async run(file, fn, args = []) { return (await this.kernel.execute(this.name(file, fn), args)).value; }
  /** Expand a form tree: nested formation components render through the swarm too. */
  async render(tree, depth = 0) {
    if (depth > 40) throw Error('form tree too deep');
    if (Array.isArray(tree)) return Promise.all(tree.map(t => this.render(t, depth)));
    if (!tree || typeof tree !== 'object' || !tree.$form) return tree;
    const m = String(tree.type).match(/^(formation|external):(.+)$/);
    if (tree.type?.$formation) { this.renders++; const out = await this.kernel.execute(tree.type.$formation, [{ ...tree.props, children: tree.children }, ...tree.type.captured]); return this.render(out.value, depth + 1); }
    if (m && this.kernel.has(m[2])) { this.renders++;
      const out = await this.kernel.execute(m[2], [{ ...tree.props, children: tree.children }]); return this.render(out.value, depth + 1); }
    return { ...tree, children: await Promise.all(tree.children.map(c => this.render(c, depth + 1))) };
  }
}
export default lowerSwarm;
