import { test } from "node:test";
import assert from "node:assert/strict";
import { sealD1 } from "../src/experiments/seal-d1.js";

test("sealD1() is deterministic — two seals of the same frozen system have identical manifestHash", () => {
  const a = sealD1();
  const b = sealD1();
  assert.equal(a.manifestHash, b.manifestHash);
});

test("sealD1() reports all required sections", () => {
  const sealed = sealD1();
  for (const key of [
    "datasetHash",
    "grammarHash",
    "reconstruction",
    "compression",
    "ablation",
    "assumptions",
    "testCountAtSealTime",
    "manifestHash",
  ]) {
    assert.ok(key in sealed, `sealed artifact missing "${key}"`);
  }
});

test("sealD1() reconstruction metrics match the standalone experiment run", () => {
  const sealed = sealD1();
  assert.equal(sealed.reconstruction.metrics.generationAccuracy, 1.0);
  assert.equal(sealed.reconstruction.metrics.novelCompositionRate, 1.0);
});

test("sealD1() compression raw numbers match the standalone experiment run", () => {
  const sealed = sealD1();
  assert.equal(sealed.compression.raw.L_direct, 40);
  assert.equal(sealed.compression.raw.L_grammar_total, 64);
});
