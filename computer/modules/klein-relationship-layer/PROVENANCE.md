# Provenance — Klein relationship layer

Copies of Alexis's files. The copies in `vendor/` were not edited. Glue is only in
`relationship_layer.py` and `relationship-layer.mjs`, and is marked IMPLEMENTATION DECISION.

Addressing and birth time are on hold and are not used here. `frame_resolver.py`,
`dimension_clock.py`, `swarm_tags.py`, and `lcm-address-resolver.js` were not copied in.

## Drive files used

Already on this computer under `/workspace/model-plan/dl/` from her Google Drive.
Hashes of the copied tool files are in `vendor/SHA256SUMS.txt`.

| Name | Drive file id | What was taken |
|---|---|---|
| Cynthia-Klein-Original-Trained.zip | `1zc1-t3OjmzCXL9AagWmyYTgqUQ9bry22` | `vendor/klein-agent/klein_tools_fixed/{klein_diseminer,klein_autoling,klein_grammar_coder,klein_dependency}.py`. The trained weights stay outside this repo (they are large, and this layer sits on top of them rather than bundling them). |
| klein_tools_contact_model_v17.zip | `1_pq9P96vugUjwApoUuU1OEUEpjutan-H` | Same four Python files; SHA-256 matches the trained package copies. |
| klein_autoling.py | `10KPg2n_sLdUdqYpvKkk1LuUNBojau1-6` | Same bytes as the copy inside the two zips above (18904 bytes). |
| klein-mesh-game-engine-v5.1-FIXED.zip | `151brbVXm6aRltg2M-jqovOs7X9JXSfQV` (also `15uUESjDt7el2pKMaz9rghG4DN-pEyaao`, same size) | Non-game toolkit and the tool classes inside `klein-full-toolkit` and `klein-mesh-game-engine` (TypeScript sources plus her already-compiled `dist` JS). `index.js` was not copied: loading it runs a game-hybrid demo. |

Related Drive files that were checked and not used as the running tools:

| Name | Drive file id | Why not used as the running tool |
|---|---|---|
| DISEMINER-Distributional-Semantics-Inference-Maker.pdf | `18p_vVraylplSxiQJ0ejZ_Sfz2is0-k11` | Paper, not code. `klein_diseminer.py` was built from it. |
| diseminer-mcp-server(3).zip | `1_nscIMomRW6xErHK3J6R3VuZyLWyAuvv` | MCP wrapper and a different engine, not the 1968 paper program. |
| computational-grammar-coder.mjs | `1ww5i8ZbCYliakAM5mPR_Ezlv76O30cfV` | Short JS sketch. The running CompGram is `klein_grammar_coder.py`. |
| GameEngineX-Resolver-SGAN-DONOR.zip | `1UyxNs1d6ZRqmHhsFeDrKqExlQCeuvnBl` | Game coordinate resolver, not the language Resolver. |
| frame_resolver.py (inside the trained / v17 trees) | (inside the zips above) | Address and birth-time frame resolver. Left out on purpose. |

## Which implementation answers

- **DISEMINER, AutoLing, CompGram:** the Python files above. They are the paper builds, and they run with plain Python 3 (no compiled extensions).
- **Resolver:** see the IMPLEMENTATION DECISION in `relationship_layer.py`. Her file named "Resolver" in the Klein tree is the address/birth-time `frame_resolver.py`, which is on hold. The language resolver used here is her `klein_dependency.py` parser (Klein & Simmons 1963), because its links are the input DISEMINER's `add_links` expects.
- **Klein Mesh as a relationship bus:** her `KleinEngine` / `MessySubstrate` from the v5.1 toolkit. Its own DiseMinerModule is a word-space, not the 1968 inference maker; the layer does not use that module as DISEMINER.
