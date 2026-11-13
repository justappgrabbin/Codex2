import { createHash } from 'node:crypto';

/** Adapt the donor's existing get/put/delete contract to the resident StateStore.
 * Earlier revisions are retained; deletion is a tombstone, not evidence erasure. */
export class ResidentCheckpointStore {
  constructor(state) { this.state = state; this.pending = Promise.resolve(); }
  key(value) {
    if (typeof value !== 'string' || !value || value.length > 256) throw new TypeError('Bounded checkpoint key required');
    return Buffer.from(value).toString('hex');
  }
  async get(key) { return this.state.get(`computer.automataCheckpoints.items.${this.key(key)}`, null); }
  put(key, value) {
    const encoded = this.key(key), snapshot = structuredClone(value);
    const write = async () => {
      const data = this.state.get('computer.automataCheckpoints', { items: {}, history: [] });
      const digest = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
      data.items[encoded] = snapshot;
      data.history.push({ key, digest, at: Date.now(), value: snapshot });
      await this.state.set('computer.automataCheckpoints', data, { source: 'donor-swarm-checkpoint' });
      return true;
    };
    const result = this.pending.then(write, write); this.pending = result.catch(() => {}); return result;
  }
  async delete(key) { await this.put(key, null); return true; }
}
