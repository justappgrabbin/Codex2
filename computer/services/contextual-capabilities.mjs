// Applicability metadata belongs to the resident StateStore and registry.
// Digests identify content only; they do not supply semantic meaning.
const KEY = 'computer.contextual';
const copy = value => structuredClone(value);
export class ContextualCapabilities {
  constructor(computer) { this.computer = computer; this.pending = Promise.resolve(); }
  serialize(fn) {
    const result = this.pending.then(fn, fn);
    this.pending = result.catch(() => {});
    return result;
  }
  data() { return this.computer.state.get(KEY, { records: {}, environment: {}, history: [], verificationQueue: [] }); }
  list() { return Object.values(this.data().records); }
  get(id) { return this.data().records[id] ?? null; }
  async boot() {
    await this.serialize(async () => { const data = this.data(); this.evaluate(data, 'restart'); await this.save(data); });
    this.unsubscribe = this.computer.bus.on('environment:changed', event => {
      this.updateEnvironment(event.payload).catch(error => this.computer.bus.emit('contextual:error', { error: error.message }));
    });
    return this;
  }
  save(data) { return this.computer.state.set(KEY, data, { source: 'contextual-capabilities' }); }
  register(input) {
    return this.serialize(async () => {
      if (!/^[\w:-]{1,180}$/.test(input?.id ?? '') || !input.source || !input.digest)
        throw new TypeError('Stable ID, source and content digest required');
      const data = this.data(), prior = data.records[input.id];
      if (prior && JSON.stringify(prior.source) !== JSON.stringify(input.source)) throw new TypeError('Source identity cannot be replaced');
      const changed = prior && prior.digest !== input.digest;
      const record = { inputs: [], outputs: [], dependencies: [], permissions: [], environment: [], related: [],
        evidence: [], meaning: null, outstandingWork: [], lastSuccessfulExecution: null,
        factualValidity: 'UNVERIFIED', securityEligibility: 'UNVERIFIED', verification: null,
        ...prior, ...copy(input), createdAt: prior?.createdAt ?? Date.now() };
      if (changed) { record.verification = null; record.factualValidity = 'UNVERIFIED'; }
      // Registration cannot grant trust or forge a verification receipt.
      record.securityEligibility = changed ? 'UNVERIFIED' : prior?.securityEligibility ?? 'UNVERIFIED';
      record.verification = changed ? null : prior?.verification ?? null;
      record.factualValidity = changed ? 'UNVERIFIED' : prior?.factualValidity ?? 'UNVERIFIED';
      data.records[input.id] = record;
      this.evaluate(data, changed ? 'source-revision' : 'discovery'); await this.save(data);
      return this.get(input.id);
    });
  }
  updateEnvironment(patch) {
    return this.serialize(async () => {
      if (!patch || Object.values(patch).some(value => typeof value !== 'boolean')) throw new TypeError('Observed environment flags must be boolean');
      const data = this.data(); Object.assign(data.environment, patch);
      this.evaluate(data, 'environment-change'); await this.save(data); return this.list();
    });
  }
  review(id, { eligible, evidence }) {
    return this.serialize(async () => {
      const data = this.data(), record = data.records[id];
      if (!record || typeof eligible !== 'boolean' || !evidence) throw new TypeError('Explicit security review evidence required');
      record.securityEligibility = eligible ? 'ELIGIBLE' : 'BLOCKED';
      record.evidence.push({ kind: 'security-review', evidence, at: Date.now() });
      this.evaluate(data, 'security-review'); await this.save(data); return this.get(id);
    });
  }
  verify(id, receipt) {
    return this.serialize(async () => {
      const data = this.data(), record = data.records[id];
      if (!record || receipt?.digest !== record.digest || typeof receipt.ok !== 'boolean' || !receipt.checks?.length)
        throw new TypeError('Verification must identify the current digest and actual checks');
      record.verification = copy(receipt);
      record.factualValidity = receipt.ok ? 'VERIFIED' : 'FAILED_VERIFICATION';
      if (receipt.ok) record.lastSuccessfulExecution = receipt.at ?? Date.now();
      this.evaluate(data, 'verification'); await this.save(data); return this.get(id);
    });
  }
  evaluate(data, cause) {
    const resolved = new Map();
    const stateOf = (record, trail = new Set()) => {
      if (resolved.has(record.id)) return resolved.get(record.id);
      if (trail.has(record.id)) return { state: 'BLOCKED', reasons: ['Dependency cycle requires review'] };
      const next = new Set([...trail, record.id]);
      let result;
      if (record.securityEligibility === 'BLOCKED') result = { state: 'BLOCKED', reasons: ['Security review denied execution'] };
      else if (record.factualValidity === 'FAILED_VERIFICATION') result = { state: 'FAILED_VERIFICATION', reasons: ['Current content failed verification'] };
      else {
        const missing = [...record.environment, ...record.permissions].filter(key => data.environment[key] !== true);
        const dependencies = record.dependencies.filter(id => !data.records[id] || stateOf(data.records[id], next).state !== 'ACTIVE');
        if (missing.length || dependencies.length) result = { state: 'DEFERRED', reasons: [...missing.map(key => `Unavailable condition: ${key}`), ...dependencies.map(id => `Dependency not active: ${id}`)] };
        else if (record.securityEligibility !== 'ELIGIBLE' || record.verification?.digest !== record.digest || record.verification?.ok !== true)
          result = { state: 'UNVERIFIED', reasons: ['Current source requires security eligibility and verification'] };
        else result = { state: 'ACTIVE', reasons: [] };
      }
      resolved.set(record.id, result); return result;
    };
    for (const record of Object.values(data.records)) {
      const prior = record.applicability, result = stateOf(record);
      Object.assign(record, { applicability: result.state, reasons: result.reasons,
        reevaluateOn: [...record.environment, ...record.permissions, ...record.dependencies, 'source-revision', 'security-review', 'verification'] });
      if (prior !== result.state) data.history.push({ id: record.id, from: prior ?? null, to: result.state, cause, at: Date.now(), reasons: result.reasons });
      this.computer.capabilityRegistry.register(record.id, { ...copy(record), providers: ['contextual-capabilities'], requires: record.dependencies }, { replace: true });
    }
    data.verificationQueue = Object.values(data.records).filter(record => record.applicability === 'UNVERIFIED').map(record => ({ id: record.id, digest: record.digest, action: 'review-and-verify', executable: false }));
    this.computer.bus.emit('contextual:reevaluated', { cause, transitions: data.history.length });
  }
}
