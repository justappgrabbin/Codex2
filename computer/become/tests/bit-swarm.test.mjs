import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { BitSwarm } from '../bit-swarm.mjs';
import { applyBinary, toBitString } from '../../donors/recovered/synthai-r21.22-self-cultivation-graph-integrated/UPGRADES/shared/boolean-operator-bank.mjs';

const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
// width 12: bits 0-5 inward (self), bits 6-11 outward
const A = '110000' + '101000';   // shows 101000 outward; its inward 110000 is latent alone
const B = '101000' + '000011';   // inward 101000 is exactly what A sends outward

test('the 16-function bank is used unmodified (same file as the owner\'s Klein/LCM copy)', () => {
  assert.equal(sha(new URL('../../donors/recovered/synthai-r21.22-self-cultivation-graph-integrated/UPGRADES/shared/boolean-operator-bank.mjs', import.meta.url)),
    sha('/home/claude/language-contact-model/vendor/synthai-generative/UPGRADES/shared/boolean-operator-bank.mjs'));
});

test('alone, a unit expresses only what it shows; its inward capability stays latent', () => {
  const s = new BitSwarm().add('B', { being: B }); s.step();
  assert.equal(s.snapshot()[0].expressed, '000000' + '000011');
});

test('relationships activate capability that was not expressed in isolation', () => {
  const s = new BitSwarm().add('A', { being: A }).add('B', { being: B }); s.step();
  assert.ok(s.relations.has('A>B'), 'A\'s outward half completes B\'s inward half');
  const b = s.snapshot().find(u => u.id === 'B');
  assert.equal(b.expressed, '101000' + '000011', 'B\'s inward bits switch on only with A');
});

test('directed: A with B is not B with A (the bank\'s one-way functions)', () => {
  assert.notEqual(toBitString(applyBinary('a_implies_b', A, B)), toBitString(applyBinary('a_implies_b', B, A)));
  assert.equal(toBitString(applyBinary('xor', A, B)), toBitString(applyBinary('xor', B, A)), 'xor stays symmetric');
});

test('a pair that co-expresses 3 times composes into a new unit with its own being', () => {
  const s = new BitSwarm().add('A', { being: A }).add('B', { being: B });
  const ch = s.run(3);
  assert.ok(s.units.has('A+B'), JSON.stringify(ch.filter(c => c.composed)));
  assert.equal(s.composed, 1);
  s.step(); assert.ok(s.snapshot().find(u => u.id === 'A+B').expressed.includes('1'), 'the new unit expresses');
});

test('position reconfigures expression, and every change records changed and preserved bits', () => {
  const s = new BitSwarm().add('A', { being: A }).add('B', { being: B }); s.step();
  s.move('B', '000000' + '111111');                 // B moves where inward expression is not allowed
  const ch = s.step().find(c => c.unit === 'B');
  assert.equal(ch.to, '000000000011'); assert.deepEqual(ch.changed, [0, 2]); assert.equal(ch.preserved.length, 10);
});
