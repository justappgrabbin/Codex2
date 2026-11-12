import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { recordStage, validateStage } from './paper-workflow.mjs';

test('requires evidence for every stage', () => {
  assert.throws(() => validateStage('implement', { experiment: 'run' }), /result/);
  assert.throws(() => validateStage('select', { title: 'paper' }), /source/);
});
test('persists complete ordered workflow and registry', async () => {
  const root = await mkdtemp(join(tmpdir(), 'synthia-paper-'));
  await assert.rejects(recordStage(root, 'example', 'implement', { experiment: 'x', result: 'y' }), /Previous stage/);
  await recordStage(root, 'example', 'select', { title: 'Example', source: 'local/example.pdf' });
  await recordStage(root, 'example', 'deep-read', { summary: 'Summary', codeContrast: 'Comparison' });
  await recordStage(root, 'example', 'implement', { experiment: 'Test procedure', result: 'Observed outcome' });
  const record = await recordStage(root, 'example', 'persist', { conclusion: 'Findings' });
  assert.equal(record.history.length, 4);
  const registry = JSON.parse(await readFile(join(root, 'docs/paper_deep/MEMORY_PAPER_REGISTRY.json'), 'utf8'));
  assert.equal(registry[0].id, 'example');
});
test('rejects path traversal IDs', async () => {
  await assert.rejects(recordStage('/tmp', '../escape', 'select', { title: 'a', source: 'b' }), /Invalid paper ID/);
});
