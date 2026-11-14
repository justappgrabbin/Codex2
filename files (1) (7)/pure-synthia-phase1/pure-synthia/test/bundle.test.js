import { test } from "node:test";
import assert from "node:assert/strict";
import { Primitive } from "../src/core/primitive.js";
import { createBundleOperator } from "../src/operators/bundle.js";
import { stableStringify } from "../src/core/hash.js";

const voice = new Primitive({ id: "f.voice", identity: "voiced", contrast: "+voice", scale: "feature" });
const labial = new Primitive({ id: "f.place.lab", identity: "labial", contrast: "place=labial", scale: "feature" });
const stop = new Primitive({ id: "f.manner.stop", identity: "stop", contrast: "manner=stop", scale: "feature" });

test("o_bundle preserves all constituent identities", () => {
  const bundle3 = createBundleOperator({ arity: 3 });
  const out = bundle3.apply([voice, labial, stop]);
  assert.equal(out.members.length, 3);
  const ids = out.members.map((m) => m.stateId);
  assert.deepEqual([...ids].sort(), ["f.manner.stop", "f.place.lab", "f.voice"]);
});

test("o_bundle is order-insensitive (simultaneous composition, §I.5)", () => {
  const bundle3 = createBundleOperator({ arity: 3 });
  const outA = bundle3.apply([voice, labial, stop]);
  const outB = bundle3.apply([stop, voice, labial]);
  const outC = bundle3.apply([labial, stop, voice]);

  assert.equal(stableStringify(outA), stableStringify(outB));
  assert.equal(stableStringify(outA), stableStringify(outC));
});

test("o_bundle rejects non-Primitive operands", () => {
  const bundle2 = createBundleOperator({ arity: 2 });
  assert.throws(() => bundle2.apply([voice, { id: "not-a-primitive" }]), TypeError);
});

test("o_bundle enforces its configured arity", () => {
  const bundle2 = createBundleOperator({ arity: 2 });
  assert.throws(() => bundle2.apply([voice, labial, stop]), RangeError);
});
