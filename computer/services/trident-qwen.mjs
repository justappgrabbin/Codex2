import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const DEFAULT_CLI = process.env.SYNTHIA_LLAMA_CLI
  ?? '/workspace/models-runtime/llama-bin/llama-b12233/llama-cli';
const DEFAULT_MODEL = process.env.SYNTHIA_QWEN_GGUF
  ?? '/workspace/models-runtime/qwen/qwen2.5-coder-0.5b-instruct-q4_k_m.gguf';

export function qwenAvailable() {
  return existsSync(process.env.SYNTHIA_LLAMA_CLI ?? DEFAULT_CLI)
    && existsSync(process.env.SYNTHIA_QWEN_GGUF ?? DEFAULT_MODEL);
}

export async function tridentComplete(prompt, { maxTokens = 160, timeoutMs = 120000 } = {}) {
  const cli = process.env.SYNTHIA_LLAMA_CLI ?? DEFAULT_CLI;
  const model = process.env.SYNTHIA_QWEN_GGUF ?? DEFAULT_MODEL;
  if (!existsSync(cli) || !existsSync(model)) {
    return { ok: false, available: false, error: 'Qwen Coder / llama.cpp is not installed on this host.', text: '' };
  }
  const libDir = cli.replace(/\/[^/]+$/, '');
  const args = ['-m', model, '-p', String(prompt), '-n', String(maxTokens), '--no-display-prompt', '--single-turn', '--log-disable'];
  return await new Promise((resolve) => {
    const child = spawn(cli, args, {
      env: { ...process.env, LD_LIBRARY_PATH: `${libDir}:${process.env.LD_LIBRARY_PATH ?? ''}` },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const clock = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', (c) => { stdout += c; });
    child.stderr.on('data', (c) => { stderr += c; });
    child.on('error', (error) => { clearTimeout(clock); resolve({ ok: false, available: true, error: String(error), text: '' }); });
    child.on('close', (code) => {
      clearTimeout(clock);
      const text = stdout.trim();
      resolve({ ok: code === 0 && Boolean(text), available: true, text, exitCode: code, engine: 'qwen2.5-coder-0.5b-instruct-q4_k_m', via: 'llama.cpp' });
    });
  });
}

export function isCodeRequest(text) {
  const t = String(text ?? '');
  if (!t.trim()) return false;
  return /\b(write|implement|fix|debug|refactor|code|function|class|script|program|compile|review|patch)\b/i.test(t)
    && /\b(function|code|class|script|program|bug|error|python|javascript|typescript|html|css|sql|add two|adds two)\b/i.test(t);
}
