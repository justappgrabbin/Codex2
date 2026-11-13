import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalCoder } from '../services/local-coder.mjs';
import { LearningWorkspace } from '../services/learning-workspace.mjs';
import { StateStore, MemoryPersistence } from '../core/kernel.mjs';

async function setup(persistence = new MemoryPersistence()) {
  const state = new StateStore({ persistence }); await state.restore();
  return { service: new LearningWorkspace({ state, vfs: { list: () => [] } }), persistence };
}
const candidate = {
  goal: 'calculate quotation with sales tax', entry: '/quote.js', exportName: 'quote',
  files: { '/quote.js': `import {tax} from './tax.js'; export function quote(x){return tax(x.price*x.quantity)}`,
    '/tax.js': 'export function tax(n){return n*1.1}' },
  tests: [{ input: { price: 10, quantity: 2 }, expected: 22 }],
};
test('retains teaching, retrieves cited source and restores verified multi-module components', async () => {
  const { service, persistence } = await setup();
  const source = await service.ingest({ path: '/books/pricing.md', content: 'A quotation includes quantity, price and sales tax.' });
  await service.learn({ text: 'Our quotation must include sales tax.' });
  const hits = service.search('quotation sales tax');
  assert.equal(hits[0].path, '/books/pricing.md');
  assert.equal(hits[0].startLine, 1);
  assert.equal(hits[0].digest, source.digest);
  const built = await service.build({ ...candidate, sourceIds: [source.id] });
  assert.equal(built.ok, true, built.error);
  const restored = (await setup(persistence)).service;
  assert.equal((await restored.run({ id: built.id, input: { price: 5, quantity: 4 } })).output, 22);
  assert.equal(restored.snapshot().interactions.length, 1);
  const failed = await restored.build({ ...candidate, tests: [{ input: { price: 5, quantity: 4 }, expected: 2 }] });
  assert.equal(failed.ok, false);
  assert.equal(restored.snapshot().components.length, 1);
  assert.equal(restored.snapshot().attempts.length, 2);
});
test('rejects missing dependencies, host access and runaway code without promotion', async () => {
  const { service } = await setup();
  for (const code of ['export function quote(){while(true){}}', 'export function quote(){return process.env}', "import x from 'node:fs'; export function quote(){return x}", 'export function quote(){return fetch("https://example.com")}']) {
    const receipt = await service.build({ ...candidate, files: { '/quote.js': code } });
    assert.equal(receipt.ok, false);
    assert.ok(receipt.error);
  }
  assert.equal(service.snapshot().components.length, 0);
});
test('GitHub retrieval pins content to a commit and caches it for offline search', async () => {
  const { service, persistence } = await setup();
  const sha = 'a'.repeat(40); const calls = [];
  service.fetcher = async url => {
    calls.push(url);
    return new Response(JSON.stringify(url.includes('/commits/') ? { sha } : { type: 'file', encoding: 'base64', size: 36, content: Buffer.from('export function quotation(){return 42}').toString('base64') }));
  };
  await service.importGitHub({ repository: 'owner/project', ref: 'main', paths: ['src/quote.js'] });
  assert.ok(calls[1].endsWith(`?ref=${sha}`));
  const restored = (await setup(persistence)).service;
  restored.fetcher = () => { throw new Error('offline'); };
  const hit = restored.search('quotation')[0];
  assert.equal(hit.provenance.commit, sha);
  assert.match(hit.provenance.url, /\/blob\/aaaa/);
  await assert.rejects(restored.importGitHub({ repository: 'owner/project', paths: ['../secret'] }), /Unsafe/);
});

test('coding adapter receives cited context, repairs failed code, and cannot change acceptance checks', async () => {
  const { service } = await setup();
  const source = await service.ingest({ path: '/manual.md', content: 'quotation sales tax is ten percent' });
  let calls = 0;
  service.coder = async request => {
    calls++;
    assert.equal(request.evidence[0].sourceId, source.id);
    assert.equal(request.tests[0].expected, 22);
    if (calls === 2) assert.equal(request.previousFailure.ok, false);
    return { files: { '/quote.js': `export function quote(x){return ${calls === 1 ? '0' : 'x.price*x.quantity*1.1'}}` }, entry: '/quote.js', exportName: 'quote' };
  };
  const { files, ...spec } = candidate;
  const result = await service.build(spec);
  assert.equal(result.ok, true);
  assert.equal(calls, 2);
  assert.equal(service.snapshot().attempts.length, 2);
  assert.deepEqual(service.snapshot().components[0].sourceIds, [source.id]);
});

test('source revision reversion and names with spaces remain retrievable', async () => {
  const { service } = await setup();
  await service.ingest({ path: '/books/Pricing notes.md', content: 'original quotation' });
  await service.ingest({ path: '/books/Pricing notes.md', content: 'changed tax' });
  assert.equal(service.search('original').length, 0);
  await service.ingest({ path: '/books/Pricing notes.md', content: 'original quotation' });
  assert.equal(service.search('original')[0].text, 'original quotation');
});
test('a coding provider cannot mutate the acceptance tests to promote failing code', async () => {
  const { service } = await setup();
  service.coder = async request => {
    request.tests[0].expected = 0;
    return { files: { '/quote.js': 'export function quote(){return 0}' }, entry: '/quote.js', exportName: 'quote' };
  };
  const { files, ...spec } = candidate;
  const receipt = await service.build({ ...spec, repairBudget: 0 });
  assert.equal(receipt.ok, false);
  assert.equal(receipt.checks[0].expected, 22);
  assert.equal(service.snapshot().components.length, 0);
});


test('local coding adapter uses the configured local model and rejects cloud destinations', async () => {
  assert.throws(() => createLocalCoder({ url: 'https://example.com/v1/chat/completions', model: 'coder' }), /local HTTP/);
  const coder = createLocalCoder({ url: 'http://127.0.0.1:1234/v1/chat/completions', model: 'coder', fetcher: async (url, options) => {
    assert.equal(url.hostname, '127.0.0.1');
    const payload = JSON.parse(options.body);
    assert.equal(payload.model, 'coder');
    assert.match(payload.messages[0].content, /untrusted evidence/);
    assert.deepEqual(JSON.parse(payload.messages[1].content).tests, candidate.tests);
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ files: candidate.files, entry: candidate.entry, exportName: candidate.exportName }) } }] }));
  } });
  assert.deepEqual((await coder({ goal: candidate.goal, evidence: [], tests: candidate.tests })).files, candidate.files);
});
