# computer/become

Three execution modes, never mixed:

| mode | what runs | where |
|---|---|---|
| **native-swarm** | JS → `lowerer.mjs` → formations → the owner's **original, unmodified** SWARM-OS `RecursivePrimitiveKernel` over `PrimitiveExecutionVM` | primary |
| **reference** | the original JS (module runtime / execution bridge / Morph MIR rebuild) | comparison only, never reported as swarm |
| **latent** | functions the translator cannot express in the kernel's operators; kept in the genotype with dependencies and the missing requirement | nowhere |

`equivalence.mjs` checks `Observe(Swarm(L(P))) ≡ Observe(JS(P))` (return value or thrown error per call;
effects are empty for the kernel's pure operators).

First real file proven: the owner's Pure Synthia `experiments/scale/metrics.js` — 7/10 functions native-swarm,
equal to the reference on every compared call (`tests/equivalence.test.mjs`); 3 latent:
`compressionGain` (read field of an object input), `reconstructionAccuracyExact` (called function as primitive),
`operatorReuse` (length of a held value).

`swarm-kernel.mjs` / `swarm-lowerer.mjs` are an **experimental extension** (more unit kinds via the VM's own
`registerOperator`), labeled `extended-swarm`, not the primary engine.
