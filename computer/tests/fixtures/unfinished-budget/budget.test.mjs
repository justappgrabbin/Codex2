import test from 'node:test';
import assert from 'node:assert/strict';
import { balance } from './dist/budget.mjs';
test('built application sums credits and debits and handles empty input', () => {
  assert.equal(balance([25, -5, 10]), '$30.00');
  assert.equal(balance([]), '$0.00');
});
