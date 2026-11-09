# Resident Computer / Generative integration

The Computer now boots the existing Back-up- semantic engine and its neural organs before declaring readiness. Its execution service and Generative structural-analysis assembly reuse that engine and the same live automata mesh. A second SynthiaAutomata instance is no longer created by ConversationExecution.

In the existing Code Editor, open or create a file and choose **Analyze structure**. The existing Generative recognizers analyze the text, return their relationship evidence and derivation, and persist an analysis receipt in the Computer's state store. Recognition is source-defined structural analysis, not unrestricted language understanding or a validated universal semantic theory.

## Compatibility boundary

`computer/integration/shared-generative-engine.mjs` extends live legacy tool instances with context-provider and observation hooks while preserving each original `run` implementation, ID, owned state, and mesh identity. It reuses the pinned Generative donor's hook registration, transport, Klein context, structured invocation, and contact implementations. No source submodule files are modified.

The adapter is idempotent for a given engine/source root and rejects switching a live engine to another source authority. An installation failure restores the previous tool maps, ontology triples, graph projections, shared context provider, transport records and installed instance properties. A controlled failure followed by a successful retry is tested.

This is a compatibility adapter for the pinned source versions, not a generic plugin API. Tools added later by other growth mechanisms do not automatically gain these hooks. That lifecycle remains a further integration gate.

## API

All routes use the existing loopback Host/Origin/Fetch-Metadata boundary.

- `GET /api/generative/status`: compatibility evidence, Klein audit, source tool catalog and saved analysis count.
- `POST /api/generative/structure`: JSON `{ "text": "The player moves toward the goal.", "context": {} }`. Requires nonblank text of at most 50,000 characters. Returns an actual source derivation and a persisted receipt.
- `GET /api/generative/history`: saved analysis receipts.

Analysis uses serial receipt ordering. The action does not execute submitted source code, call an external LLM, assign missing canonical fields, or interpret computational file coordinates as semantic evidence. Existing Run behavior remains a separate execution action.

## Checks performed

```sh
npm --prefix computer run test:integration
npm --prefix computer/shell/kimi-linux run build
```

- Reassembly/HTTP suite: **34 passed**, including same-origin structural analysis and refusal of foreign-origin analysis requests.
- Shared-engine suite: **3 passed**, covering engine and tool identity, preservation of a custom run override, original conversation and neural-organ operation, actual recognized relationships, no invented canonical address, exclusion of probes from observed tool results, rollback/retry, and actual server-process restart with exact receipt restoration.
- Production shell build: passed.
- Chromium: Code Editor → New → enter text → Analyze structure → actual relationship output and saved receipt; repeat after reload. Desktop resizing and mobile analysis controls checked; no page script errors or mobile page overflow.

Browser testing also exposed an existing full-window resize overlay that intercepted editor controls. The overlay is now pointer-transparent except at resize handles. Editor controls/output inherit the existing light text color, and the toolbar scrolls horizontally on narrow windows.

## Remaining boundaries

This does not complete the full requested Computer. Shared instrument identity is verified, but the complete one-RSS contract, end-to-end learned-state restoration, formation promises, dodecahedral computational placement, and supplied semantic-address rules still require implementation and evidence. Saved analysis receipts survive restart; this is not a claim that every donor's volatile learning state has been rehydrated.
