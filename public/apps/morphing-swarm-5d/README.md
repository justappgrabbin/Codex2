# Morphing World — Yi-Jing 5D Living Swarm

## Quick start

**Phone-friendly visual app:** Open `index.html` in Chrome/another modern browser. The scene, Yi-Jing 5D state field, moving lines, reflection operators, photos, Morph character transitions, touch forces, local sound and capture run locally without the optional server, without API calls and without needing Python. For a one-file copy use `Morphing-Swarm-IChing-5D-OPEN.html` from the adjacent download; it contains the same CSS and JavaScript inline.

**Optional original Python Yi-Jing Agent:** Install Python 3 and Node.js 18+ on your device, then in this directory run `node server.mjs`, and open `http://127.0.0.1:8787/`. Open *Original Python Yi-Jing Agent* and select *Run native six-line agent*. The Node server invokes `bridge/yijing_cli.py`, which imports the original, unmodified Yi-Jing Agent from `vendor/yi-jing-agent-main/src/`. The default `HermesYiJingExecutor` without an LLM callback runs its own simulated execution path, which the UI explicitly labels; no inference model or weights are being claimed. Native moving-line changes can also be checked through `POST /api/yijing/task` with `{"action":"mutate","code":63,"line":3}`.

## Five dimensions, governed by the I Ching

This app deliberately distinguishes two systems:

1. **Five semantic dimensions:** Movement, Evolution, Being, Design, and *Space*, which emerges from the pairings Movement↔Being and Evolution↔Design. All five values change in response to the same living swarm state, the 64-hexagram Yi-Jing code and moving-line events. The fifth is **derived**, not a separate invented primitive.
2. **Six moving lines (爻):** the original Yi-Jing Agent's six-bit state machine. It has 64 complete hexagram states, 6 indexed moving lines, the XOR mutation masks from its code (`line 1` = most significant bit), 64 original named strategies, and structural reflection via 互卦 *nuclear*, 錯卦 *opposite*, and 綜卦 *reversed*. The six lines are **not** relabeled as five dimensions.

The numeric mapping from six-bit states, contact measurements and prior transitions to five semantic dimension values is **a new design layer authored for this build**, not a claim made by the Yi-Jing Agent authors or an externally validated physical law. `Space = (sqrt(Movement×Being) + sqrt(Evolution×Design)) / 2 × (.65+.35×coherence)`. Values are normalized [0,1].

**Not simply a flat color selector:** Each form particle carries a 5-component representation `(x,y,z,w,v)` derived from the current 5D semantic state. In `core/yi-jing-5d.js`, five-component points undergo two 5D plane rotations (X/W and Y/V) and a projection into the familiar 3D camera. Mutation changes the positions of visible particles and target shape, adds feedback to the original donor's particle velocities and changes audio pitch/timbre through state. This is a visualization of a 5D *semantic* model; it does **not** claim to render five physical spatial dimensions.

The original donor's four independent primitive word streams are left in place. The original `core/swarm-reality-engine.js`, `core/morph-engine.js` and `core/sprite-runtime.classic.js` remain copied unchanged. The Node/Dream/Synthia server is the original optional runtime with the new Yi-Jing endpoint added only to the wrapper server. Existing photo and scene features remain.

## How to interact

- Tap any one of the six moving lines to trigger a true 6-bit XOR hexagram change. The world reshapes and the five semantic dimension readings update.
- Tap the living scene: the point where you tap selects one of the six lines and applies plus/minus contact to the donor's particle world.
- Choose **互卦**, **錯卦**, or **綜卦** to transform the whole hexagram following the original reflection algorithm's bit transformations.
- Expand **All 64 hexagrams** to jump to any named state.
- Enable **Autonomous moving lines** to let relational contact information choose a new moving line every ~7.4 seconds.
- Load a photo, morph a character or select a geometric form; previous photo-to-point and recording functionality is retained.
- **Save state** includes the complete 5D vector, hexagram, reflections and moving-line event history as JSON.
- The native Python Yi-Jing Agent's six-stage task lifecycle is an independent execution tool, available when you run the local server. It does not run when using the single-file browser version.

## Source & trust boundaries

- Original complete Yi-Jing Agent: `vendor/yi-jing-agent-main/`, MIT licensed; see original README, LICENSE, tests and docs.
- Python bridge to native source: `bridge/yijing_cli.py` (new).
- Original 64 entries and six bit masks: `core/yijing-original-table.json` (mechanically generated from original Python) and `core/yijing-data.js` (generated offline-browser mirror).
- Five-dimensional mapping and original reflection browser adapter: `core/yi-jing-5d.js` (new).
- Browser/UI orchestration: `app.js`, `index.html`, `style.css` (additive edits from v1).
- The existing app's source inventory and donor archives are preserved in `SOURCE-INVENTORY.md` / `donors/`.
- Original v1 README is at `README-v1-preserved.md`.

## Tests

From this project directory: `node --test tests/*.test.mjs`. This covers previous swarm tests, all 64 native hexagram tables, all 384 state×line mutations, 64 nuclear/opposite/reversed transformations, five-dimension derivation, projection finiteness, and parity against the **actual bundled original Python implementation**. Tests require `python3` for cross-runtime parity. Optional Node server endpoint manually verified with a live native Python action.

## Remaining boundaries

This is a concrete 5D semantic simulation coupled to a 3D particle renderer, not a 5D physical physics engine, a photorealistic generative model, a Unity integration, an APK or a trained model. Native browser sound/video availability varies by device. Chrome's browser UI is recommended for a phone. There are no claims about measurements on your particular handset until that device is tested. Only the Yi-Jing rules and 64 names/strategies are sourced from the original agent; the 5D mapping and live visual dynamics are an application-specific integration.
