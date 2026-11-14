import { discoverySplit, testSplit, goldPhonemes, featureIds } from "../datasets/d1-phonemes.js";

/**
 * H.9 Compression Measurement, D1 tier.
 *
 * Encoding scheme is fixed here, BEFORE the numbers below are computed
 * or interpreted (H.9: "The encoding scheme used to calculate
 * description length must be fixed before comparison and reported
 * with the result."). See ASSUMPTIONS.md entry A-D1-04 for the
 * disclosed rationale — nothing here is tuned after seeing the
 * result.
 *
 * X = the full frozen D1 split (10 phonemes: 8 discovery + 2 test).
 * Using held-out-only would not match H.9's original L(X) framing,
 * which is about total dataset description length, not
 * generalization — generalization is already covered by H.16 #5/#6.
 *
 * --- Direct baseline ---
 * L_direct(X): each phoneme stored as one opaque symbol from an
 * alphabet of size |X| (fixed-width binary code).
 *   bits/symbol = ceil(log2(|X|))
 *   L_direct(X) = |X| * bits/symbol
 *
 * --- Grammar + residual ---
 * G = { feature alphabet F (|F| features, treated as pre-given/free,
 *       same convention as the direct baseline treating its own
 *       symbol alphabet as decodable), one operator o_bundle3 with
 *       arity k=3 }.
 *
 *   L(G): cost to specify the *rule* "each item is an unordered
 *   choice of k features from F" —
 *     operator-identity cost = ceil(log2(numRegisteredOperators))
 *       (numRegisteredOperators = 1 in Phase 1 D1 -> 0 bits)
 *     arity-field cost = 4 bits (fixed nominal field, enough for
 *       arities 0-15; this is a flat overhead charged regardless of
 *       dataset size)
 *     L(G) = operator-identity cost + arity-field cost
 *
 *   L(X|G): for each item, an unordered k-of-|F| selection.
 *     bits/item = ceil(log2( C(|F|, k) ))
 *     L(X|G) = |X| * bits/item
 */

function log2ceil(n) {
  if (n <= 1) return 0;
  return Math.ceil(Math.log2(n));
}

function nCk(n, k) {
  if (k < 0 || k > n) return 0;
  let num = 1;
  let den = 1;
  for (let i = 0; i < k; i++) {
    num *= n - i;
    den *= i + 1;
  }
  return Math.round(num / den);
}

export function runCompressionExperiment() {
  const allIds = [...discoverySplit, ...testSplit];
  const X = allIds.map((id) => ({ id, features: goldPhonemes[id] }));
  const nItems = X.length;

  const kArity = 3; // fixed arity used by o_bundle3, per A-D1-01
  const numFeatures = featureIds.length; // |F|
  const numRegisteredOperators = 1; // only o_bundle3 exists in this D1 grammar

  // --- L_direct(X) ---
  const directAlphabetSize = nItems; // one symbol per distinct observed phoneme
  const directBitsPerSymbol = log2ceil(directAlphabetSize);
  const L_direct = nItems * directBitsPerSymbol;

  // --- L(G) ---
  const operatorIdentityBits = log2ceil(numRegisteredOperators);
  const arityFieldBits = 4;
  const L_G = operatorIdentityBits + arityFieldBits;

  // --- L(X|G) ---
  const combinations = nCk(numFeatures, kArity);
  const bitsPerItemGivenG = log2ceil(combinations);
  const L_X_given_G = nItems * bitsPerItemGivenG;

  const L_grammar_total = L_G + L_X_given_G;
  const compressionGain = 1 - L_grammar_total / L_direct; // CG, §H.9

  return {
    scheme: {
      X_size: nItems,
      numFeatures,
      kArity,
      numRegisteredOperators,
      directAlphabetSize,
      directBitsPerSymbol,
      operatorIdentityBits,
      arityFieldBits,
      combinations,
      bitsPerItemGivenG,
    },
    raw: {
      L_direct,
      L_G,
      L_X_given_G,
      L_grammar_total,
    },
    compressionGain, // CG > 0 would mean compression relative to this baseline; see raw numbers for actual sign
  };
}

export { log2ceil, nCk };
