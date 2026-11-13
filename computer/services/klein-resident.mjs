import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DEFAULT_ROOT = process.env.SYNTHIA_KLEIN_ROOT
  ?? '/workspace/model-plan/dl/x/Cynthia-Klein-Original-Trained/vendor/klein-agent';
const DEFAULT_PY = process.env.SYNTHIA_KLEIN_PYTHON
  ?? '/workspace/models-runtime/klein-venv/bin/python';
const BRIDGE = fileURLToPath(new URL('./klein-bridge.py', import.meta.url));

export function kleinAvailable() {
  return existsSync(DEFAULT_PY) && existsSync(DEFAULT_ROOT) && existsSync(`${DEFAULT_ROOT}/run/model.pt`);
}

let child = null;
let ready = null;
const waiters = [];

function ensure() {
  if (child && child.exitCode == null) return ready;
  if (!kleinAvailable()) {
    ready = Promise.resolve({ ok: false, error: 'Klein weights or PyTorch environment are not available.' });
    return ready;
  }
  child = spawn(DEFAULT_PY, [BRIDGE], {
    env: { ...process.env, SYNTHIA_KLEIN_ROOT: DEFAULT_ROOT },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let buf = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    buf += chunk;
    let idx;
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }
      const waiter = waiters.shift();
      if (waiter) waiter(msg);
    }
  });
  child.on('exit', () => { child = null; });
  ready = new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, error: 'Klein bridge timed out on start.' }), 180000);
    waiters.push((msg) => { clearTimeout(timer); resolve(msg); });
  });
  return ready;
}

export async function kleinStatus() {
  const start = await ensure();
  return { available: kleinAvailable(), ready: Boolean(start?.ok || start?.ready), detail: start };
}

export async function kleinTalk(text) {
  const start = await ensure();
  if (!start?.ok && !start?.ready) return { ok: false, text: '', error: start?.error ?? 'Klein is not ready.', provider: 'klein-unavailable' };
  return await new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, text: '', error: 'Klein timed out.', provider: 'klein' }), 120000);
    waiters.push((msg) => {
      clearTimeout(timer);
      const result = msg.result ?? msg;
      const reply = result.text ?? result.reply ?? result.message ?? result.utterance ?? '';
      resolve({ ok: Boolean(msg.ok), text: String(reply || ''), raw: result, provider: 'klein', error: msg.error });
    });
    child.stdin.write(JSON.stringify({ text }) + '\n');
  });
}
