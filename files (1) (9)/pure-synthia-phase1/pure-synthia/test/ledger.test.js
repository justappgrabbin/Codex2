import { test } from "node:test";
import assert from "node:assert/strict";
import { Ledger } from "../src/derivation/ledger.js";

test("Ledger accumulates counts (§13 L = (N_p,N_s,N_e,N_o,D_r,A_c,T_c))", () => {
  const l = new Ledger();
  l.recordPrimitiveActivation(3);
  l.recordStateGenerated(1);
  l.recordEdgeTraversed(2);
  l.recordOperation(1);
  l.setRecursionDepth(2);

  const snap = l.snapshot();
  assert.equal(snap.primitivesActivated, 3);
  assert.equal(snap.statesGenerated, 1);
  assert.equal(snap.edgesTraversed, 2);
  assert.equal(snap.operationsExecuted, 1);
  assert.equal(snap.recursionDepth, 2);
});

test("setRecursionDepth tracks the maximum seen, not the last call", () => {
  const l = new Ledger();
  l.setRecursionDepth(3);
  l.setRecursionDepth(1);
  assert.equal(l.snapshot().recursionDepth, 3);
});

test("snapshot() is frozen", () => {
  const l = new Ledger();
  const snap = l.snapshot();
  assert.throws(() => {
    snap.primitivesActivated = 99;
  });
});
