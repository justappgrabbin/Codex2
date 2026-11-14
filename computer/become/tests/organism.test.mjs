import test from 'node:test';
import assert from 'node:assert/strict';
import { BecomePipeline } from '../pipeline.mjs';
import { Genotype, Phenotype } from '../organism.mjs';

const files = [
  { path: 'math.js', text: 'export function double(x){return x*2;}\nexport function inc(x){return x+1;}' },
  { path: 'state.js', text: "import { inc } from './math.js';\nlet n=0;\nexport function bump(){n=inc(n);return n;}\nexport function count(){return n;}" },
  { path: 'app.js', text: "import { bump, count } from './state.js';\nimport { double } from './math.js';\nbump(); bump();\nexport const shown = double(count());\nconsole.log('shown', shown);" },
  { path: 'broken.js', text: "import { gone } from './missing.js';\nexport function useGone(){return gone;}" },
];

test('genotype: understood symbols become callable tools; broken ones stay latent with needs', async () => {
  const result = await new BecomePipeline().run(files, { become: false });
  const g = new Genotype({ files }).fromPipeline(result);
  const ids = g.list().map(t => t.id);
  for (const id of ['math.js#double', 'math.js#inc', 'state.js#bump', 'broken.js#useGone']) assert.ok(ids.includes(id), id);
  assert.equal(await g.call('math.js#double', 21), 42);
  const latent = g.tools.get('broken.js#useGone');
  assert.equal(latent.state, 'latent'); assert.ok(latent.needs.includes('file:./missing.js'));
  await assert.rejects(() => g.call('broken.js#useGone'), /latent/);
  // with becoming on, the broken file is rebuilt from its purpose and expressed from the rebuild
  const g2 = new Genotype({ files }).fromPipeline(await new BecomePipeline().run(files));
  const t = g2.tools.get('broken.js#useGone');
  assert.equal(t.source, 'rebuilt'); assert.equal(t.state, 'expressible'); assert.ok(t.needs.includes('file:./missing.js'), 'original need still recorded');
});

test('relational mesh: a pair used together 3 times becomes a new composite tool', async () => {
  const result = await new BecomePipeline().run(files);
  const g = new Genotype({ files }).fromPipeline(result);
  for (let i = 0; i < 3; i++) { await g.call('math.js#inc', 1); await g.call('math.js#double', 1); g.endComposition(); }
  const ch = g.tools.get('channel:math.js#inc~math.js#double');
  assert.ok(ch, 'channel promoted into the genotype'); assert.equal(ch.source, 'emergent-channel');
  assert.equal(await g.call('channel:math.js#inc~math.js#double', 4), 10); // double(inc(4))
});

test('phenotype: builds the app dependencies-first, expressing only what executes', async () => {
  const result = await new BecomePipeline().run(files);
  const g = new Genotype({ files }).fromPipeline(result), events = [];
  const p = new Phenotype(g, { onExpress: e => events.push(e.phase + ':' + e.file) });
  assert.deepEqual(p.order('app.js'), ['math.js', 'state.js', 'app.js']);
  const built = await p.build('app.js');
  assert.equal(built.built, true); assert.deepEqual(events, ['expressed:math.js', 'expressed:state.js', 'expressed:app.js']);
  assert.equal((await g.load('app.js')).shown, 4);
  const gl = new Genotype({ files }).fromPipeline(await new BecomePipeline().run(files, { become: false }));
  const bad = await new Phenotype(gl).build('broken.js');
  assert.equal(bad.built, false); assert.ok(bad.latent[0].needs.includes('file:./missing.js'));
});
