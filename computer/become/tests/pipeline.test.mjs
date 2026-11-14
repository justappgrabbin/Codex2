import test from 'node:test';
import assert from 'node:assert/strict';
import { BecomePipeline, STAGES, DIMENSION_KEY } from '../pipeline.mjs';

const files = [
  { path: 'state.js', text: 'let n=0;\nexport function count(){return n;}\nexport function bump(){n+=1;}' },
  { path: 'main.js', text: "import { count, bump } from './state.js';\nbump(); bump(); console.log('count', count());" },
  { path: 'broken.js', text: "import { gone } from './missing.js';\nconsole.log(gone);" },
  { path: 'ui.js', text: "document.getElementById('x').textContent = 'hi';" },
  { path: 'calc.py', text: 'def area(r):\n    return 3.14159*r*r\nprint(area(2))\n' },
  { path: 'notes.md', text: '# Notes\nhello' },
];

test('owner dimension key is fixed', () => {
  assert.deepEqual(DIMENSION_KEY, { Who: 'Space', What: 'Evolution', Where: 'Being', When: 'Movement', Why: 'Design' });
});

test('every stage runs in order and each file gets an outcome, five fields and both addresses', async () => {
  const seen = [];
  const r = await new BecomePipeline({ onStage: e => seen.push(e.stage) }).run(files);
  const by = Object.fromEntries(r.files.map(f => [f.file, f]));
  assert.equal(by['main.js'].outcome, 'native');
  assert.deepEqual(by['main.js'].stages.execute.stdout, ['count 2']);
  assert.ok(by['broken.js'].stages.execute.requirements.includes('file:./missing.js'));
  assert.ok(by['broken.js'].stages['morph-backend'], 'backend morph attempted after native failure');
  assert.ok(by['broken.js'].stages.become, 'become attempted after backend failure');
  assert.equal(by['ui.js'].outcome, 'live-frame');
  assert.equal(by['calc.py'].outcome, 'morphed-backend');
  assert.deepEqual(by['calc.py'].stages.execute.stdout, ['12.56636']); assert.match(by['calc.py'].stages.execute.path, /synthesis/);
  assert.equal(by['notes.md'].outcome, 'held-as-data');
  for (const f of r.files) {
    assert.ok(f.stages.ingest && f.stages.five?.fields && f.stages.address?.canonical?.gate, f.file);
    assert.match(f.stages.address.ontological, /^onto:/);
  }
  for (const s of STAGES.filter(s => s !== 'morph-backend' && s !== 'become')) assert.ok(seen.includes(s), s);
});
