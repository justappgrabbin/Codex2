import { test } from "node:test";
import assert from "node:assert/strict";
import { Operator, OperatorRegistry } from "../src/core/operator.js";

function makeEcho(id = "o_echo") {
  return new Operator({
    id,
    arity: 2,
    accepts: (operands) => operands.every((x) => typeof x === "number"),
    transform: (operands) => operands.reduce((a, b) => a + b, 0),
  });
}

test("Operator requires positive integer arity", () => {
  assert.throws(
    () => new Operator({ id: "bad", arity: 0, accepts: () => true, transform: () => {} }),
    TypeError,
  );
});

test("apply() rejects wrong operand count", () => {
  const o = makeEcho();
  assert.throws(() => o.apply([1]), RangeError);
});

test("apply() rejects operands failing accepts()", () => {
  const o = makeEcho();
  assert.throws(() => o.apply([1, "not a number"]), TypeError);
});

test("apply() runs transform on accepted operands", () => {
  const o = makeEcho();
  assert.equal(o.apply([2, 3]), 5);
});

test("OperatorRegistry rejects duplicate ids and unknown lookups", () => {
  const registry = new OperatorRegistry();
  registry.register(makeEcho());
  assert.throws(() => registry.register(makeEcho()));
  assert.throws(() => registry.get("does-not-exist"), RangeError);
});

test("withoutOperator supports ablation (Appendix E)", () => {
  const registry = new OperatorRegistry();
  registry.register(makeEcho("o_echo"));
  registry.register(makeEcho("o_echo2"));

  const ablated = registry.withoutOperator("o_echo");
  assert.throws(() => ablated.get("o_echo"));
  assert.ok(ablated.get("o_echo2"));
});
