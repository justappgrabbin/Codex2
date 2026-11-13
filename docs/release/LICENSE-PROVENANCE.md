# License and provenance inventory

This is an owner-authorized local development distribution. It does not assign a new blanket license to the owner's source or recovered third-party work.

Codex2, Back-up-, Generative and Simlish current tracked trees did not provide a single root license covering all bundled work. Preserve their original notices and SOURCE-MANIFEST/PUBLICATION-REDACTIONS records. The Back-up- tree includes Acorn license notices; those are retained. Codex3 contains Three.js and Acorn notices but is **not** bundled into this release. Its visual assets retain their original, independently reviewable redistribution conditions.

The original desktop uses React, Radix and other npm packages pinned by `computer/shell/kimi-linux/package-lock.json`. The release includes `THIRD-PARTY.json` and available license text copied from installed packages under `third-party-licenses/`. The Docker Node image is a separately downloaded dependency, pinned by digest; it is not redistributed in the ZIP. Python ephem is optional and pinned in requirements-optional.txt; no Python environment is included. Node itself is installed by the user.

Recovered FieldDesk/Majiki/RelayBuilder/Proactive files retain source comments. DONORS.json gives their repository, branch, full commit, original path and SHA256; extracted function adapters identify their origins. No new third-party licensing permission is inferred from an available repository.

Before publishing publicly, the owner must resolve the root source license and any recovered asset/source redistribution rights not covered by retained notices. This is an outstanding public-release gate, not a blocker on the authorized local implementation or package. No repository visibility change, release upload, deployment or external account action occurred.

The packaging script excludes private state, installed dependencies, VCS metadata, nested unreviewed archives and existing APKs. It scans included UTF-8 text for common credential signatures and refuses packaging on matches. This is a bounded signature check, not an assurance that all possible secrets are detectable. Original archives stay unchanged in their checkouts; inclusion requires a separate content/license audit. Historical known credential redactions remain recorded under docs/recovery.
