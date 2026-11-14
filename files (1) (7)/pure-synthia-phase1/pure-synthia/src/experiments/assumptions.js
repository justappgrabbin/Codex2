import { contentHash } from "../core/hash.js";

/**
 * ASSUMPTIONS.md's machine-readable twin.
 *
 * Per the user's instruction to keep a complete derivation/provenance
 * record of any additional assumptions introduced while extending the
 * spec, every design decision made in this pass that is NOT already
 * pinned down by Appendices A-J is registered here as an explicit,
 * content-hashed record with an evidence state — never silently baked
 * into code with no trace, per Appendix B's discipline.
 *
 * Evidence state follows Appendix B's chain:
 *   unobserved -> observed -> inferred -> hypothesized -> tested
 *   -> {supported, rejected, inconclusive}
 *
 * Everything below is currently "assumed" (a convenience decision,
 * not a scientific claim under test) or "hypothesized" (an empirical
 * claim this pass's experiment actually tests). Assumed items are
 * scoped narrowly and flagged as candidates for revision, not treated
 * as settled.
 */
export const assumptions = [
  {
    id: "A-D1-01",
    kind: "assumed",
    claim:
      "D1 benchmark tier uses a 10-phoneme English consonant subset (§H.3.2's tier), each represented as exactly 3 features: place, manner, voicing.",
    rationale:
      "Appendix A only worked 5 illustrative features/phonemes. A slightly larger, fixed-arity set is the minimum needed to run a real discovery/test split (H.4) rather than an illustrative one. Fixed arity 3 was chosen so a single o_bundle3 operator instance suffices — this is an implementation convenience, not a claim that all phonemes are 3-feature.",
    scope: "D1 dataset only; does not extend to D2+ tiers.",
    evidenceState: "assumed",
  },
  {
    id: "A-D1-02",
    kind: "assumed",
    claim:
      "Voicing is represented as two mutually exclusive primitives, f.voice and f.voiceless, rather than a single binary-valued feature.",
    rationale:
      "Keeps every phoneme at fixed arity 3 (§A-D1-01) instead of variable arity 2-or-3. This is a data-modeling choice, not a phonological claim — a later phase may replace it with a true binary-valued contrast on a single primitive without invalidating discovery-set results, since it does not change which feature *distinctions* are represented, only how the voicing distinction is encoded as records.",
    scope: "D1 dataset only.",
    evidenceState: "assumed",
  },
  {
    id: "A-D1-03",
    kind: "assumed",
    claim:
      'The discovery/test split for the held-out reconstruction experiment (H.16 item 5, H.5) is: discovery = {p,b,t,d,k,m,n,f}, test = {g,v}. All of g and v\'s individual features (velar place, fricative manner, voice) appear somewhere in the discovery set\'s bundles, but the specific triples for g and v do not.',
    rationale:
      "This is the minimum split satisfying H.5's requirement (A,B,C in discovery, o(A,o(B,C)) not in discovery) with this 10-item dataset. A different split would also satisfy H.5; this one was picked, not derived, and is disclosed as such rather than presented as the only valid choice.",
    scope: "This experiment run only; re-randomizing the split is expected to happen once real dataset infrastructure (H.3, H.4) exists.",
    evidenceState: "assumed",
  },
  {
    id: "H-D1-01",
    kind: "hypothesized",
    claim:
      "Bundling the held-out phonemes' known component features via o_bundle produces the correct gold structure, and the resulting derivation's content hash does not match any derivation produced during discovery — i.e. genuine unseen composition (§15's emergence definition), not lookup.",
    rationale:
      "This is the actual empirical claim under test in reconstruction.test.js — it is falsifiable: if either the structure is wrong, or (impossibly, given the engine's design, but checked anyway) the held-out hash collides with a discovery hash, the test fails and this hypothesis is logged as rejected, not silently passed.",
    scope: "D1 tier, this engine version only.",
    evidenceState: "tested",
  },
];

export function assumptionsManifestHash() {
  return contentHash(assumptions);
}
