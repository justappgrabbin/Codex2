import { attachGenerativeAssembly } from '../integration/shared-generative-engine.mjs';

/** The Generative authority uses the Computer gateway's existing live engine. */
export class GenerativeAssemblyService {
  constructor({ gateway, state, bus, sourceRoot } = {}) {
    if (!gateway || !state) throw new TypeError('Computer gateway and state are required');
    this.gateway = gateway; this.state = state; this.bus = bus; this.sourceRoot = sourceRoot;
    this.pending = null;
    this.queue = Promise.resolve();
  }
  async connected() {
    if (!this.pending) this.pending = (async () => {
      const engine = await this.gateway.semanticEngine();
      return attachGenerativeAssembly(engine, this.sourceRoot ? { sourceRoot: this.sourceRoot } : {});
    })().catch(error => {
      this.pending = null;
      this.bus?.emit('service:provider-failure', { provider: 'generative-address-system', error: String(error.message) });
      throw error;
    });
    return this.pending;
  }
  async status() {
    const { compatibility, engine, assembly } = await this.connected();
    return { ...compatibility, mountedTools: engine.mesh.automata.size,
      klein: engine.klein.audit(), toolCatalog: assembly.kleinToolCatalog,
      savedAnalyses: this.state.get('computer.generative.analyses', []).length };
  }
  inspect({ text, context = {} } = {}) {
    if (typeof text !== 'string' || !text.trim() || text.length > 50000)
      throw new TypeError('Structure analysis requires 1..50,000 characters of text');
    if (!context || typeof context !== 'object' || Array.isArray(context))
      throw new TypeError('Analysis context must be an object');
    // Serial ordering keeps source-tool observations and persisted receipts causal.
    const run = async () => {
      const { assembly } = await this.connected();
      const result = assembly.structure({ kind: 'computer-text', text }, context);
      const receipt = { id: crypto.randomUUID(), at: new Date().toISOString(),
        source: 'generative-address-system/shared-computer-engine',
        input: { text, context }, derivation: JSON.parse(JSON.stringify(result.derivation)),
        rootEventId: result.rootEventId, trainingRecordId: result.trainingRecordId };
      const prior = this.state.get('computer.generative.analyses', []);
      await this.state.set('computer.generative.analyses', [...prior, receipt], { source: receipt.source });
      this.bus?.emit('generative:structure-observed', { id: receipt.id, derivationId: receipt.derivation.id });
      return receipt;
    };
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => {});
    return result;
  }
  history() { return this.state.get('computer.generative.analyses', []); }
}
