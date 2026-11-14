import { buildDerivation } from "./derivation.js";

/**
 * replay(derivation, { primitiveRegistry, operatorRegistry })
 *
 * Reconstructs F(S_t, I_t, C_t, G_v, O_v) from a stored derivation
 * and re-derives it from scratch. Returns { matches, replayed }.
 *
 * matches === true  iff Hash(Δ_original) === Hash(Δ_replayed)  (D.1)
 */
export function replay(derivation, { primitiveRegistry, operatorRegistry, ledger }) {
  const operator = operatorRegistry.get(derivation.operatorId);
  const operands = derivation.primitiveIds.map((id) => primitiveRegistry.get(id));

  const output = operator.apply(operands, derivation.context);

  const replayed = buildDerivation({
    engineVersion: derivation.engineVersion,
    grammarVersion: derivation.grammarVersion,
    operatorVersion: derivation.operatorVersion,
    input: derivation.input,
    primitiveIds: derivation.primitiveIds,
    operatorId: derivation.operatorId,
    relations: derivation.relations,
    context: derivation.context,
    transforms: derivation.transforms,
    output,
    ledger: ledger ? ledger.snapshot() : derivation.ledger,
    evaluation: derivation.evaluation,
  });

  return { matches: replayed.id === derivation.id, replayed };
}
