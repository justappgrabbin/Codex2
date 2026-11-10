# Copied donors (unchanged)

These files were copied from Alexis's existing work. They were not rewritten.

| Path | Source |
| --- | --- |
| `guagan-monaco/DevEnvironment.jsx` | Recovered GUAGAN browser Monaco integration (`@monaco-editor/react`). Original lives under `/workspace/cynthia-computer-assembly/recovered/GuaGanBrowser (1)/.../src/components/DevEnvironment.jsx`. |
| `synthia-server-mcp/*` | `justappgrabbin/Synthia-server`: `trident-mcp-server.ts`, `mcp_server.py`, `mcp_config.json`, `mcp-hub-addon.js`, `docs/TRIDENT_ROLE_MAP.md` |
| `mrnn-mcp-client/mrnn-mcp-client.ts` | `justappgrabbin/We-as-in-me-and-mCP-with-kimi-kinda-chat-nearly-enough-Joe-did-it` |
| `terminals/Terminal.tsx` | `justappgrabbin/Synthai2` `client/src/components/Terminal.tsx` (user/IDE terminal that talks to `/api/container`) |
| `terminals/TerminalApp.tsx`, `NeuralTerminal.tsx` | same We-as-in-me repo (two existing terminal UIs) |
| `terminals/TerminalApp.jsx` | `justappgrabbin/Resonance-morph-os` |
| `synthctl/*` | `justappgrabbin/synthctl` — Linux container runtime plus the honest Darwin/macOS Seatbelt backend |
| `android-runtime/LocalLinuxRuntime.java` | `justappgrabbin/Stellar-proximology` `android/LocalLinuxRuntime.java` |

The Computer's thin glue imports or serves these; it does not replace them.

| `synthai2-container/linuxContainerService.ts` | `justappgrabbin/Synthai2` `server/lib/linuxContainerService.ts` — real user terminal / container exec |
| `grove-store/GroveStore.tsx`, `templateRegistry.ts`, `fileSystem.ts`, `gameTemplates.ts`, `ganTemplates.ts` | `justappgrabbin/special-fishstick` Grove Store UI and local template registry |

| `self-helpton-foundry/index.html` | Google Doc Drive id `1cdOggNJEOCfAduUWBkD5ItaAQC65yn3Kso_IF3WbBXg` (local extract `/workspace/model-plan/shared-doc.html`). Alexis's Self-Helpton Foundry single-file HTML. Copied from the start of the Doc through the first `</html>`. Google Docs markdown backslash-escaping was undone only: 12× `` \` `` → `` ` `` and 4× `\$` → `$` (JS template literals). No other edits. |
| `causal-graph-generators/causal-graph-python-powered.html` | Same Drive Doc. Pasted AI-chat fenced file named `causal-graph-python-powered.html` (YOU-N-I-VERSE Python-Powered Graph Generator). Unescaped GDocs `\`` / `\:` / `\$` only. Complete `</html>`. Kept for safekeeping; not wired into the Computer (addressing hold). |
| `causal-graph-generators/causal-graph-generator.html` | Same Drive Doc. Pasted AI-chat fenced file named `causal-graph-generator.html` (offline/enhanced export variant). **Truncated in the Doc** — fence never closes / no final `</html>`. Saved as-found after the same unescape. Not wired into the Computer. |
