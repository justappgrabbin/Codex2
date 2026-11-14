import { test } from "node:test";
import assert from "node:assert/strict";
import { runCompressionExperiment, log2ceil, nCk } from "../src/experiments/compression.js";

test("log2ceil / nCk sanity checks", () => {
  assert.equal(log2ceil(10), 4); // 2^4=16 >= 10 > 2^3=8
  assert.equal(log2ceil(56), 6); // 2^6=64 >= 56 > 2^5=32
  assert.equal(nCk(8, 3), 56);
});

test("H.9 compression experiment on frozen D1 split — raw numbers, hand-verified", () => {
  const result = runCompressionExperiment();

  // Hand-computed expectations, fixed independently of the implementation:
  //   L_direct = 10 items * ceil(log2(10))=4 bits = 40
  //   L(G) = 0 (1 registered operator -> log2(1)=0) + 4 (arity field) = 4
  //   L(X|G) = 10 items * ceil(log2(C(8,3)=56))=6 bits = 60
  //   L_grammar_total = 64
  //   CG = 1 - 64/40 = -0.6
  assert.equal(result.raw.L_direct, 40);
  assert.equal(result.raw.L_G, 4);
  assert.equal(result.raw.L_X_given_G, 60);
  assert.equal(result.raw.L_grammar_total, 64);
  assert.ok(Math.abs(result.compressionGain - -0.6) < 1e-9);
});
