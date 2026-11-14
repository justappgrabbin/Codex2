import { test } from "node:test";
import assert from "node:assert/strict";
import { Primitive, PrimitiveRegistry } from "../src/core/primitive.js";

test("Primitive requires id, identity, scale", () => {
  assert.throws(() => new Primitive({ identity: "x", scale: "feature" }), TypeError);
  assert.throws(() => new Primitive({ id: "p1", scale: "feature" }), TypeError);
  assert.throws(() => new Primitive({ id: "p1", identity: "x" }), TypeError);
});

test("Primitive is frozen (immutable)", () => {
  const p = new Primitive({ id: "f.voice", identity: "voiced", scale: "feature" });
  assert.throws(() => {
    p.identity = "mutated";
  });
  assert.equal(p.identity, "voiced");
  assert.throws(() => p.operations.push("x"));
});

test("Primitive defaults candidateDimension/candidateAddress to null", () => {
  const p = new Primitive({ id: "f.voice", identity: "voiced", scale: "feature" });
  assert.equal(p.candidateDimension, null);
  assert.equal(p.candidateAddress, null);
});

test("PrimitiveRegistry rejects duplicate ids", () => {
  const registry = new PrimitiveRegistry();
  registry.register(new Primitive({ id: "f.voice", identity: "voiced", scale: "feature" }));
  assert.throws(() =>
    registry.register(new Primitive({ id: "f.voice", identity: "voiced-again", scale: "feature" })),
  );
});

test("PrimitiveRegistry.get throws on unknown id", () => {
  const registry = new PrimitiveRegistry();
  assert.throws(() => registry.get("nope"), RangeError);
});

test("withoutPrimitive supports ablation (Appendix E)", () => {
  const registry = new PrimitiveRegistry();
  registry.register(new Primitive({ id: "f.voice", identity: "voiced", scale: "feature" }));
  registry.register(new Primitive({ id: "f.place.lab", identity: "labial", scale: "feature" }));

  const ablated = registry.withoutPrimitive("f.voice");
  assert.equal(ablated.has("f.voice"), false);
  assert.equal(ablated.has("f.place.lab"), true);
  // original registry must be untouched
  assert.equal(registry.has("f.voice"), true);
});
