# A Recursive Generative State Calculus for Cross-Scale Automata

### Research Proposal & Specification — "Pure Synthia"

---

## Abstract

This project proposes a computational investigation into whether complex linguistic, semantic, behavioral, and computational structures can be generated from a finite set of primitive states and a finite set of reusable relational operators. The central hypothesis is that apparent complexity may arise through recursive composition, positional differentiation, dependency, transformation, and contextual expression, rather than requiring an independently stored representation for every possible higher-order state.

The proposed system, **Pure Synthia**, implements this hypothesis as a deterministic, browser-native JavaScript automaton. It represents incoming information through recursively nested canonical addresses, and tests whether the same primitive operations generate useful structure across progressively larger scales:

> symbol/feature → letter → morpheme → word → phrase → sentence → discourse → automaton → multi-automata mesh

The system initially runs without a backend, external language model, network service, or GPU. This is an experimental control: any generated behavior must be attributable to the primitive state system, its accumulated observations, and its transformation rules — not to an external model's prior knowledge.

Proposed dimensional or Human-Design–derived correspondences are **not** assumed to be established physical law. They are represented as explicit, labeled hypotheses whose predictive and generative usefulness is measured experimentally, and which are discarded if they fail to earn their keep.

---

## 1. Research Questions

**Primary question.** Can a finite primitive-state vocabulary, together with a finite set of transformation operators, recursively generate useful higher-order linguistic and computational behavior across multiple scales?

**Secondary question.** Do the same structural operations remain invariant as their operands change — from linguistic objects, to semantic states, to automata, to networks of automata?

If the secondary question holds even partially, complexity in this system can be treated as *generated* structure rather than exclusively *stored* structure, which is the property the whole program is trying to establish or rule out.

---

## 2. Existing Scientific Foundation

The proposal does not start from nothing. Several of its moving parts have direct, well-established analogues:

- **Generative grammar** — a finite grammar generates an unbounded set of expressions through hierarchical composition and recursion.
- **Formal language theory** — finite alphabets and production rules generate very large or infinite languages.
- **Automata theory** — small state/transition sets produce complex behavior.
- **Graph theory** — represents entities whose behavior depends on relationships, not just intrinsic properties.
- **Dynamical systems** — describes systems through states and transformations over time.
- **Information theory** — gives quantitative tools for measuring information, uncertainty, and compression.

The experimental architecture starts from the standard state-transition formulation:

$$S_{t+1} = F(S_t, I_t, C_t)$$

where $S_t$ is the current state, $I_t$ incoming information, $C_t$ context, and $F$ the transformation rule. Pure Synthia's contribution is to make states **recursively addressed** and **compositionally generated**, rather than flat.

---

## 3. Central Generative Hypothesis

Given a primitive set $P = \{p_1, \dots, p_n\}$ and a finite operator set $O = \{o_1, \dots, o_m\}$, higher-order objects are generated recursively:

$$X_{k+1} = o(X_{k,1}, X_{k,2}, \dots, X_{k,r} \mid C)$$

where $C$ is contextual constraint.

The claim under test is explicitly **not** that every possible word, sentence, or behavior already exists in memory. It is that a sufficiently expressive primitive vocabulary plus composition rules can generate previously unstored higher-order structures on demand. This is the first falsifiable proposition the system must test (see §12, Falsification Criteria).

---

## 4. Expression as Measurement

Language is modeled as a measurement of state, not as a set of isolated meaning-containers:

$$E = f(P, R, X, C, H)$$

with $P$ constituent primitives, $R$ relationships among them, $X$ positional information, $C$ context, $H$ transformation history. Consequently order and relation matter:

$$E(A,B) \neq E(B,A)$$

and composition is non-additive:

$$M(A \oplus B) \neq M(A) + M(B), \qquad M(A \oplus_R B) = F\big(M(A), M(B), R, C\big)$$

This gives a precise, testable starting definition for the project's "word math."

---

## 5. Recursive Linguistic Scale

Language is the first experimental domain because it presents observable hierarchical structure end to end:

$$\text{features} \to \text{graphemes} \to \text{morphemes} \to \text{words} \to \text{phrases} \to \text{clauses} \to \text{sentences} \to \text{paragraphs} \to \text{discourse}$$

Every level is simultaneously a **completed object** relative to its children and a **primitive** relative to its parent:

$$X_n = \text{whole}(X_{n-1}), \qquad X_n = \text{part}(X_{n+1})$$

This whole/part duality is the structural backbone the cross-scale claim depends on.

---

## 6. Canonical State Address

Every registered state can carry a full candidate address:

> Planetary-Dimension → Gate → Line → Color → Tone → Base → Degree → Minute → Second → Arc-Second → Zodiac → House

Two things must stay separate:

1. **The addressing architecture itself** — implementable immediately, independent of whether any particular mapping is "true."
2. **The claim that specific linguistic primitives intrinsically occupy specific address positions** — not established, and treated as a hypothesis:

$$H(p_i) = A_j$$

Confidence in a given $H(p_i) = A_j$ is revised by repeated observation, not asserted by design.

---

## 7. Dimensional Hypothesis

The source material describes five dimensional perspectives — Movement, Evolution, Being, Design, Space — with associated qualitative expressions (Movement/Individuality, Evolution/Mind, Being/Body, Design/Ego, Space/Personality) and Base/Tone/Color distinctions.

These five perspectives are **not** flattened into one universal ordering. The working hypothesis is:

$$\text{Representation}(X \mid D_i) \neq \text{Representation}(X \mid D_j)$$

even though both refer to the same underlying $X$ — the object is invariant, its relational expression is not. This is treated as an empirical claim, not a metaphysical one.

---

## 8. Perspective Transformation

$$X^{(D_j)} = T_{i \to j}\big(X^{(D_i)}\big)$$

If the dimensional grammar is valid, these transformations should show consistent mathematical structure — testable via:

- Does the transformation preserve specific invariants?
- Which properties change, which stay fixed?
- Is the original representation recoverable ($T_{j \to i} \circ T_{i \to j} = \text{id}$)?
- Does the same transformation generalize to another scale?

---

## 9. Five Graph Projections

Every addressed state participates in five simultaneous graph projections:

$$G = \{G_K, G_C, G_P, G_T, G_D\}$$

— Knowledge, Causal, Phase, Temporal, Dependency. These are not five copies of one topology: for a state $x$,

$$N_K(x) \neq N_C(x) \neq N_P(x) \neq N_T(x) \neq N_D(x)$$

This formalizes the idea that the same entity has different neighbors depending on which relation is being measured.

---

## 10. Multi-Scale, Multi-Organism Meshes

$$M(x) = \{M_{local},\ M_{personal},\ M_{value},\ M_{scale},\ M_{group}\}$$

A single instance (e.g., a Gate-24 activation) can belong simultaneously to its local configuration, an individual organism, a shared value-mesh, a micro/macro lineage, and an authorized group mesh — propagating qualified state *packets*, not full memory copies.

---

## 11. State Activation

Activation is continuous, not binary:

$$\alpha_a(t) \in [0,1]$$

allowing states to move active → weakening → dormant → reactivated without deleting learned topology. A candidate (not canonical) activation function:

$$\alpha_a(t+1) = \sigma(w_I I + w_R R + w_D D + w_H H - \lambda)$$

Weights and terms are to be fit from observed runtime behavior, not fixed in advance.

---

## 12. Complexity Hypothesis

The Gate-24/Line-4 example raises a concrete quantitative question. One candidate measure:

$$24^4 = 331{,}776$$

with unknown referent — reachable configurations? transformation paths? relational combinations? nothing structurally meaningful? This is recorded explicitly as a hypothesis to be tested against observed runtime quantities:

$$H:\ W(g,l) = g^l$$

rather than allowed to pass silently from metaphor into assumed mathematics.

---

## 13. Complexity Ledger

Every execution logs a measurable tuple:

$$L = (N_p, N_s, N_e, N_o, D_r, A_c, T_c)$$

primitives activated, states generated, edges traversed, operations executed, recursion depth, active automata, transition count. Candidate numerical laws (e.g., §12) are compared against this ledger rather than asserted.

---

## 14. Cross-Scale Invariance (the decisive experiment)

If operator $R$ is discovered at scale $s_1$, test:

$$R_{s_1} \cong R_{s_2}$$

for $s_2 \in \{\text{sentences}, \text{automata}, \text{networks}\}$. Example: if $A \to B$ and $B \to C$ imply a derived dependency $A \rightsquigarrow C$ at the linguistic scale, the same relational law is tested among letters, morphemes, words, clauses, program modules, automata, and network nodes. Operators that repeatedly survive this transfer are the evidence the whole program is built to find.

---

## 15. Operational Definition of Emergence

Without a strict definition, anything unexpected could be labeled "emergent" after the fact. Working definition:

> A structure is emergent when the resulting higher-order configuration was not explicitly stored as a solution, but can be generated from registered lower-order states and permitted operators.

$$Y \notin \text{StoredSolutions}, \qquad Y = F(P, O, C)$$

and $Y$ independently satisfies pre-specified evaluation criteria. This is a stronger bar than "Cynthia produced something unexpected."

---

## 16. Learning

Learning is defined as changing future behavior in response to evidence. Each candidate rule carries:

$$r = (\text{support}, \text{confidence}, \text{error}, \text{provenance})$$

and moves through explicit states: known → observed → inferred → hypothesized → tested → supported → rejected. No generated correspondence is treated as ground truth by default.

---

## 17. Compression as Evidence

If a primitive grammar $G$ plus residual information describes dataset $X$ more compactly than a direct representation —

$$L(G) + L(X \mid G) \ll L(X)$$

— while preserving predictive/generative performance, that is quantitative evidence the primitive system found genuine reusable regularity, rather than an assertion that it did.

---

## 18. Implementation Constraint: Pure JavaScript

The first implementation runs entirely client-side: JavaScript/ES modules, browser storage, browser-native computation. Explicitly excluded at this stage: backend inference, remote databases, external LLMs, MCP, cloud compute, mandatory GPU acceleration.

This is a scoping decision, not a claim that those technologies are without value. It creates a clean boundary:

$$\text{ObservedCapability} \approx \text{CapabilityOfLocalGrammar}$$

MCP and external services can be reintroduced later, with their marginal contribution measured separately against this baseline.

---

## 19. Falsification Criteria

The hypothesis is weakened if any of the following occur:

1. Rules that appear invariant at one scale require unrelated special-case rules at every other scale.
2. Canonical addressing provides no predictive advantage over arbitrary labels.
3. Dimensional mappings fail to outperform reasonable alternative mappings.
4. Generated structures require essentially as much stored information as direct representation (compression test, §17, fails).
5. Supposedly emergent solutions turn out to be encoded beforehand.
6. Learned rules fail systematically on unseen examples.
7. Proposed numerical relationships (e.g., $g^l$, §12) fail to correlate with any measurable runtime quantity.

Negative results are treated as informative: they identify which candidate primitive isn't actually primitive.

---

## 20. Strong Success Criterion

> Pure Synthia receives a structure for which no dedicated solution exists in its source code. It decomposes the input into registered primitives, generates candidate addresses, identifies applicable relational operators, activates an appropriate topology, constructs a higher-order representation, executes a useful transformation, and produces a complete deterministic derivation trace — locally, in JavaScript.

An analogous problem is then presented at a different scale. If essentially the same operator system solves both, that is the first evidence for cross-scale generativity as defined in §14.

---

## 21. Research Sequence

The correspondence to Movement/Being/Design/Space/Evolution, Gate/Line/Color/Tone/Base, Yijing transformations, and automata operations is deliberately tested **last**, not assumed first, to avoid making the correspondence true by construction:

1. Extract linguistic primitives (bottom-up, starting below the letter).
2. Quantify their transformations.
3. Discover recurring operators.
4. Map candidate dimensional correspondences.
5. Assign and test canonical addresses.
6. Scale upward to sentence/discourse level.
7. Test against computation (automata).
8. Test against larger multi-automata systems.

For every candidate primitive, the record kept is:

$$p = (\text{identity}, \text{contrast}, \text{position}, \text{operation}, \text{dependencies}, \text{scale}, \text{candidateDimension}, \text{candidateAddress}, \text{evidence})$$

---

## Appendix A — Phase 1 Preliminary Pass: Sub-Letter Primitive Extraction

This is a first, deliberately small pass at Step 1 of §21 — starting *beneath* the letter, at phonological/distinctive-feature level, without assigning any dimensional or Gate/Line correspondence yet. The goal here is only to establish the primitive record format and show it surviving one level of composition (feature → phoneme → grapheme), not to complete the climb.

### A.1 Candidate feature primitives (English consonant onset, illustrative subset)

| id | identity | contrast (binary feature) | position class | operation | scale | evidence |
|---|---|---|---|---|---|---|
| f.voice | voiced / voiceless | [±voice] | manner-independent | distinguishes /b/ vs /p/, /d/ vs /t/ | sub-phonemic | minimal pairs: bat/pat, din/tin |
| f.place.lab | labial place | [place=labial] | articulation point | distinguishes /p,b,m/ from others | sub-phonemic | minimal pairs: pat/tat/cat |
| f.place.alv | alveolar place | [place=alveolar] | articulation point | distinguishes /t,d,n/ from others | sub-phonemic | minimal pairs: tin/pin/kin |
| f.manner.stop | stop/plosive | [manner=stop] | manner | distinguishes /p,t,k/ from fricatives | sub-phonemic | pat vs fat |
| f.manner.nas | nasal | [manner=nasal] | manner | distinguishes /m,n/ from stops | sub-phonemic | mat vs bat |

### A.2 One level of composition (feature → phoneme)

Using the operator $o_{\text{bundle}}$ (feature bundling under a shared timing slot):

$$/p/ = o_{\text{bundle}}(f.\text{place.lab},\ f.\text{manner.stop},\ \lnot f.\text{voice})$$
$$/b/ = o_{\text{bundle}}(f.\text{place.lab},\ f.\text{manner.stop},\ f.\text{voice})$$

This already exhibits the whole/part duality from §5: the feature bundle is a *completed* object (a phoneme) relative to its features, and a *primitive* relative to the grapheme/morpheme level above it — exactly the $X_n = \text{whole}(X_{n-1})$, $X_n = \text{part}(X_{n+1})$ relation the cross-scale claim depends on.

### A.3 What this pass does *not* do

- No candidate address ($H(p_i) = A_j$) is assigned to any feature above.
- No dimensional label (Movement/Being/Design/etc.) is attached.
- No claim is made that this feature set is complete — only that it is falsifiable (e.g., prediction: any primitive that fails to recur as a *contrastive* unit at the morpheme level, per §14, should be flagged as non-primitive and dropped).

### A.4 Immediate next steps for Phase 1

1. Extend the table through the full English consonant/vowel inventory using the same record schema.
2. Implement `o_bundle` and a second operator, `o_sequence` (ordered concatenation with positional index, per §4's $E(A,B) \neq E(B,A)$), as the first two entries in the operator set $O$.
3. Run the compression test (§17) on a small corpus: does $L(G) + L(X \mid G)$ beat naive letter-frequency encoding?
4. Only after (1)–(3) produce stable, repeated evidence, proceed to morpheme-level extraction (Step 1 of §21 continues upward).

---

## Appendix B — Formal Hypothesis Registry

Pure Synthia distinguishes architectural mechanisms from empirical hypotheses. A mechanism may exist in the implementation without implying that the scientific hypothesis associated with it is correct.

For every hypothesis $H_i$, the system records:

$$H_i = (\text{claim},\ \text{null},\ \text{metric},\ \text{test},\ \text{threshold},\ \text{evidence},\ \text{status})$$

Permitted evidence states:

$$\text{unobserved} \to \text{observed} \to \text{inferred} \to \text{hypothesized} \to \text{tested} \to \{\text{supported},\ \text{rejected},\ \text{inconclusive}\}$$

### B.1 H1 — Recursive Generativity

**Hypothesis.** A finite primitive vocabulary $P$ and finite operator vocabulary $O$ can generate valid higher-order structures that were not explicitly stored.

$$Y \notin \text{StoredSolutions}, \qquad Y = F(P,O,C)$$

**Null hypothesis.** Successful generation requires dedicated representations or rules whose stored complexity grows approximately with the complexity of the target structures.

Evidence for H1 requires both successful generation *and* verification that the resulting structure was not encoded beforehand.

### B.2 H2 — Cross-Scale Operator Invariance

**Hypothesis.** At least some discovered operators retain structurally equivalent behavior when their operands are replaced by objects from another scale.

$$R_{s_i} \cong R_{s_j}$$

The claim concerns the operator/relational structure, not necessarily the identity of the operands — a feature need not itself reappear as a morpheme, word, sentence, or automaton for an operator acting *on* features to exhibit cross-scale invariance.

### B.3 H3 — Address Utility

**Hypothesis.** Canonical recursive addresses provide measurable predictive, generative, retrieval, compression, or transformation advantages over suitable control-address systems.

$$\text{Performance}(A_{\text{candidate}}) > \text{Performance}(A_{\text{control}})$$

Controls include random addresses, shuffled addresses, flat identifiers, and reduced hierarchical addresses. Failure to beat these controls weakens the claim that the candidate address carries useful structural information.

### B.4 H4 — Dimensional Correspondence

**Hypothesis.** Candidate mappings involving Movement, Evolution, Being, Design, and Space explain or predict measurable structure better than reasonable alternative mappings.

The dimensional system must compete against null models rather than being evaluated only internally. A correspondence is not supported merely because Pure Synthia can represent it.

### B.5 H5 — Compression

**Hypothesis.** Reusable primitives and operators provide a shorter representation of observed structures without unacceptable loss of reconstruction or predictive performance.

$$L(G) + L(X \mid G) < L(X)$$

Compression alone is insufficient if the resulting grammar loses structure required by the task.

### B.6 H6 — Candidate Numerical Laws

Any proposed numerical relationship is registered before interpretation. For example:

$$H_6:\ W(g,l) = g^l$$

does not initially specify what $W$ represents. Candidate referents — reachable states, paths, compositions, transformations, or other runtime quantities — must be measured independently. A numerical coincidence is not evidence unless the relationship generalizes beyond the example that produced it.

---

## Appendix C — Formal Object Model

Pure Synthia distinguishes primitive, composite, operator, address, relation, observation, and derivation as separate computational objects.

### C.1 Primitive

$$p = (i, c, x, o, d, s, D, A, e)$$

$i$ identity · $c$ contrast · $x$ position · $o$ operations the primitive participates in · $d$ dependencies · $s$ native scale · $D$ candidate dimensional correspondence · $A$ candidate canonical address · $e$ evidence.

$D$ and $A$ are nullable — their absence does not prevent a primitive from participating in generation.

### C.2 Primitive Locality

A primitive may be scale-local:

$$p \in P_{s_i} \not\Rightarrow p \in P_{s_j}$$

Cross-scale invariance does **not** require identical primitive inventories at every level. Instead, Pure Synthia tests whether

$$O_{s_i} \cong O_{s_j}$$

or whether other relational invariants survive the change of operand scale. This keeps cross-scale generativity from being defined so strongly that valid scale-specific primitives get incorrectly rejected.

### C.3 Composite

A composite is generated by applying one or more registered operators:

$$X = o(p_1, \ldots, p_n \mid C)$$

Every composite records its children and derivation, so:

$$X_n = \text{whole}(X_{n-1}), \qquad X_n = \text{part}(X_{n+1})$$

A generated composite can become an operand for subsequent operations without losing its internal derivation.

### C.4 Operator

$$o = (i, a, I, P, T, V, O^{-1}, s, e)$$

$i$ identity · $a$ arity · $I$ admissible input constraints · $P$ positional rules · $T$ transformation · $V$ preserved invariants · $O^{-1}$ inverse (when one exists) · $s$ scales on which it has been observed · $e$ evidence.

The first two candidate operators:

$$o_{\text{bundle}} \quad \text{(simultaneous feature composition)}, \qquad o_{\text{sequence}} \quad \text{(ordered composition)}$$

with

$$o_{\text{sequence}}(A,B) \neq o_{\text{sequence}}(B,A)$$

unless an independently discovered symmetry demonstrates otherwise.

---

## Appendix D — Derivation and Provenance

Generation must remain inspectable. Every output carries a derivation object:

$$\Delta(Y) = (I, P, O, R, C, T, Y, E)$$

— original input, primitive decomposition, operators selected, relations traversed, contextual constraints, intermediate transformations, generated output, evaluation evidence.

Minimal computational path:

$$\boxed{\text{Input} \to \text{Decomposition} \to \text{Primitive Resolution} \to \text{Operator Selection} \to \text{Topology Activation} \to \text{Composition} \to \text{Transformation} \to \text{Output} \to \text{Evaluation}}$$

No generated result counts as evidence for emergence unless this path can be reconstructed.

### D.1 Deterministic Replay

Given equivalent initial state, input, context, grammar version, and operator set:

$$F(S_t, I_t, C_t, G_v, O_v) = F(S_t, I_t, C_t, G_v, O_v)$$

Pure Synthia must reproduce the same derivation. This distinguishes generative *novelty* from runtime *randomness* — a structure can be novel relative to stored solutions while remaining deterministically reproducible.

---

## Appendix E — Controls and Ablation Experiments

Producing interesting structures does not by itself establish which mechanisms caused that capability. Given complete system $S$, construct:

$$S^{-p_i}, \quad S^{-o_i}, \quad S^{-A}, \quad S^{-D}, \quad S^{-G_k}$$

removing, respectively: primitive $p_i$, operator $o_i$, canonical addressing, dimensional correspondence, graph projection $G_k$. Then measure:

$$\Delta\text{Performance} = \text{Performance}(S) - \text{Performance}(S^{-x})$$

This gives an operational meaning to whether a proposed component has earned its keep — a mechanism whose removal produces no reproducible degradation is not assumed necessary merely because it fits the theoretical model.

---

## Appendix F — Pure Synthia Experimental Boundary

$$\boxed{\text{Observed Input} \to \text{Primitive Extraction} \to \text{Operator Application} \to \text{Recursive Composition} \to \text{Derivation} \to \text{Evaluation}}$$

Outside the initial causal boundary: LLM inference, remote knowledge, external embeddings, cloud computation, untraceable learned models. These may later be introduced individually as experimental conditions. If external component $X$ is introduced, its marginal contribution is measured:

$$\Delta_X = \text{Performance}(S+X) - \text{Performance}(S)$$

so later integration does not silently overwrite the browser-native baseline.

---

## Appendix G — Separation of Calculus and Applications

The calculus concerns:

$$\text{states} + \text{relations} + \text{operators} + \text{context} + \text{recursion} + \text{transformation}$$

Applications built on it (classifiers, forecasts, behavioral scores, interfaces, etc.) are a separate experimental layer. Outputs are not automatically probabilities merely because they are normalized to $[0,1]$. For a score $q(X)$ to be interpreted empirically as a probability of outcome $Y$, calibration must establish, on data not used to construct the scoring rule:

$$P(Y=1 \mid q(X) \approx p) \approx p$$

This separation lets Pure Synthia investigate semantic or behavioral applications without requiring the underlying calculus to assume those applications are true.

---

## Appendix H — Experimental Protocol, Benchmark Datasets, and Measurements

Pure Synthia requires experiments that distinguish generation from storage, discovered structure from imposed structure, and cross-scale regularity from coincidental similarity. The experimental protocol evaluates each major hypothesis independently before combining them.

### H.1 Experimental Principle

For system configuration $S$, dataset $X$, and evaluation function $Q$:

$$E(S,X) = Q\big(S(X)\big)$$

Every reported experiment records:

$$E = (\text{id}, \text{hypothesis}, \text{dataset}, \text{split}, \text{configuration}, \text{seed}, \text{grammarVersion}, \text{metrics}, \text{derivations}, \text{result})$$

Although the initial automaton is deterministic, a seed field is retained for control experiments involving randomized mappings, shuffled addresses, or generated null models. Every result must be reproducible from its recorded experimental configuration.

### H.2 Experimental Levels

Testing proceeds upward through the same hierarchy the system attempts to generate:

$$L_0: \text{features} \quad L_1: \text{phonemes/graphemes} \quad L_2: \text{morphemes} \quad L_3: \text{words}$$
$$L_4: \text{phrases/clauses} \quad L_5: \text{sentences} \quad L_6: \text{discourse} \quad L_7: \text{automata} \quad L_8: \text{multi-automata systems}$$

Success at $L_n$ does not imply success at $L_{n+1}$. Each level must independently establish: (1) adequate primitive representation, (2) useful operator behavior, (3) deterministic reconstruction, (4) generalization to held-out structures, (5) compression where applicable, (6) provenance completeness. Cross-scale claims are evaluated only after useful behavior has independently been demonstrated at multiple levels.

### H.3 Dataset Classes

**H.3.1 Synthetic Formal Dataset.** Generated from known finite grammars — balanced delimiters, recursively nested expressions, deterministic rewrite systems, finite-state sequences, compositional symbol grammars, dependency chains, reversible transformations. Because the true generating grammar $G^*$ is known, this dataset establishes whether Pure Synthia can recover or approximate it. Compare discovered grammar $\hat{G}$:

$$G^* \leftrightarrow \hat{G}$$

using structural equivalence rather than requiring identical internal names. This is the primary ground-truth control.

**H.3.2 Linguistic Dataset.** Progressively structured linguistic observations, deliberately small and inspectable at first: phonological feature inventories, phoneme contrasts, grapheme sequences, inflectional morphemes, morphologically related word families, short phrases, controlled sentences, short discourse sequences. Each observation includes an independently supplied structural annotation. The system must not use test annotations during primitive/operator discovery.

**H.3.3 Computational Dataset.** Finite-state machines, transition tables, expression trees, dependency graphs, small deterministic programs, cellular automata traces, compositions of smaller automata. The purpose is not to show the engine can represent computation — it's to test whether operators discovered in linguistic experiments transfer without being rewritten specifically for computational objects.

**H.3.4 Cross-Scale Transfer Dataset.** The decisive benchmark: paired problems sharing a relational structure while differing in operands. For example, $A \to B,\ B \to C$ may appear as feature dependencies, morpheme dependencies, sentence dependencies, program-module dependencies, or automaton transitions — operand identities differ, the candidate relational operator stays fixed:

$$R(X_{s_1}) \to R(X_{s_2})$$

without modifying $R$ solely because the scale changed.

### H.4 Discovery / Validation / Test Separation

$$X = X_{\text{discovery}} \cup X_{\text{validation}} \cup X_{\text{test}}$$

Discovery permits primitive/operator discovery. Validation permits selection among already-generated candidate rules. Test measures final generalization and cannot modify the grammar being evaluated:

$$G_{\text{test-start}} = G_{\text{test-end}}$$

for experiments intended to measure fixed-grammar generalization. Separate online-learning experiments may permit adaptation during evaluation, but must be labeled accordingly.

### H.5 Unseen Composition Test

Given $A, B, C \in X_{\text{discovery}}$ but $o(A, o(B,C)) \notin X_{\text{discovery}}$, Pure Synthia receives the unseen composition during testing. Success requires $Y_{\text{generated}} = Y_{\text{expected}}$ under the predefined equivalence criterion, while demonstrating $Y_{\text{expected}} \notin \text{StoredSolutions}$. This directly tests §15's operational definition of emergence.

### H.6 Cross-Scale Holdout Test

Suppose operator $o$ is discovered on $S_{\text{observed}} = \{L_0, L_1, L_2, L_3\}$ and evaluated without modification on $S_{\text{heldout}} = \{L_7\}$. Then $\text{Transfer}(o, L_7)$ measures whether the operator generalizes structurally to automata. An operator requiring scale-specific replacement is not counted as invariant.

### H.7 Baseline Systems

- **Flat Lookup** — $B_{\text{lookup}}(X) = \text{memorized result}$; a storage-heavy baseline.
- **Frequency Baseline** — predicts using empirical component/transition frequencies, no recursive composition.
- **Random Grammar** — approximately same grammar size, randomized rule relationships.
- **Shuffled Structure** — preserves primitives, permutes positional/relational information.
- **Reduced Grammar** — removes selected primitives/operators.

These controls answer: *is Pure Synthia succeeding because of the proposed structure, or merely because it contains enough information to reproduce the observations?*

### H.8 Core Measurements

Every experiment records the Complexity Ledger from §13, $L = (N_p, N_s, N_e, N_o, D_r, A_c, T_c)$, plus:

- **Generation Accuracy** — $\text{Acc} = N_{\text{correct generated}} / N_{\text{test}}$ (correctness defined before running).
- **Reconstruction Accuracy** — $\text{Rec}(X) = \text{Similarity}(X, \text{Compose}(\text{Decompose}(X)))$; exact symbolic domains use exact equality where possible.
- **Novel Composition Rate** — $\text{NCR} = N_{\text{correct outputs not stored}} / N_{\text{correct outputs}}$; distinguishes generation from retrieval.
- **Operator Reuse** — $\text{Reuse}(o) = |\{s : o \text{ successfully operates at scale } s\}|$; a stronger weighted version counts successful held-out applications rather than mere registered compatibility.
- **Special-Case Burden** — $\text{SCB} = N_{\text{scale-specific rules}} / N_{\text{successful transformations}}$; a growing SCB weakens the cross-scale invariance hypothesis.

### H.9 Compression Measurements

Compare $L_{\text{direct}}(X)$ against $L(G) + L(X \mid G)$. Compression gain:

$$CG = 1 - \frac{L(G) + L(X \mid G)}{L_{\text{direct}}(X)}$$

$CG > 0$ indicates compression relative to the selected baseline. The encoding scheme used to calculate description length must be fixed before comparison and reported with the result.

### H.10 Address Evaluation

Candidate canonical addresses are evaluated against $A_{\text{random}}, A_{\text{shuffled}}, A_{\text{flat}}, A_{\text{reduced}}$. For metric $M$:

$$\Delta_A = M(A_{\text{candidate}}) - M(A_{\text{control}})$$

Candidate addressing earns support only when advantages reproduce on held-out observations. Representational richness alone is not evidence.

### H.11 Dimensional Mapping Evaluation

Let $D^*$ be the proposed mapping and $D_1, \ldots, D_n$ alternative or permuted mappings. Evaluate $M(D^*)$ against $\{M(D_1), \ldots, M(D_n)\}$ on predefined generative, predictive, compression, or transformation tasks. The mapping is supported only to the extent its observed advantage exceeds the relevant controls.

### H.12 Ablation Measurement

For component $x$: $\text{AblationImpact}(x) = M(S) - M(S^{-x})$. Components include individual primitives, individual operators, graph projections, history, context, position, canonical addressing, dimensional mappings. This produces an empirical importance map of the architecture.

### H.13 Derivation Integrity

$$DI = \frac{N_{\text{outputs with reproducible complete derivations}}}{N_{\text{generated outputs}}}$$

The strong success criterion requires $DI = 1$ for outputs presented as deterministic Pure Synthia derivations.

### H.14 Runtime Measurements

Execution time, peak state count, active-state count, recursion depth, operator applications, graph traversals, serialized grammar size, browser-storage consumption. For input size $n$, empirical scaling $T(n)$, $M(n)$ is measured rather than assumed from architecture alone.

### H.15 Experiment Manifest

$$\text{Manifest} = (\text{version}, \text{dataset}, \text{split}, \text{grammar}, \text{operators}, \text{controls}, \text{metrics}, \text{results}, \text{derivations})$$

A published result without its manifest and deterministic derivation data is considered incomplete.

### H.16 Minimum Phase-1 Benchmark

Before progressing to dimensional or canonical-address experiments, Phase 1 must demonstrate: (1) feature representation, (2) `o_bundle`, (3) `o_sequence`, (4) deterministic decomposition/composition, (5) held-out reconstruction, (6) at least one unseen-composition test, (7) complexity-ledger collection, (8) compression comparison, (9) operator ablation, (10) deterministic replay. This creates the first experimental gate:

$$\text{Phase}_1 \xrightarrow{\text{pass}} \text{Phase}_2$$

Failure does not terminate the research program; it identifies which primitives, operators, or assumptions require revision.

---

## Appendix I — Pure JavaScript Reference Architecture

The browser implementation maps the mathematical specification onto explicit ES-module objects. Architectural convenience must not silently alter the research ontology. The initial implementation requires no server:

$$\boxed{\text{Browser} = \text{Runtime} + \text{Experiment Laboratory} + \text{Storage} + \text{Visualization}}$$

### I.1 Architecture

```
Pure Synthia
│
├── core/
│   ├── primitive.js
│   ├── composite.js
│   ├── operator.js
│   ├── relation.js
│   ├── address.js
│   ├── state.js
│   └── evidence.js
│
├── grammar/
│   ├── grammar.js
│   ├── registry.js
│   └── discovery.js
│
├── operators/
│   ├── bundle.js
│   ├── sequence.js
│   └── registry.js
│
├── graph/
│   ├── graph.js
│   ├── knowledge.js
│   ├── causal.js
│   ├── phase.js
│   ├── temporal.js
│   └── dependency.js
│
├── engine/
│   ├── decompose.js
│   ├── resolve.js
│   ├── activate.js
│   ├── compose.js
│   ├── transform.js
│   └── synthia.js
│
├── derivation/
│   ├── derivation.js
│   ├── ledger.js
│   └── replay.js
│
├── hypotheses/
│   ├── hypothesis.js
│   └── registry.js
│
├── experiments/
│   ├── experiment.js
│   ├── controls.js
│   ├── ablation.js
│   ├── metrics.js
│   └── manifest.js
│
├── datasets/
│   ├── loader.js
│   ├── synthetic/
│   ├── linguistic/
│   └── computational/
│
├── storage/
│   ├── indexed-db.js
│   └── serializer.js
│
├── ui/
│   ├── inspector.js
│   ├── graph-view.js
│   ├── derivation-view.js
│   └── experiment-view.js
│
└── main.js
```

### I.2 Primitive Mapping

The mathematical primitive $p = (i,c,x,o,d,s,D,A,e)$ maps directly to:

```javascript
// src/core/primitive.js

export class Primitive {
  constructor({
    id,
    identity,
    contrast,
    position,
    operations = [],
    dependencies = [],
    scale,
    candidateDimension = null,
    candidateAddress = null,
    evidence = [],
  }) {
    if (!id || !identity || !scale) {
      throw new TypeError("Primitive requires id, identity, and scale.");
    }

    this.id = id;
    this.identity = identity;
    this.contrast = contrast;
    this.position = position;
    this.operations = Object.freeze([...operations]);
    this.dependencies = Object.freeze([...dependencies]);
    this.scale = scale;
    this.candidateDimension = candidateDimension;
    this.candidateAddress = candidateAddress;
    this.evidence = Object.freeze([...evidence]);

    Object.freeze(this);
  }
}
```

A primitive is immutable. Learning does not silently mutate historical primitive records — revised evidence creates a new versioned record.

### I.3 Composite Mapping

$X = o(X_1, \ldots, X_n \mid C)$ maps to a composite containing its children and derivation reference:

```javascript
// src/core/composite.js

export class Composite {
  constructor({
    id,
    scale,
    children,
    operatorId,
    context = {},
    derivationId,
  }) {
    if (!id || !scale || !operatorId || !derivationId) {
      throw new TypeError(
        "Composite requires id, scale, operatorId, and derivationId.",
      );
    }

    if (!Array.isArray(children) || children.length === 0) {
      throw new TypeError("Composite requires at least one child.");
    }

    this.id = id;
    this.scale = scale;
    this.children = Object.freeze([...children]);
    this.operatorId = operatorId;
    this.context = Object.freeze({ ...context });
    this.derivationId = derivationId;

    Object.freeze(this);
  }
}
```

A composite can subsequently satisfy an operator's input contract and therefore become a primitive relative to the next compositional level.

### I.4 Operator Mapping

The mathematical operator $o = (i,a,I,P,T,V,O^{-1},s,e)$ becomes an executable object:

```javascript
// src/core/operator.js

export class Operator {
  constructor({
    id,
    arity,
    accepts,
    transform,
    positionalRule = null,
    invariants = [],
    inverseId = null,
    scales = [],
    evidence = [],
  }) {
    if (!id || !Number.isInteger(arity) || arity < 1) {
      throw new TypeError("Operator requires id and positive integer arity.");
    }

    if (typeof accepts !== "function" || typeof transform !== "function") {
      throw new TypeError(
        "Operator requires accepts and transform functions.",
      );
    }

    this.id = id;
    this.arity = arity;
    this.accepts = accepts;
    this.transform = transform;
    this.positionalRule = positionalRule;
    this.invariants = Object.freeze([...invariants]);
    this.inverseId = inverseId;
    this.scales = Object.freeze([...scales]);
    this.evidence = Object.freeze([...evidence]);
  }

  apply(operands, context = {}) {
    if (!Array.isArray(operands) || operands.length !== this.arity) {
      throw new RangeError(
        `${this.id} requires exactly ${this.arity} operands.`,
      );
    }

    if (!this.accepts(operands, context)) {
      throw new TypeError(`Operands rejected by ${this.id}.`);
    }

    return this.transform(operands, context);
  }
}
```

### I.5 `o_bundle`

Feature bundling is the first concrete operator: $o_{\text{bundle}}(p_1, \ldots, p_n) \to X$. The implementation must preserve the identities of all constituents rather than replacing them with an opaque label.

### I.6 `o_sequence`

Sequence explicitly preserves order: $o_{\text{sequence}}(A,B) \neq o_{\text{sequence}}(B,A)$. Its generated representation contains positional indexes:

```javascript
{
  operator: "o_sequence",
  members: [
    { position: 0, stateId: "A" },
    { position: 1, stateId: "B" }
  ]
}
```

Position is part of the generated state, not UI metadata.

### I.7 Canonical Address Object

The candidate address from §6 is represented independently from the primitive:

```javascript
// src/core/address.js

export class CanonicalAddress {
  constructor({
    planetaryDimension = null,
    gate = null,
    line = null,
    color = null,
    tone = null,
    base = null,
    degree = null,
    minute = null,
    second = null,
    arcSecond = null,
    zodiac = null,
    house = null,
  } = {}) {
    Object.assign(this, {
      planetaryDimension,
      gate,
      line,
      color,
      tone,
      base,
      degree,
      minute,
      second,
      arcSecond,
      zodiac,
      house,
    });

    Object.freeze(this);
  }
}
```

The architecture supports addresses without requiring the scientific hypothesis concerning those addresses to be accepted.

### I.8 Five Graph Projections

```javascript
const projections = {
  knowledge: new Graph("knowledge"),
  causal: new Graph("causal"),
  phase: new Graph("phase"),
  temporal: new Graph("temporal"),
  dependency: new Graph("dependency"),
};
```

Edges are projection-specific:

```javascript
{
  from: "state:A",
  to: "state:B",
  graph: "dependency",
  relation: "requires",
  evidenceId: "evidence:104"
}
```

$N_K(x), N_C(x), N_P(x), N_T(x), N_D(x)$ are calculated independently.

### I.9 State Activation

```javascript
// src/core/state.js

export class RuntimeState {
  constructor(stateId, activation = 0) {
    this.stateId = stateId;
    this.activation = Math.max(0, Math.min(1, activation));
    this.history = [];
  }

  updateActivation(nextActivation, timestamp) {
    this.history.push({
      timestamp,
      previous: this.activation,
      next: nextActivation,
    });

    this.activation = Math.max(0, Math.min(1, nextActivation));
  }
}
```

This separation permits a state to become dormant without destroying its learned topology.

### I.10 Evidence Object

```javascript
{
  id: "evidence:104",
  kind: "observed",
  source: "phase1:minimal-pairs",
  supports: ["f.voice"],
  contradicts: [],
  experimentId: "experiment:phase1-004",
  timestamp: 1740000000000
}
```

### I.11 Hypothesis Registry

```javascript
{
  id: "H4",
  claim: "Candidate dimensional mapping outperforms controls.",
  status: "hypothesized",
  metrics: [],
  supportingEvidence: [],
  contradictingEvidence: []
}
```

No module should contain logic equivalent to `candidateMapping.isTrue = true;` — support must derive from experiments.

### I.12 Pure Synthia Execution Engine

```javascript
// src/engine/synthia.js

export class SynthiaEngine {
  constructor({
    primitiveRegistry,
    operatorRegistry,
    graphs,
    ledger,
  }) {
    this.primitives = primitiveRegistry;
    this.operators = operatorRegistry;
    this.graphs = graphs;
    this.ledger = ledger;
  }

  execute(input, context = {}) {
    const decomposition = this.decompose(input, context);
    const primitives = this.resolve(decomposition, context);
    const operators = this.selectOperators(primitives, context);
    const topology = this.activateTopology(primitives, context);

    const result = this.compose({
      primitives,
      operators,
      topology,
      context,
    });

    return this.createDerivation({
      input,
      decomposition,
      primitives,
      operators,
      topology,
      result,
      context,
    });
  }
}
```

The important architectural property is $\text{execute}(X) \to \Delta(Y)$, rather than merely $\text{execute}(X) \to Y$. The derivation is the primary result; the generated value is contained within it.

### I.13 Complexity Ledger

```javascript
{
  primitivesActivated: 14,
  statesGenerated: 6,
  edgesTraversed: 19,
  operationsExecuted: 8,
  recursionDepth: 3,
  activeAutomata: 1,
  transitionCount: 11
}
```

Maps directly onto $L = (N_p, N_s, N_e, N_o, D_r, A_c, T_c)$ and provides the measurements against which candidate numerical laws are evaluated.

### I.14 Deterministic Replay

```javascript
{
  engineVersion: "0.1.0",
  grammarVersion: "phase1.3",
  operatorVersion: "phase1.2",
  input: "...",
  context: {},
  steps: [],
  output: {}
}
```

Replay reconstructs the computation from these inputs. The replay engine must compare:

$$\text{Hash}(\Delta_{\text{original}}) = \text{Hash}(\Delta_{\text{replayed}})$$

for deterministic experiments.

### I.15 Browser Storage

Persistence uses IndexedDB rather than a remote database:

```
pure-synthia
├── primitives
├── composites
├── operators
├── relations
├── addresses
├── evidence
├── hypotheses
├── grammars
├── derivations
├── experiments
├── manifests
└── datasets
```

Large datasets may be imported as experimental resources, but the runtime remains locally inspectable.

### I.16 Experimental Runner

```javascript
const result = await experimentRunner.run({
  hypothesis: "H2",
  dataset: "cross-scale-001",
  discoverySplit: "discovery",
  validationSplit: "validation",
  testSplit: "test",
  controls: [
    "flat-lookup",
    "random-grammar",
    "shuffled-structure",
  ],
  metrics: [
    "generationAccuracy",
    "novelCompositionRate",
    "operatorReuse",
    "specialCaseBurden",
    "compressionGain",
    "derivationIntegrity",
  ],
});
```

There is no separate "demo engine" permitted to bypass experimental constraints.

### I.17 Architectural Dependency Rule

Dependencies flow inward:

$$UI \to \text{Experiments} \to \text{Engine} \to \text{Grammar} \to \text{Core}$$

The core cannot depend upon UI, visualization, Human-Design mappings, datasets, or experiment-specific code. This makes it possible to remove $UI, D, A$ without destroying the underlying state calculus — an architectural property required by the ablation tests in Appendix E.

### I.18 Phase-1 Implementation Order

$$\boxed{\text{Primitive} \to \text{Operator} \to o_{\text{bundle}} \to o_{\text{sequence}} \to \text{Composite} \to \text{Derivation} \to \text{Ledger} \to \text{Replay} \to \text{Dataset} \to \text{Experiment} \to \text{Metrics} \to \text{Ablation}}$$

Only after this baseline passes Appendix H's Phase-1 gate should implementation proceed to:

$$\text{Graphs} \to \text{Addresses} \to \text{Dimensions} \to \text{Meshes} \to \text{CrossScaleAutomata}$$

This ordering preserves the central experimental principle of the proposal:

> Pure Synthia should discover evidence for the richer architecture rather than receive that evidence from the architecture itself.

---

## Appendix J — Source Dimensional Table (Unassigned Reference Data)

**Status: reference data only. No entry in this appendix is linked to any primitive, operator, or address. Per §21, dimensional correspondence is tested last, only after primitives and operators have been extracted independently (Appendix A onward) — nothing here is permitted to seed or bias that extraction.**

The table below is transcribed verbatim in structure (not content-copied from any external copyrighted source — this is the user's own working material) from the source specification's five-dimension chart: a macrocosmic chain and a paired microcosmic chain per dimension, each ending in a one-word keynote.

| Dimension (Macrocosmic) | Chain | Dimension (Microcosmic) | Chain | Keynote |
|---|---|---|---|---|
| Movement | Energy → Creation → Seeing → Landscape → Environment | Individuality | Activity → Reaction → Limitation → Perspective → Relation | "I Define" |
| Evolution | Gravity → Memory → Taste → Love → Light | The Mind | Character → Separation → Nature → Integration → Spirit | "I Remember" |
| Being | Matter → (Matter) → Touch → Sex → Survival | The Body | Biology → Chemistry → Objectivity → Geometry → Trajectory | "I Am" |
| Design | Structure → Progress → Smelt → Life → Art | The Ego | Homo Sapiens → Growth → Decay → Continuity → Manifestation | "I Design" |
| Space | Form → Illusion → Hearing → Music → Freedom | Personality | Type → Fantasy → Subjectivity → Rhythm → Timing | "I Think" |

### J.1 Formal record shape

Each row is stored as an inert `CandidateDimension` record — deliberately **not** a `Primitive` (Appendix C.1), because it has no `contrast`, no `position` relative to any operator, and no observed `scale`. Giving it those fields prematurely would make it eligible for composition before any evidence exists:

$$CD_i = (\text{macroName}, \text{macroChain}, \text{microName}, \text{microChain}, \text{keynote})$$

This is intentionally a *weaker* structure than $p = (i,c,x,o,d,s,D,A,e)$ (§C.1). A `CandidateDimension` becomes eligible to populate some primitive's $D$ field only after H.4 (§B.4) is run and the mapping beats its null-model controls (H.11) — not before.

### J.2 Explicit non-claims

Recording this table makes none of the following true, and none should be assumed true elsewhere in this document as a result of J being present:

1. That the five macrocosmic chains correspond to any linguistic scale in §5.
2. That the keynotes ("I Define," "I Remember," "I Am," "I Design," "I Think") correspond to any operator in Appendix C.4.
3. That the pairing of macrocosmic and microcosmic columns reflects the whole/part relation of §5 ($X_n = \text{whole}(X_{n-1})$) — the source material's own pairing is a separate, unverified claim in its own right and is logged as such, not adopted.

---

## Appendix K — D2 Preregistered Experimental Contract (Not Yet Executed)

**Status: proposal only. Nothing in this appendix has been run. No dataset file, engine code, or test exists for D2 yet — this is the contract a D2 implementation increment would be held to, written and frozen before that code is written.**

Per explicit instruction, this contract incorporates **no** dimensional, Human Design, I Ching, or Appendix J source-table content. D2 is a linguistic-scale extension of D1 only ($L_1 \to L_2$, phonemes → morphemes, §H.2), reusing exactly the primitive/operator/derivation machinery already frozen in D1's sealed artifact.

### K.1 Scope

D2 tests whether operators validated at D1 ($o_{\text{bundle}}$, and — for the first time end-to-end through `SynthiaEngine` — $o_{\text{sequence}}$) continue to behave correctly one scale up, on morphemes built from D1-tier phonemes. It does **not** test whether new operators are needed. If D2 requires a new operator to succeed, that is itself a result (evidence against unmodified cross-scale reuse, §14/§B.2), not a reason to add one silently.

### K.2 Dataset (D2)

- **Unit:** a small, hand-built set of English morphemes, each defined as an ordered sequence of D1-tier phonemes, reusing the exact `f.*` feature primitives and `goldPhonemes` already sealed in D1 — no new phoneme inventory in this first pass.
- **Proposed size:** 12 morphemes minimum, enough to hold out at least 2 while keeping every phoneme/feature used at least twice in discovery — the same "components seen, composition withheld" shape as A-D1-03, re-derived for this tier rather than reused verbatim.
- **Gold annotation:** ordered phoneme sequence, e.g. `cat = [k, æ, t]`. This requires either (a) a small new vowel inventory, or (b) restricting D2.0 to consonant-only morphemes/affixes (`un-`, `-ing`, `-ed`) spellable from D1's existing 10 consonants. **Recommendation: option (b) for D2.0**, so the increment tests operator reuse without simultaneously testing a new primitive inventory — conflating the two would make any failure hard to attribute (§19).
- **Split:** discovery/test, disjoint, exact assignment fixed and disclosed in `ASSUMPTIONS.md` *before* D2 code is written, not derived after a first look at results.

### K.3 Operators under test

- $o_{\text{sequence}}$ — implemented and unit-tested in Phase 1 (§I.6), but never yet run through a full `SynthiaEngine.execute()`. D2.0's first job is closing that gap.
- $o_{\text{bundle}}$ — reused unmodified from D1, inside each morpheme's phoneme construction, to confirm §C.3's whole/part duality actually composes across two stacked operator applications (bundle → sequence), not just within one.

### K.4 Hypotheses under test

- **H2 (§B.2), scoped:** does $o_{\text{sequence}}$ produce correct, order-sensitive morpheme structures at $L_2$ without modification?
- **H1 (§B.1), scoped:** do held-out morphemes (components seen, ordering withheld) reconstruct correctly and without matching any stored D2-discovery derivation — the direct D2 analogue of H-D1-01.

### K.5 Metrics (unchanged from D1, §H.8)

`generationAccuracy`, `novelCompositionRate`, computed identically to `reconstruction.js`'s existing implementation — only the dataset and operator differ.

### K.6 Compression (H.9)

Same fixed two-part scheme as D1 (A-D1-04), extended with a position-cost term: for a sequence of length $\ell$ over $n$ phonemes, $L(X\mid G)$ must additionally charge $\ell \cdot \lceil\log_2 n\rceil$ bits for ordering (D1 charged zero ordering bits, since bundling is order-insensitive by design). This term must be written into the D2 compression module *before* any D2 numbers are computed — exactly as D1's scheme was fixed before A-D1-04's numbers were run.

### K.7 Ablation (H.12)

- Remove $o_{\text{sequence}}$ entirely — predicted total failure (`AblationImpact = 1.0`), mirroring D1's operator-removal result.
- Remove individual phonemes used by held-out morphemes — predicted proportional impact, mirroring D1's feature-removal pattern.
- Remove positional information itself — replace $o_{\text{sequence}}$'s position-tagged output with an unordered bundle of the same morphemes' phonemes, and measure whether that alone still reconstructs the correct morpheme (predicted: it will not, for any morpheme whose phoneme sequence isn't uniquely recoverable from an unordered multiset — e.g. any morpheme with a repeated phoneme). This is the genuine position-information ablation D1 could not perform (A-D1-05).

### K.8 Explicit exclusions

D2 does not introduce, test, reference, or numerically compare against anything in Appendix J. No morpheme, phoneme, feature, or operator in D2 is assigned a `candidateDimension`. A future contract to test H4 (§B.4) against Appendix J must be separately preregistered and run only after D2 (and ideally D3+) independently produce a stable operator/primitive inventory — §21's sequencing, restated here as a hard constraint for D2, not a preference.

### K.9 Gate

D2 is complete only when its own H.16-style checklist (feature/morpheme representation, both operators, deterministic composition, held-out reconstruction, unseen-composition test, ledger collection, compression comparison, ablation, deterministic replay) is satisfied and sealed the same way D1 was — `D2-SEALED.json`, identical manifest-hash discipline.

---

*Status: full specification, Abstract through Appendix K. D1 tier is now sealed as an executed, immutable artifact (`artifacts/D1-SEALED.json` in the Phase-1 repository) with real H.16 results — held-out reconstruction (Acc=1.0, NCR=1.0), H.9 compression (CG=-0.6, raw numbers in ASSUMPTIONS.md), and H.12 ablation (per-component AblationImpact, same source) — all reported before interpretation. Appendix K is a preregistered, not-yet-executed contract for D2, explicitly excluding all dimensional/Human-Design/I-Ching/Appendix-J content. No dimensional or Gate/Line/Color/Tone correspondence has been asserted as established anywhere in this document — all such mappings remain explicitly hypothesized per §6–§8 and Appendix B.4, pending the controls in H.10–H.11 and the falsification tests in §19.*
