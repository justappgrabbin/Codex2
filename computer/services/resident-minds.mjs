import { kleinTalk, kleinStatus, kleinAvailable } from './klein-resident.mjs';
import { tridentComplete, isCodeRequest, qwenAvailable } from './trident-qwen.mjs';
import { createTridentMcp } from './trident-mcp-glue.mjs';

export function mindsStatus() {
  return {
    klein: { role: 'resident-chat', available: kleinAvailable() },
    trident: { role: 'resident-coder', engine: 'Qwen2.5-Coder-0.5B GGUF via llama.cpp', available: qwenAvailable(), mcp: true },
  };
}

export async function routeChat({ text, mcp } = {}) {
  const input = String(text ?? '').trim();
  if (!input) return { ok: false, error: 'empty message' };
  if (isCodeRequest(input)) {
    const context = mcp ? { tools: mcp.listTools().map((t) => t.name), filesystemCount: (await mcp.callTool('filesystem_list', { prefix: '/' })).records?.length } : { tools: [] };
    const completion = await tridentComplete(
      `You are Trident, the resident coder. Use only the user's request. Request:\n${input}\n`,
    );
    return {
      ok: completion.ok,
      routedTo: 'trident',
      provider: 'trident-qwen2.5-coder-0.5b',
      text: completion.text,
      mcp: { tools: context.tools, filesystemCount: context.filesystemCount },
      error: completion.error,
    };
  }
  const status = await kleinStatus();
  if (status.available && status.ready) {
    const reply = await kleinTalk(input);
    return { ok: reply.ok, routedTo: 'klein', provider: 'klein', text: reply.text, error: reply.error };
  }
  return {
    ok: false,
    routedTo: 'klein',
    provider: 'klein-unavailable',
    text: '',
    error: status.detail?.error ?? 'Klein is not loaded on this host.',
    fallback: 'Chat stayed with the resident Klein path; no paid API was used.',
  };
}
