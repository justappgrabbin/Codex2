import { test } from "node:test";
import assert from "node:assert/strict";
import { Primitive, PrimitiveRegistry } from "../src/core/primitive.js";
import { OperatorRegistry } from "../src/core/operator.js";
import { createBundleOperator } from "../src/operators/bundle.js";
import { SynthiaEngine } from "../src/engine/synthia.js";
import { replay } from "../src/derivation/replay.js";

function buildFixture() {
  const primitives = new PrimitiveRegistry();
  primitives.register(new Primitive({ id: "f.voice", identity: "voiced", scale: "feature" }));
  primitives.register(new Primitive({ id: "f.place.lab", identity: "labial", scale: "feature" }));

  const operators = new OperatorRegistry();
  operators.register(createBundleOperator({ id: "o_bundle2", arity: 2 }));

  const engine = new SynthiaEngine({ primitiveRegistry: primitives, operatorRegistry: operators });
  return { primitives, operators, engine };
}

test("replay() reconstructs an identical derivation hash from a stored derivation (D.1)", () => {
  const { primitives, operators, engine } = buildFixture();
  const { derivation } = engine.execute({ operatorId: "o_bundle2", primitiveIds: ["f.voice", "f.place.lab"] });

  const { matches, replayed } = replay(derivation, { primitiveRegistry: primitives, operatorRegistry: operators });

  assert.equal(matches, true);
  assert.equal(replayed.id, derivation.id);
});

test("replay() detects a mismatch if the operator's transform is not actually deterministic", async () => {
  const primitives = new PrimitiveRegistry();
  primitives.register(new Primitive({ id: "f.voice", identity: "voiced", scale: "feature" }));
  primitives.register(new Primitive({ id: "f.place.lab", identity: "labial", scale: "feature" }));

  const operators = new OperatorRegistry();
  let counter = 0;
  const { Operator } = await importOperator();
  operators.register(
    new Operator({
      id: "o_nondeterministic",
      arity: 2,
      accepts: () => true,
      // Deliberately violates the "no hidden state" rule to prove replay() catches it.
      transform: () => ({ kind: "nondeterministic", counter: counter++ }),
    }),
  );

  const engine = new (await importEngine()).SynthiaEngine({
    primitiveRegistry: primitives,
    operatorRegistry: operators,
  });

  const { derivation } = engine.execute({ operatorId: "o_nondeterministic", primitiveIds: ["f.voice", "f.place.lab"] });
  const { matches } = replay(derivation, { primitiveRegistry: primitives, operatorRegistry: operators });

  assert.equal(matches, false);
});

async function importOperator() {
  return import("../src/core/operator.js");
}
async function importEngine() {
  return import("../src/engine/synthia.js");
}
