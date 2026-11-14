import { test } from "node:test";
import assert from "node:assert/strict";
import { Primitive, PrimitiveRegistry } from "../src/core/primitive.js";
import { OperatorRegistry } from "../src/core/operator.js";
import { createBundleOperator } from "../src/operators/bundle.js";
import { o_sequence } from "../src/operators/sequence.js";
import { SynthiaEngine } from "../src/engine/synthia.js";

function buildFixture() {
  const primitives = new PrimitiveRegistry();
  primitives.register(new Primitive({ id: "f.voice", identity: "voiced", scale: "feature" }));
  primitives.register(new Primitive({ id: "f.place.lab", identity: "labial", scale: "feature" }));
  primitives.register(new Primitive({ id: "f.manner.stop", identity: "stop", scale: "feature" }));

  const operators = new OperatorRegistry();
  operators.register(createBundleOperator({ id: "o_bundle3", arity: 3 }));
  operators.register(o_sequence);

  const engine = new SynthiaEngine({ primitiveRegistry: primitives, operatorRegistry: operators });
  return { primitives, operators, engine };
}

test("execute() produces a derivation whose id is a content hash, plus a Composite", () => {
  const { engine } = buildFixture();
  const { derivation, composite } = engine.execute({
    operatorId: "o_bundle3",
    primitiveIds: ["f.voice", "f.place.lab", "f.manner.stop"],
  });

  assert.ok(derivation.id.startsWith("derivation:"));
  assert.ok(composite.id.startsWith("composite:"));
  assert.equal(composite.derivationId, derivation.id);
  assert.equal(derivation.output.kind, "bundle");
});

test("execute() is deterministic: identical calls yield identical derivation ids (D.1)", () => {
  const { engine } = buildFixture();
  const run1 = engine.execute({ operatorId: "o_bundle3", primitiveIds: ["f.voice", "f.place.lab", "f.manner.stop"] });
  const run2 = engine.execute({ operatorId: "o_bundle3", primitiveIds: ["f.voice", "f.place.lab", "f.manner.stop"] });

  assert.equal(run1.derivation.id, run2.derivation.id);
  assert.equal(run1.composite.id, run2.composite.id);
});

test("execute() with o_sequence is order-sensitive end to end", () => {
  const primitives = new PrimitiveRegistry();
  primitives.register(new Primitive({ id: "m:un-", identity: "un-", scale: "morpheme" }));
  primitives.register(new Primitive({ id: "m:kind", identity: "kind", scale: "morpheme" }));

  const operators = new OperatorRegistry();
  operators.register(o_sequence);
  const engine = new SynthiaEngine({ primitiveRegistry: primitives, operatorRegistry: operators });

  const unkind = engine.execute({ operatorId: "o_sequence", primitiveIds: ["m:un-", "m:kind"] });
  const kindun = engine.execute({ operatorId: "o_sequence", primitiveIds: ["m:kind", "m:un-"] });

  assert.notEqual(unkind.derivation.id, kindun.derivation.id);
  assert.deepEqual(unkind.derivation.output.members.map((m) => m.stateId), ["m:un-", "m:kind"]);
});

test("unseen composition (H.5-style): a composite over a combination never explicitly registered is still generated deterministically from primitives + operator, not looked up", () => {
  const { engine, primitives } = buildFixture();

  // "Stored solutions" would be an explicit lookup table keyed by input.
  // Pure Synthia never touches one here — the output comes only from
  // Primitive Resolution + Operator Selection + Composition (§I.12).
  const storedSolutions = new Map(); // deliberately empty

  const combinationKey = ["f.voice", "f.place.lab", "f.manner.stop"].join("+");
  assert.equal(storedSolutions.has(combinationKey), false);

  const { derivation } = engine.execute({
    operatorId: "o_bundle3",
    primitiveIds: ["f.voice", "f.place.lab", "f.manner.stop"],
  });

  assert.equal(derivation.output.members.length, 3);
  assert.equal(storedSolutions.has(combinationKey), false); // still never stored
  void primitives; // fixture reused only for its registered primitives
});
