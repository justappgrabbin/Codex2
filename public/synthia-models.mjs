// In-browser language models for the SynthAI Computer — no backend.
// Weights download from Hugging Face on first start and are cached by the browser
// (Cache API), so later starts load from the phone. Runs on WebGPU when the browser
// has it, otherwise on WebAssembly (CPU).
// Library: Transformers.js (Hugging Face), loaded as an ES module from jsDelivr.
export const LIB_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2';

// Two roles: a talker and a coder. Both are 4-bit quantized ONNX transformers.
export const MODELS = Object.freeze({
  talker: { id: 'onnx-community/Qwen2.5-0.5B-Instruct', label: 'Talker (Qwen2.5 0.5B)', autoload: true },
  coder: { id: 'onnx-community/Qwen2.5-Coder-0.5B-Instruct', label: 'Coder (Qwen2.5-Coder 0.5B)', autoload: false }
});

export async function pickDevice() {
  try { if (globalThis.navigator?.gpu && await navigator.gpu.requestAdapter()) return 'webgpu'; } catch {}
  return 'wasm';
}

// Each slot runs its model in its own Web Worker (synthia-model-worker.mjs), so loading and
// generating never freeze the page, and ending the worker frees the model's memory.
export class ModelSlot {
  constructor(role, spec) {
    Object.assign(this, { role, spec, state: 'idle', progress: 0, error: null, device: null, worker: null, seq: 0, pending: new Map() });
    this.listeners = new Set();
  }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { for (const fn of this.listeners) fn(this); }
  call(op, payload, onEvent) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject, onEvent }); this.worker.postMessage({ id, op, ...payload }); });
  }
  receive({ data }) {
    const p = this.pending.get(data.id); if (!p) return;
    if (data.error) { this.pending.delete(data.id); p.reject(new Error(data.error)); }
    else if (data.done) { this.pending.delete(data.id); p.resolve(data); }
    else p.onEvent?.(data);
  }

  async load() {
    if (this.state === 'ready' || this.state === 'loading') return this;
    this.state = 'loading'; this.error = null; this.progress = 0; this.emit();
    try {
      this.device = await pickDevice();
      this.worker = new Worker(new URL('/synthia-model-worker.mjs', location.href), { type: 'module' });
      this.worker.onmessage = e => this.receive(e);
      await this.call('load', { model: this.spec.id, device: this.device, dtype: this.device === 'webgpu' ? 'q4f16' : 'q4' },
        e => { if (e.progress != null) { this.progress = e.progress; this.emit(); } });
      this.state = 'ready'; this.progress = 1;
    } catch (error) {
      this.state = 'error'; this.error = String(error?.message || error); this.unload(true);
    }
    this.emit();
    return this;
  }

  unload(keepState = false) {
    this.worker?.terminate(); this.worker = null;
    for (const p of this.pending.values()) p.reject(new Error('model unloaded'));
    this.pending.clear();
    if (!keepState) { this.state = 'idle'; this.progress = 0; this.emit(); }
  }

  async chat(messages, { maxNewTokens = 256, onToken } = {}) {
    if (this.state !== 'ready') throw new Error(`${this.spec.label} is ${this.state}`);
    const r = await this.call('chat', { messages, maxNewTokens }, e => { if (e.token != null) onToken?.(e.token); });
    return r.text;
  }
}

// A phone can't hold two of these models at once, so only one stays loaded: loading one
// ends the other's worker, which frees its memory. Weights stay cached on the device, so
// switching back reloads from local storage rather than downloading again.
export function createModels() {
  const slots = Object.fromEntries(Object.entries(MODELS).map(([role, spec]) => [role, new ModelSlot(role, spec)]));
  for (const slot of Object.values(slots)) {
    const load = slot.load.bind(slot);
    slot.load = () => {
      for (const other of Object.values(slots)) if (other !== slot && other.state !== 'idle') other.unload();
      try { localStorage.synthiaActiveModel = slot.role; } catch {}
      return load();
    };
  }
  return slots;
}
export function activeRole() {
  try { return localStorage.synthiaActiveModel in MODELS ? localStorage.synthiaActiveModel : 'talker'; } catch { return 'talker'; }
}

// What the computer tells the model about itself before each turn. The swarm and
// runtime state lead; the model speaks from it ("the swarm powers the LLM").
export function systemPrompt(computer) {
  let summary = '';
  try {
    const s = computer?.snapshot?.();
    if (s) {
      const n = k => Array.isArray(s[k]) ? s[k].length : 0;
      const names = (s.projects || []).slice(0, 8).map(p => p.name || p.id).join(', ');
      summary = `${n('projects')} projects${names ? ` (${names})` : ''}, ${n('apps')} apps, ${n('tools')} tools, ${n('mounted')} mounted, ${n('capabilities')} capabilities.`;
    }
  } catch {}
  return [
    'You are Synthia, the voice of the SynthAI Computer running in this browser with no server.',
    'Answer briefly and plainly. When asked to make or change something, say exactly what you will do.',
    summary ? `Current computer state: ${summary}` : ''
  ].filter(Boolean).join('\n');
}
