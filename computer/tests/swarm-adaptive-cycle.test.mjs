import test from 'node:test';
import assert from 'node:assert/strict';
import { SwarmAdaptiveCycle } from '../swarm/adaptive-cycle.mjs';

function setup() {
  let stored;
  const calls = [];
  const persistence = {
    load: async () => structuredClone(stored),
    save: async value => { stored = structuredClone(value); }
  };
  const make = name => ({
    canHandle: async ({ preference }) => !preference || preference === name,
    prepare: async ({ goal }) => ({ format: name, goal }),
    execute: async proposal => { calls.push(proposal); return { completed: true }; },
    verify: async ({ result }) => result.completed
  });
  return { cycle: new SwarmAdaptiveCycle({ capabilities: { game: make('game'), lesson: make('lesson') }, persistence }), calls };
}
test('adapts the presentation without losing the goal', async () => {
  const { cycle } = setup();
  assert.equal((await cycle.start({ goal: 'Learn programming' })).capability, 'game');
  const next = await cycle.adapt({ feedback: { message: 'Teach me directly', preferredFormat: 'lesson' } });
  assert.equal(next.capability, 'lesson');
  assert.equal(next.state.goal, 'Learn programming');
  assert.equal(next.state.history.filter(x => x.type === 'feedback').length, 1);
});
test('does not execute without approval; verifies after execution', async () => {
  const { cycle, calls } = setup();
  await cycle.start({ goal: 'Learn programming' });
  assert.equal((await cycle.apply()).status, 'approval-required');
  assert.equal(calls.length, 0);
  assert.equal((await cycle.apply({ approve: true })).status, 'verified');
  assert.equal(calls.length, 1);
});
test('missing capabilities are an explicit blocker', async () => {
  let state;
  const cycle = new SwarmAdaptiveCycle({ capabilities: {}, persistence: { load: async () => state, save: async s => { state = s; } } });
  assert.equal((await cycle.start({ goal: 'Make a world' })).status, 'blocked');
});
