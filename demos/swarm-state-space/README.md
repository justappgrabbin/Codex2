# Swarm on the state space — small clean version

One self-contained page (pure JS, no dependencies, no workers). Open `index.html`.
Rebuild after changing `template.html`: `node demos/swarm-state-space/build.mjs`.

## Data (read from this repo, not hand-typed)
- `SynthAi.HumanDesign/Metadata/Lines.csv` — wheel position and theme of all 384 lines
- `SynthAi.HumanDesign/Metadata/Gates.csv` — gate names and the 36 channel pairs
- `SynthAi.YiJing/Metadata/KingWen.csv` — upper/lower trigram of each hexagram
- Wheel math and the colour rule come from `pure-synthia/state-space/constants.js` and `colors.js`;
  letter→dimension uses the rule in `letters.js` (DIMENSIONS[alphabet index mod 5]).

## State space
Dodecahedron. 12 faces = 12 signs. 5 corners of each face = the 5 dimensions.
Position on the wheel (arc-seconds) gives gate > line > color > tone exactly.
Second coordinate is depth: face centre = latent, face rim = expressed.

## Swarm
192 units = first three letters of each gate's name. A unit can only move inside its own gate's span.
Motion is particle-swarm style (own best + its gate's best) plus a per-dimension bias:
Movement and Being move vertically (depth), Evolution sideways ~45°, Design zigzags diagonally,
Space has no stated rule yet, so it drifts.

## Interactions
- **By itself:** entering a new line cell, the unit reads that line (energy up).
- **Contact** (distance on the solid < 0.14): same gate = cohere; different gates sharing a trigram = harmonize;
  otherwise interfere (energy down, pushed toward expression).
- **Channel:** an expressed unit on line L of a gate and an expressed unit on line L of its channel partner
  hold that channel open; the edge is drawn labelled with the channel name.
- **Observer:** counts every event and logs channel openings/closings. It does not interpret.

Thresholds (0.14 distance, 0.6 expressed, energy amounts) are placeholders to be replaced by your rules.
