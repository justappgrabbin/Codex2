import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepare, compare, numberCases, MODES } from '../equivalence.mjs';
import { RecursivePrimitiveKernel } from '../vendor/swarm-os/source/recursive-primitive-kernel.mjs';

const FILE = 'pure-synthia-metrics.js';
const source = readFileSync(new URL('./fixtures/pure-synthia-metrics.js', import.meta.url), 'utf8');

test('the real file is translated: 7 functions become formations on the ORIGINAL SWARM-OS kernel, 3 stay latent with requirements', async () => {
  const p = await prepare(source, FILE);
  assert.ok(p.swarm.kernel instanceof RecursivePrimitiveKernel, 'primary engine is the owner\'s unmodified kernel');
  const swarm = p.genotype.filter(g => g.mode === MODES.SWARM).map(g => g.tool.split('#')[1]).sort();
  assert.deepEqual(swarm, ['ablationImpact', 'compressionGain3', 'derivationIntegrity', 'generationAccuracy', 'novelCompositionRate', 'ratio', 'specialCaseBurden']);
  const latent = Object.fromEntries(p.genotype.filter(g => g.mode === MODES.LATENT).map(g => [g.tool.split('#')[1], g.requires]));
  assert.deepEqual(Object.keys(latent).sort(), ['compressionGain', 'operatorReuse', 'reconstructionAccuracyExact']);
  for (const r of Object.values(latent)) assert.match(r, /^(operator|kernel|binding|dependency|translator):/);
});

test('Observe(Swarm(L(P))) ≡ Observe(JS(P)) for every swarm-native function, including divide-by-zero guards', async () => {
  const p = await prepare(source, FILE);
  const two = numberCases(2), three = numberCases(3);
  const cases = { ratio: two, ablationImpact: two, generationAccuracy: two, novelCompositionRate: two, specialCaseBurden: two, derivationIntegrity: two,
    compressionGain3: [...three, [1, 2, 0], [0, 0, 0], [3, 4, 10]] };
  const r = await compare(p, cases);
  const bad = r.rows.filter(x => !x.equal);
  assert.equal(bad.length, 0, JSON.stringify(bad.slice(0, 3)));
  assert.ok(r.compared > 400, `compared ${r.compared}`);
});

test('the swarm side really is the kernel: each call is a trace of primitive units, no JS function involved', async () => {
  const p = await prepare(source, FILE);
  const out = await p.swarm.runTraced(`${FILE}#compressionGain3`, [2, 3, 10]);
  assert.equal(out.value, 0.5);
  const ops = out.trace.map(t => t.op);
  assert.ok(ops.includes('add') && ops.includes('div') && ops.includes('sub') && ops.includes('select') && ops.includes('eq'), ops.join(','));
  assert.match(out.address.structuralHash, /^[0-9a-f]{8}$/);
});

test('latent functions do not execute anywhere', async () => {
  const p = await prepare(source, FILE);
  await assert.rejects(() => p.swarm.run(`${FILE}#operatorReuse`, [[1, 2]]), /not a swarm formation/);
});
