// Adaptive cycle for the resident Computer. No network, model, or UI assumptions.
// Capabilities are supplied by the host; this module never executes generated code.
export class SwarmAdaptiveCycle {
  constructor({ capabilities, persistence, clock = () => new Date().toISOString() }) {
    if (!capabilities || typeof capabilities !== 'object') throw new TypeError('capabilities required');
    if (!persistence || typeof persistence.load !== 'function' || typeof persistence.save !== 'function') throw new TypeError('persistent load/save required');
    this.capabilities = capabilities;
    this.persistence = persistence;
    this.clock = clock;
  }
  async load() {
    const state = await this.persistence.load();
    return state ?? { version: 1, goal: null, preference: null, history: [], active: null };
  }
  async start({ goal, preference = null }) {
    if (typeof goal !== 'string' || !goal.trim()) throw new TypeError('nonempty goal required');
    const state = await this.load();
    state.goal = goal.trim();
    state.preference = preference;
    await this.persistence.save(state);
    return this.adapt();
  }
  async adapt({ feedback = null } = {}) {
    const state = await this.load();
    if (!state.goal) throw new Error('No goal has been admitted');
    if (feedback !== null) {
      if (typeof feedback !== 'object' || typeof feedback.message !== 'string') throw new TypeError('feedback.message required');
      state.history.push({ type: 'feedback', message: feedback.message, at: this.clock() });
      // Explicit preference only: do not infer a psychological profile from user language.
      if (feedback.preferredFormat !== undefined) state.preference = feedback.preferredFormat;
    }
    const options = Object.entries(this.capabilities).filter(([, cap]) =>
      cap && typeof cap.canHandle === 'function' && typeof cap.prepare === 'function');
    const candidates = [];
    for (const [name, cap] of options) {
      if (await cap.canHandle({ goal: state.goal, preference: state.preference, feedback })) candidates.push(name);
    }
    if (!candidates.length) {
      state.history.push({ type: 'blocked', reason: 'no-capability', at: this.clock() });
      await this.persistence.save(state);
      return { status: 'blocked', reason: 'no-capability', state };
    }
    // Stable capability selection until the host supplies a validated ranking policy.
    const selected = state.preference && candidates.includes(state.preference) ? state.preference : candidates[0];
    const proposal = await this.capabilities[selected].prepare({ goal: state.goal, preference: state.preference, feedback });
    if (!proposal || typeof proposal !== 'object') throw new TypeError('capability must return a proposal');
    const record = { type: 'prepared', capability: selected, at: this.clock(), proposal };
    state.history.push(record);
    state.active = { capability: selected, proposal };
    await this.persistence.save(state);
    return { status: 'prepared', capability: selected, proposal, state };
  }
  async apply({ approve = false } = {}) {
    if (approve !== true) return { status: 'approval-required' };
    const state = await this.load();
    const active = state.active;
    if (!active) return { status: 'nothing-prepared' };
    const capability = this.capabilities[active.capability];
    if (typeof capability?.execute !== 'function' || typeof capability?.verify !== 'function')
      return { status: 'blocked', reason: 'execution-or-verification-unavailable' };
    try {
      const result = await capability.execute(active.proposal);
      const verified = await capability.verify({ proposal: active.proposal, result });
      state.history.push({ type: verified ? 'verified' : 'failed', capability: active.capability, at: this.clock() });
      if (verified) state.active = null;
      await this.persistence.save(state);
      return { status: verified ? 'verified' : 'failed', result };
    } catch (error) {
      state.history.push({ type: 'failed', capability: active.capability, reason: String(error.message), at: this.clock() });
      await this.persistence.save(state);
      return { status: 'failed', error: String(error.message) };
    }
  }
}
