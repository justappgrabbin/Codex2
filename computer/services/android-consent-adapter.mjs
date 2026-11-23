/**
 * Explicit owner consent boundary for Android eyes/hands.
 * Transport is injected from the existing Android MCP client; no implicit device access.
 * An approval is single-use, bound to exact tool + arguments, and expires.
 */
import { createHash, randomUUID } from 'node:crypto';

const DEFAULT_TOOLS = Object.freeze(['android_screen_observe', 'android_touch']);
const fingerprint = (name, args) => createHash('sha256').update(JSON.stringify([name, args])).digest('hex');

export function createAndroidConsentAdapter({ transport, allowedTools = DEFAULT_TOOLS, now = () => Date.now(), ttlMs = 30000 } = {}) {
  if (!transport || typeof transport.callTool !== 'function') throw new TypeError('Android MCP transport.callTool required');
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) throw new RangeError('ttlMs must be positive');
  const allowed = new Set(allowedTools);
  const approvals = new Map();
  let active = false;
  let generation = 0;

  function stop() {
    active = false;
    generation++;
    approvals.clear();
    if (typeof transport.stop === 'function') transport.stop();
    return { active: false };
  }
  function start() {
    if (typeof transport.start === 'function') transport.start();
    active = true;
    return { active: true };
  }
  function request(name, args = {}) {
    if (!active) throw new Error('Android MCP stopped');
    if (!allowed.has(name)) throw new Error('Android MCP tool not permitted');
    const id = randomUUID();
    approvals.set(id, { digest: fingerprint(name, args), expires: now() + ttlMs, generation });
    return { id, tool: name, args: structuredClone(args), expires: now() + ttlMs };
  }
  async function execute(name, args = {}, approvalId) {
    if (!active) throw new Error('Android MCP stopped');
    if (!allowed.has(name)) throw new Error('Android MCP tool not permitted');
    const approval = approvals.get(approvalId);
    approvals.delete(approvalId); // consume even on mismatch
    if (!approval || approval.generation !== generation || now() >= approval.expires || approval.digest !== fingerprint(name, args)) {
      throw new Error('Android MCP explicit approval required');
    }
    const current = generation;
    const result = await transport.callTool(name, args);
    if (!active || current !== generation) throw new Error('Android MCP stopped during operation; result discarded');
    return result;
  }
  return { start, stop, request, execute, get active() { return active; }, get pendingCount() { return approvals.size; } };
}
