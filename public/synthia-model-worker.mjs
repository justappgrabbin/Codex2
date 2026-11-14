// Runs one language model off the page's main thread, so the computer stays responsive
// while the model loads and generates. One worker holds one model; ending the worker
// frees all of its memory.
import { LIB_URL } from '/synthia-models.mjs';
let generator = null, lib = null;

self.onmessage = async ({ data }) => {
  const { id, op } = data;
  try {
    lib ??= await import(LIB_URL);
    if (op === 'load') {
      lib.env.allowLocalModels = false;
      const files = new Map();
      generator = await lib.pipeline('text-generation', data.model, {
        device: data.device, dtype: data.dtype,
        progress_callback: p => {
          if (p.status !== 'progress' || !p.file) return;
          files.set(p.file, [p.loaded ?? 0, p.total ?? 0]);
          let loaded = 0, total = 0; for (const [l, t] of files.values()) { loaded += l; total += t; }
          self.postMessage({ id, progress: total ? loaded / total : 0 });
        }
      });
      self.postMessage({ id, done: true });
    } else if (op === 'chat') {
      const streamer = new lib.TextStreamer(generator.tokenizer, { skip_prompt: true, skip_special_tokens: true, callback_function: t => self.postMessage({ id, token: t }) });
      const out = await generator(data.messages, { max_new_tokens: data.maxNewTokens ?? 256, do_sample: false, streamer });
      const last = out[0].generated_text;
      self.postMessage({ id, done: true, text: Array.isArray(last) ? last.at(-1).content : String(last) });
    }
  } catch (error) {
    self.postMessage({ id, error: String(error?.message || error) });
  }
};
