import { contentHash } from "../core/hash.js";

/**
 * Δ(Y) = (I, P, O, R, C, T, Y, E)  [Appendix D]
 *
 * Every generated output carries a derivation object recording the
 * full minimal computational path (Appendix D's boxed pipeline).
 * The derivation is content-hashed to a derivationId so that two
 * runs with identical (versioned) inputs produce an identical id —
 * this is what makes D.1 deterministic replay checkable.
 */
export function buildDerivation({
  engineVersion,
  grammarVersion,
  operatorVersion,
  input,
  primitiveIds,
  operatorId,
  relations = [],
  context = {},
  transforms = [],
  output,
  ledger,
  evaluation = null,
}) {
  const payload = {
    engineVersion,
    grammarVersion,
    operatorVersion,
    input,
    primitiveIds: [...primitiveIds],
    operatorId,
    relations: [...relations],
    context,
    transforms: [...transforms],
    output,
    ledger,
    evaluation,
  };

  const derivationId = `derivation:${contentHash(payload)}`;

  return Object.freeze({ id: derivationId, ...payload });
}
