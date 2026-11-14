import { test } from "node:test";
import assert from "node:assert/strict";
import { runAblationExperiment } from "../src/experiments/ablation.js";

function impactOf(results, component) {
  const r = results.find((x) => x.component === component);
  assert.ok(r, `no ablation result found for ${component}`);
  return r;
}

test("H.12 ablation — baseline performance is 1.0 (matches H-D1-01)", () => {
  const { performanceBaseline } = runAblationExperiment();
  assert.equal(performanceBaseline, 1.0);
});

test("H.12 ablation — removing the only operator is maximally damaging", () => {
  const { results } = runAblationExperiment();
  const r = impactOf(results, "operator:o_bundle3");
  assert.equal(r.performanceAblated, 0);
  assert.equal(r.ablationImpact, 1.0);
});

test("H.12 ablation — f.voice is uniquely load-bearing (used by both held-out targets g and v)", () => {
  const { results } = runAblationExperiment();
  const r = impactOf(results, "primitive:f.voice");
  assert.equal(r.performanceAblated, 0);
  assert.equal(r.ablationImpact, 1.0);
});

test("H.12 ablation — features used by exactly one held-out target drop performance by exactly 0.5", () => {
  const { results } = runAblationExperiment();
  for (const fid of ["f.place.vel", "f.manner.stop", "f.place.lab", "f.manner.fric"]) {
    const r = impactOf(results, `primitive:${fid}`);
    assert.equal(r.performanceAblated, 0.5, `${fid} expected 0.5, got ${r.performanceAblated}`);
    assert.equal(r.ablationImpact, 0.5);
  }
});

test("H.12 ablation — features unused by either held-out target have zero measured impact on this metric", () => {
  const { results } = runAblationExperiment();
  for (const fid of ["f.place.alv", "f.manner.nas", "f.voiceless"]) {
    const r = impactOf(results, `primitive:${fid}`);
    assert.equal(r.performanceAblated, 1.0, `${fid} expected no impact, got ${r.performanceAblated}`);
    assert.equal(r.ablationImpact, 0);
  }
});

test("H.12 ablation — removing canonicalization breaks order-invariance (substitute for position ablation, A-D1-05)", () => {
  const { results } = runAblationExperiment();
  const r = impactOf(results, "mechanism:o_bundle-canonicalization");
  assert.equal(r.performanceBaseline, 1.0);
  assert.equal(r.performanceAblated, 0);
  assert.equal(r.ablationImpact, 1.0);
});
