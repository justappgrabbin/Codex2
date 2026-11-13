import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runLayer,
  fromLanguageModelLane,
  probeLanguageModel,
  meshRelate,
} from '../modules/klein-relationship-layer/relationship-layer.mjs';

test('DISEMINER answers a paper question', async () => {
  const out = await runLayer('diseminer', {
    sentences: ['The girl lives in a city', 'The girl ate potatoes'],
    question: 'The girl lives in a city',
  });
  assert.equal(out.possible, true);
  assert.deepEqual(out.missing, []);
});

test('AutoLing answers on the report language', async () => {
  const out = await runLayer('autoling', {
    sentences: ['X Y', 'X X Y Y', 'X X X Y Y Y'],
  });
  assert.ok(out.rules && out.rules.length > 0, out);
  assert.ok(out.reports.length === 3);
});

test('CompGram codes a plain sentence', async () => {
  const out = await runLayer('compgram', { text: 'The girl sleeps.' });
  const the = out.rows.find((r) => r.word === 'The');
  assert.ok(the.codes.includes('ART'), the);
});

test('Resolver answers a tagged sentence', async () => {
  const out = await runLayer('resolver', {
    tagged: 'The/ART girl/N lives/V in/P a/ART city/N.',
  });
  assert.ok(out.links.length > 0);
  assert.ok(out.links.some((l) => l[0] === 'the' && l[1] === 'girl'));
});

test('Resolver output feeds DISEMINER', async () => {
  const out = await runLayer('resolver-to-diseminer', {
    tagged: 'The/ART girl/N lives/V in/P a/ART city/N. The/ART girl/N ate/V potatoes/N.',
    question: 'The girl lives in a city',
  });
  assert.equal(out.from, 'Resolver');
  assert.equal(out.into, 'DISEMINER');
  assert.equal(out.possible, true, JSON.stringify(out));
});

test('AutoLing output feeds CompGram', async () => {
  const out = await runLayer('autoling-to-compgram', {
    sentences: ['the bird eats fish', 'the bird eats rice', 'the bird eats seed'],
  });
  assert.equal(out.from, 'AUTOLING');
  assert.equal(out.into, 'CompGram');
  assert.ok(out.compgram.rows.some((r) => r.word === 'bird'));
});

test('end-to-end call from the language-model lane does not use addresses', async () => {
  const out = await fromLanguageModelLane('The girl lives in a city');
  assert.equal(out.used_address, false);
  assert.equal(out.used_state_space, false);
  assert.equal(out.ok, true, JSON.stringify(out));
  assert.equal(out.diseminer.possible, true, JSON.stringify(out));
  assert.equal(out.path, 'diseminer-own-lex');
  assert.equal(out.resolver.skipped, true);
  assert.equal(out.model.used, false);
  // Headers are needed exactly when pyswisseph is missing on this machine.
  assert.equal(out.model.probe.needs_python_dev_headers, (out.model.probe.missing || []).includes('swisseph'));
});

test('Klein Mesh relationship bus answers without replacing DISEMINER', async () => {
  const out = await meshRelate('The girl lives in a city.');
  assert.equal(out.tool, 'KleinMesh');
  assert.ok(out.modules.includes('DISEMINER'));
  assert.ok(out.modules.includes('AUTOLING'));
  assert.ok(out.type);
});

test('probe says python dev headers are for pyswisseph, not the paper tools', async () => {
  const probe = await probeLanguageModel();
  // The rule, not one machine's state: headers are only for pyswisseph,
  // and weights_present reports whether model.pt is actually on disk.
  assert.equal(probe.needs_python_dev_headers, probe.missing.includes('swisseph'));
  assert.equal(typeof probe.weights_present, 'boolean');
});
