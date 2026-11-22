/**
 * Owner-controlled permission boundary for Android eyes/hands MCP tools.
 * This adapter does not grant Android OS permissions or bypass the phone's prompts.
 * The UI must call start() and approve() from explicit user gestures.
 */
export function createAndroidPermissionGate({ client, allowedTools = [], onEvent = () => {} } = {}) {
  if (!client || typeof client.callTool !== 'function') throw new TypeError('MCP client with callTool required');
  const allow = new Set(allowedTools);
  const approvals = new Set();
  let active = false;
  let generation = 0;
  const emit = (event, tool) => onEvent({ event, tool, at: new Date().toISOString() });
  return Object.freeze({
    get active() { return active; },
    start() { active = true; generation++; emit('started'); return { active }; },
    stop() { active = false; generation++; approvals.clear(); emit('stopped'); return { active }; },
    approve(tool) {
      if (!active) throw new Error('Android MCP is stopped');
      if (!allow.has(tool)) throw new Error('Android MCP tool not allowed');
      approvals.add(tool);
      emit('approved', tool);
      return { approved: tool };
    },
    async callTool(tool, args = {}) {
      if (!active) throw new Error('Android MCP is stopped');
      if (!allow.has(tool)) throw new Error('Android MCP tool not allowed');
      if (!approvals.delete(tool)) throw new Error('Explicit approval required for each Android MCP action');
      const issuedAt = generation;
      emit('requested', tool);
      const result = await client.callTool(tool, args);
      if (!active || issuedAt !== generation) {
        emit('discarded-after-stop', tool);
        throw new Error('Android MCP stopped before result returned');
      }
      emit('completed', tool);
      return result;
    },
    listAllowedTools() { return [...allow]; }
  });
}
