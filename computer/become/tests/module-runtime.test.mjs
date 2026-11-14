import test from 'node:test';
import assert from 'node:assert/strict';
import { UniversalExecutionBridge } from '../../engines/unified-execution-spine/src/pure-synthia/integration/universal-execution-bridge.js';
import { createModuleRuntime } from '../module-runtime.mjs';

const bridge = () => new UniversalExecutionBridge({ runtimeAdapters: [createModuleRuntime()] });
const state = { name: 'state.js', content: 'let n=0;\nexport function count(){return n;}\nexport function bump(){n+=1;}' };

test('ES module with sibling import runs through the bridge (was: Unexpected token export)', async () => {
  const main = { name: 'main.js', content: "import { count, bump } from './state.js';\nbump(); bump(); console.log('count', count());" };
  const r = await bridge().execute(main, { files: [state] });
  assert.equal(r.ok, true, JSON.stringify(r)); assert.equal(r.path, 'registered-runtime');
  assert.deepEqual(r.result.stdout, ['count 2']);
});

test('TypeScript runs after its types are stripped', async () => {
  const ts = { name: 'area.ts', content: 'interface Circle { r: number }\nexport const area = (c: Circle): number => Math.round(Math.PI * c.r * c.r);\nconsole.log(area({ r: 2 }));' };
  const r = await bridge().execute(ts, {});
  assert.equal(r.ok, true, JSON.stringify(r.result)); assert.deepEqual(r.result.stdout, ['13']);
});

test('missing sibling and outside packages are reported as requirements, not faked', async () => {
  const app = { name: 'app.tsx', content: "import React from 'react';\nimport { gone } from './missing';\nexport const App = () => <div>{gone}</div>;" };
  const r = await bridge().execute(app, {});
  assert.equal(r.result.ok, false);
  assert.ok(r.result.requirements.includes('file:./missing') && r.result.requirements.includes('package:react'), JSON.stringify(r.result.requirements));
});

test('plain scripts still go to the original path', async () => {
  const r = await bridge().execute({ name: 'plain.js', content: 'console.log(1+1)' }, {});
  assert.equal(r.ok, true); assert.notEqual(r.path, 'registered-runtime');
});
