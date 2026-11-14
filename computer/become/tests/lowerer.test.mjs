import test from 'node:test';
import assert from 'node:assert/strict';
import { lowerSource, SwarmExecutor } from '../lowerer.mjs';

const src = `
export function inc(x) { return x + 1; }
export const double = x => x * 2;
export function area(r) { return Math.PI ? 3.14159 * r * r : 0; }
export function clamp(v, lo, hi) { if (v < lo) return lo; if (v > hi) return hi; return v; }
export const both = (a, b) => double(inc(a)) + inc(b);
export function label(n) { const big = n > 10; return big ? \`big \${n}\` : 'small'; }
export function fact(n) { return n <= 1 ? 1 : n * fact(n - 1); }
export function paint() { document.body.style.background = 'red'; }
export async function later() { return 1; }
`;

test('functions become formations; each operation is one swarm unit', () => {
  const r = lowerSource(src, 'math.ts');
  const names = r.formations.map(f => f.name);
  for (const n of ['inc', 'double', 'area', 'clamp', 'both']) assert.ok(names.includes(n), n);
  assert.ok(names.indexOf('inc') < names.indexOf('both') && names.indexOf('double') < names.indexOf('both'), 'dependencies form first');
  const why = Object.fromEntries(r.skipped.map(s => [s.name, s.reason]));
  assert.match(why.fact, /recursion/); assert.match(why.label, /joins text/); assert.match(why.paint, /side effects|outside value/); assert.match(why.later, /async/);
  assert.equal(r.formations.find(f => f.name === 'both').steps.filter(s => s.use).length, 3, 'calls compose other formations');
});

test('the swarm runs them — not the original code', async () => {
  const sw = new SwarmExecutor(); sw.formFile(src, 'math.ts');
  assert.equal(await sw.run('math.ts#inc', [41]), 42);
  assert.equal(await sw.run('math.ts#double', [21]), 42);
  assert.deepEqual(await Promise.all([[-5, 0, 10], [50, 0, 10], [7, 0, 10]].map(a => sw.run('math.ts#clamp', a))), [0, 10, 7]);
  assert.equal(await sw.run('math.ts#both', [3, 4]), 13); // double(inc(3)) + inc(4)
  assert.ok(Math.abs(await sw.run('math.ts#area', [2]) - 12.56636) < 1e-9);
});
