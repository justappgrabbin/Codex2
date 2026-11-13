# Synthia Paper Deep-Learning Workflow

Source concept: https://github.com/Lsinxcoy/paper-deep-learning-workflow

This is an **additive local workflow recorder** for Codex2. It implements the source's four-stage progression and persists structured evidence under `docs/paper_deep/`, including a `MEMORY_PAPER_REGISTRY.json` index. It does **not** pretend to automatically parse PDFs, download papers, generate summaries, execute research code, or connect to Hermes. Those require separate verified adapters.

Use from a Node.js module:

```js
import { recordStage } from './computer/research/paper-workflow.mjs';
await recordStage(process.cwd(), 'paper-001', 'select', {
  title: 'A research paper',
  source: 'local/path/to/paper.pdf'
});
await recordStage(process.cwd(), 'paper-001', 'deep-read', {
  summary: 'Evidence-grounded explanation',
  codeContrast: 'Comparison with implementation'
});
await recordStage(process.cwd(), 'paper-001', 'implement', {
  experiment: 'Procedure and executable reference',
  result: 'Actual observed result'
});
await recordStage(process.cwd(), 'paper-001', 'persist', {
  conclusion: 'Verified findings and limitations'
});
```

Run tests: `node --test computer/research/paper-workflow.test.mjs`.

This module is not yet wired into the Codex2 shell UI or file-ingestion engine. The existing computer and its tests remain untouched.
