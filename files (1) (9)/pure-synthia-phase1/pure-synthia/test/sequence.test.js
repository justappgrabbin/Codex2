import { test } from "node:test";
import assert from "node:assert/strict";
import { Primitive } from "../src/core/primitive.js";
import { o_sequence } from "../src/operators/sequence.js";
import { stableStringify } from "../src/core/hash.js";

const A = new Primitive({ id: "state:A", identity: "A", scale: "morpheme" });
const B = new Primitive({ id: "state:B", identity: "B", scale: "morpheme" });

test("o_sequence(A,B) != o_sequence(B,A) — §4's E(A,B) != E(B,A)", () => {
  const ab = o_sequence.apply([A, B]);
  const ba = o_sequence.apply([B, A]);
  assert.notEqual(stableStringify(ab), stableStringify(ba));
});

test("o_sequence records position as part of generated state, not metadata", () => {
  const ab = o_sequence.apply([A, B]);
  assert.deepEqual(ab.members, [
    { position: 0, stateId: "state:A" },
    { position: 1, stateId: "state:B" },
  ]);
});

test("o_sequence enforces arity 2", () => {
  assert.throws(() => o_sequence.apply([A]), RangeError);
  assert.throws(() => o_sequence.apply([A, B, A]), RangeError);
});
