# SWARM-OS recursive primitive formation — executable checkpoint

## What this actually builds

An **additive formation layer** on top of the user's existing `PrimitiveExecutionVM` (`source/universal-primitive-execution-bridge.mjs`, copied unchanged from the previously verified Synthia next-pass checkpoint). It treats atomic inputs, operator relationships, and earlier executable formations as reusable constituents. It compiles recursively into the existing main-thread JavaScript VM. It does not replace the state-space engine or any original archives.

## Reproduce

`node --test tests/*.test.mjs`

Five passing tests verify distinct behaviors from changed relations, second- and third-generation composition, append-only in-memory lineage, checkpoint export/import, and rejection of invalid references. No backend, worker, external model, or network.

## API

```js
import {RecursivePrimitiveKernel} from './source/recursive-primitive-kernel.mjs';
const kernel = new RecursivePrimitiveKernel();
kernel.form({name:'pair',inputs:['x','y'],steps:[{id:'r',op:'add',args:['x','y']}],output:'r',ontology:{Being:'number',Movement:'combine'}});
const result = await kernel.execute('pair',{x:2,y:3}); // result.value === 5
const checkpoint = kernel.exportCheckpoint();
// Persist checkpoint externally via the app's existing storage adapter.
```

## Address and ontology integration boundary

`ontology` is preserved as caller-provided metadata. `address.hexagram6` is **only a deterministic six-bit structural fingerprint bucket**, not the canonical King Wen/Fu Xi gate, not an ontological address, and not an integration with the existing mesh resolver. `structuralHash` is a 32-bit checksum, not collision-proof. The real state-space resolver must assign/validate canonical addresses before production use. Space remains uncomputed rather than fabricated.

## Evidence limits

- This is a working **recursive composition mechanism** for the VM's currently supported operators, not a proof of universal emergent computation or arbitrary morphogenesis.
- The operation vocabulary is inherited from the existing VM; it is not discovered from physical first principles. No pretrained phenotype templates are installed.
- Journal is append-only **in memory**; the caller must persist exported checkpoints. No Drive, GitHub, Android APK, mesh, ATO, Tool Factory, or Klein integration is claimed.
- Research-inspired relations (complementarity, resonance, cooperativity) are not asserted as experimental physics or biochemical implementations.
- Original user archives remain untouched. This directory is a separate tested checkpoint.

## Additive tri-modal primitive expression (2026-10-17)
`source/tri-modal-expression.mjs` adds a deterministic projection of each executed formation to **shape (polygon), color (HSL), and sound (harmonic PCM samples)** from its six-bit address, ontology, output value, action and generation. `expressExecution`, `toSVG`, `toPCM` run offline and on the main thread. This is an explicit computational mapping, not a claim that physical colors, tones, or shapes are objectively inherent to all phenomena. The same primitive's three expressions are derived together; they are not yet fed back into execution or validated against the user's canonical cross-field correspondences. See `tests/tri-modal.test.mjs`.

Run: `node --test tests/*.test.mjs` (7 tests passing).
