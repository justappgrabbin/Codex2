/**
 * Computer-facing lane for the Klein relationship layer.
 *
 * IMPLEMENTATION DECISION: this file shells out to relationship_layer.py so
 * her Python tools run as written. It never attaches an address or a
 * state-space record to the language-model text.
 *
 * IMPLEMENTATION DECISION: kleinTalk / Agent is tried only after a probe.
 * Without that probe, klein-resident.mjs waits three minutes when pyswisseph
 * is missing. This file does not change klein-resident.mjs or klein-bridge.py.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const LAYER_PY = join(HERE, 'relationship_layer.py');
const DEFAULT_ROOT = process.env.SYNTHIA_KLEIN_ROOT
  ?? '/workspace/model-plan/dl/x/Cynthia-Klein-Original-Trained/vendor/klein-agent';
const DEFAULT_PY = process.env.SYNTHIA_KLEIN_PYTHON
  ?? (existsSync('/workspace/models-runtime/klein-venv/bin/python')
    ? '/workspace/models-runtime/klein-venv/bin/python'
    : 'python3');

export function runLayer(command, payload = {}, pythonBin = 'python3') {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonBin, [LAYER_PY, command, JSON.stringify(payload)], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (c) => { out += c; });
    child.stderr.on('data', (c) => { err += c; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(err.trim() || out.trim() || `relationship_layer.py exited ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(out.trim().split('\n').at(-1)));
      } catch (exc) {
        reject(new Error(`bad JSON from relationship_layer.py: ${out}\n${err}`));
      }
    });
  });
}

export async function probeLanguageModel(opts = {}) {
  const python = opts.python ?? DEFAULT_PY;
  const root = opts.root ?? DEFAULT_ROOT;
  return runLayer('probe-lm', { python, root }, 'python3');
}

/**
 * End-to-end call from the language-model lane.
 * If the trained Agent can start, its reply is what the tools read.
 * If it cannot (missing pyswisseph / Python.h), the supplied text is still
 * sent through the same tool pipe, and the probe is returned so the gap is visible.
 */
export async function fromLanguageModelLane(text, opts = {}) {
  const probe = await probeLanguageModel(opts);
  let laneText = text;
  let model = { used: false, probe };
  if (probe.ok && probe.weights_present && opts.talk) {
    const talked = await opts.talk(text);
    model = { used: Boolean(talked?.ok), probe, talk: talked };
    if (talked?.ok && talked.text) laneText = talked.text;
  }
  const tools = await runLayer('from-lm-lane', { text: laneText });
  return {
    ...tools,
    model,
    used_address: false,
    used_state_space: false,
  };
}

export async function meshRelate(text) {
  // IMPLEMENTATION DECISION: load her compiled toolkit only, never index.js
  // (index.js runs a game-hybrid demo on import).
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const toolkit = require('./vendor/js/klein-full-toolkit.js');
  const engine = new toolkit.KleinEngine();
  const symbol = await engine.process(text, 'lm-lane');
  const stats = engine.getStats();
  return {
    tool: 'KleinMesh',
    source: 'vendor/js/klein-full-toolkit.js',
    id: symbol.id,
    type: symbol.type,
    modules: stats.modules,
    note: 'KleinEngine is the relationship bus. Language answers come from the Python paper tools, not DiseMinerModule.',
  };
}
