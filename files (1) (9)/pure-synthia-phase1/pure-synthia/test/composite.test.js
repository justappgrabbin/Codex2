import { test } from "node:test";
import assert from "node:assert/strict";
import { Composite, deriveCompositeId } from "../src/core/composite.js";

test("Composite requires id, scale, operatorId, derivationId, and >=1 child", () => {
  assert.throws(
    () => new Composite({ scale: "bundle", children: ["a"], operatorId: "o_bundle", derivationId: "d1" }),
    TypeError,
  );
  assert.throws(
    () => new Composite({ id: "c1", scale: "bundle", children: [], operatorId: "o_bundle", derivationId: "d1" }),
    TypeError,
  );
});

test("Composite is frozen; children cannot be mutated after construction", () => {
  const c = new Composite({
    id: "c1",
    scale: "bundle",
    children: ["f.voice", "f.place.lab"],
    operatorId: "o_bundle",
    derivationId: "d1",
  });
  assert.throws(() => c.children.push("f.manner.stop"));
  assert.throws(() => {
    c.scale = "mutated";
  });
});

test("deriveCompositeId is deterministic for identical content", () => {
  const args = { scale: "bundle", children: ["f.voice", "f.place.lab"], operatorId: "o_bundle", context: {} };
  const id1 = deriveCompositeId(args);
  const id2 = deriveCompositeId({ ...args });
  assert.equal(id1, id2);
});

test("deriveCompositeId differs when children order differs (sequence-style operators care about order)", () => {
  const idAB = deriveCompositeId({ scale: "sequence", children: ["A", "B"], operatorId: "o_sequence", context: {} });
  const idBA = deriveCompositeId({ scale: "sequence", children: ["B", "A"], operatorId: "o_sequence", context: {} });
  assert.notEqual(idAB, idBA);
});
