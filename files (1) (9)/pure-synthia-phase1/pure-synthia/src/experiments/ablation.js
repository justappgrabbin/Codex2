import { OperatorRegistry, Operator } from "../core/operator.js";
import { createBundleOperator } from "../operators/bundle.js";
import { SynthiaEngine } from "../engine/synthia.js";
import { buildFeatureRegistry, split, featureIds } from "../datasets/d1-phonemes.js";
import { Primitive } from "../core/primitive.js";

/**
 * H.12 Ablation Measurement, D1 tier.
 *
 * Performance(S) = generationAccuracy of the held-out reconstruction
 * task (§H.8 Acc), i.e. the same metric H-D1-01 already established
 * a baseline for. AblationImpact(x) = Performance(S) - Performance(S^-x).
 *
 * Ablated conditions, "already present in the frozen implementation"
 * as instructed:
 *   1. S^-o_bundle        — remove the only operator entirely
 *   2. S^-f_i  (x8)        — remove each of the 8 feature primitives, one at a time
 *   3. S^-canon            — remove o_bundle's order-canonicalization step
 *
 * Note on "position information": D1's o_bundle is *designed* to be
 * order-insensitive (§I.5 — bundling is simultaneous, not sequential).
 * D1 therefore has no genuine "position information" for o_sequence
 * to depend on; that only exists once a sequence-based task exists
 * (D2+). What *is* ablatable in the frozen D1 system is the
 * canonicalization mechanism that makes bundling order-insensitive
 * in the first place (§I.5's sort step) — condition 3 tests that
 * directly, and its own metric (order-invariance) is reported
 * alongside, not folded into Acc, since it measures a different
 * property. This substitution is logged as A-D1-05, not silently
 * treated as equivalent to a real position-information ablation.
 */

function buildBaselineSystem() {
  const primitives = buildFeatureRegistry();
  const operators = new OperatorRegistry();
  operators.register(createBundleOperator({ id: "o_bundle3", arity: 3 }));
  return { primitives, operators };
}

function measureAccuracy({ primitives, operators }) {
  const engine = new SynthiaEngine({ primitiveRegistry: primitives, operatorRegistry: operators });
  const { test } = split();

  let correct = 0;
  for (const item of test) {
    try {
      const { derivation } = engine.execute({ operatorId: "o_bundle3", primitiveIds: item.features });
      const generated = derivation.output.members.map((m) => m.stateId).sort();
      const expected = [...item.features].sort();
      const ok = generated.length === expected.length && generated.every((id, i) => id === expected[i]);
      if (ok) correct += 1;
    } catch {
      // missing primitive/operator -> composition impossible -> incorrect, not a crash
    }
  }
  return correct / test.length;
}

/** Non-canonicalizing variant of o_bundle: does NOT sort members by id. */
function createNonCanonicalBundleOperator() {
  return new Operator({
    id: "o_bundle3",
    arity: 3,
    accepts: (operands) => operands.every((p) => p instanceof Primitive),
    transform: (operands) => ({
      operator: "o_bundle3",
      kind: "bundle",
      members: operands.map((p) => ({ stateId: p.id, identity: p.identity, contrast: p.contrast })),
      // no .sort() here — order of input operands is preserved as-is
    }),
  });
}

export function runAblationExperiment() {
  const baseline = buildBaselineSystem();
  const performanceS = measureAccuracy(baseline);

  const results = [];

  // 1. Remove the operator entirely.
  {
    const primitives = buildFeatureRegistry();
    const operators = new OperatorRegistry(); // no operator registered
    const perf = measureAccuracy({ primitives, operators });
    results.push({
      component: "operator:o_bundle3",
      description: "Remove o_bundle3 (the only registered operator).",
      performanceAblated: perf,
      ablationImpact: performanceS - perf,
    });
  }

  // 2. Remove each feature primitive, one at a time.
  for (const fid of featureIds) {
    const primitives = buildFeatureRegistry().withoutPrimitive(fid);
    const operators = new OperatorRegistry();
    operators.register(createBundleOperator({ id: "o_bundle3", arity: 3 }));
    const perf = measureAccuracy({ primitives, operators });
    results.push({
      component: `primitive:${fid}`,
      description: `Remove feature primitive ${fid}.`,
      performanceAblated: perf,
      ablationImpact: performanceS - perf,
    });
  }

  // 3. Remove order-canonicalization from o_bundle (substitute for
  //    "position information" ablation — see module doc, A-D1-05).
  {
    const primitives = buildFeatureRegistry();
    const operators = new OperatorRegistry();
    operators.register(createNonCanonicalBundleOperator());
    const engine = new SynthiaEngine({ primitiveRegistry: primitives, operatorRegistry: operators });

    // Order-invariance metric: for each test item, bundle its gold
    // features in two different input orders and check whether the
    // resulting derivation ids match. Baseline (canonical) always
    // matches by construction (§I.5); this measures whether that
    // still holds once canonicalization is removed.
    const { test } = split();
    let invariantCount = 0;
    for (const item of test) {
      const primsA = item.features.map((id) => primitives.get(id));
      const primsB = [...primsA].reverse();
      const outA = operators.get("o_bundle3").apply(primsA);
      const outB = operators.get("o_bundle3").apply(primsB);
      if (JSON.stringify(outA) === JSON.stringify(outB)) invariantCount += 1;
    }
    const orderInvarianceAblated = invariantCount / test.length;
    const orderInvarianceBaseline = 1.0; // canonical o_bundle is order-invariant by construction, §I.5

    results.push({
      component: "mechanism:o_bundle-canonicalization",
      description:
        "Remove the sort/canonicalization step from o_bundle (substitute for a genuine position-information ablation — D1 has no sequence-based task; see A-D1-05). Metric here is order-invariance, not generationAccuracy, because generationAccuracy's own scoring already sorts both sides before comparing and so would not detect this change.",
      metric: "orderInvariance",
      performanceBaseline: orderInvarianceBaseline,
      performanceAblated: orderInvarianceAblated,
      ablationImpact: orderInvarianceBaseline - orderInvarianceAblated,
    });
  }

  return {
    performanceMetric: "generationAccuracy (held-out reconstruction, D1)",
    performanceBaseline: performanceS,
    results,
  };
}
