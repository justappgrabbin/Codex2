// Bit swarm: units are boolean vectors; everything they do is the owner's
// 16-function Boolean operator bank (UPGRADES/shared/boolean-operator-bank.mjs,
// imported unmodified). No JavaScript is translated here — the bits compute.
//
//   being B        what a unit can do (capability bits, latent until switched on)
//   position P     where it sits (mask of what the place allows)
//   relations R    who it is connected to, each with the operator that relation uses
//   expression     E = I(B, R, P): computed every tick with the bank, never stored
//
// Halves follow the owner's trigram rule: lower half = inward (self), upper half = outward.
// A relation forms where one unit's outward half completes another's inward half.
// A pair that co-expresses COMPOSE_AFTER times composes into a new unit (relational-mesh rule).
// Every change is recorded with which bits changed and which were preserved.
// PROVISIONAL (marked, replaceable): the operator each relation kind uses, the thresholds.
import { applyBinary, not, toBitString } from '../donors/recovered/synthai-r21.22-self-cultivation-graph-integrated/UPGRADES/shared/boolean-operator-bank.mjs';

export const COMPOSE_AFTER = 3;
export const RELATION_OPERATOR = Object.freeze({   // PROVISIONAL
  complete: 'or',          // a completed channel: both halves contribute
  gate: 'and',             // context switches capability on only where both agree
  influence: 'a_implies_b',// directed: the viewer (left) conditions the other; A·B ≠ B·A
  contrast: 'xor',         // what differs
  agree: 'xnor',           // what matches
});

const ones = bits => bits.reduce((a, b) => a + b, 0);
const half = (bits, which) => { const h = bits.length / 2; return which === 'in' ? bits.slice(0, h) : bits.slice(h); };
const zeros = n => Object.freeze(Array(n).fill(0));

export class BitSwarm {
  constructor({ width = 12, composeAfter = COMPOSE_AFTER } = {}) {
    if (width % 2) throw new TypeError('width must be even (inward half + outward half)');
    this.width = width; this.composeAfter = composeAfter;
    this.units = new Map(); this.relations = new Map(); this.history = []; this.t = 0; this.composed = 0;
  }
  vec(v) { const b = Array.isArray(v) ? v : [...String(v)].map(Number); if (b.length !== this.width) throw new TypeError(`expected ${this.width} bits`); return Object.freeze(b.map(Number)); }

  add(id, { being, position = null }) {
    this.units.set(id, { id, B: this.vec(being), P: position ? this.vec(position) : Object.freeze(Array(this.width).fill(1)), E: zeros(this.width), born: this.t });
    return this;
  }
  move(id, position) { const u = this.units.get(id); u.P = this.vec(position); return this; }

  /** Complementarity: how many of a's outward bits land on b's inward bits. */
  fit(a, b) { return ones(applyBinary('and', half(a.B, 'out'), half(b.B, 'in'))); }

  /** Discover: relations form where halves complete each other; they dissolve when they no longer fit. */
  discover() {
    const us = [...this.units.values()];
    for (const a of us) for (const b of us) {
      if (a === b) continue; const key = `${a.id}>${b.id}`, f = this.fit(a, b);
      if (f > 0 && !this.relations.has(key)) this.relations.set(key, { from: a.id, to: b.id, kind: 'complete', fit: f, co: 0 });
      if (f === 0 && this.relations.has(key) && !this.relations.get(key).fixed) this.relations.delete(key);
    }
  }
  relate(from, to, kind) { this.relations.set(`${from}>${to}`, { from, to, kind, fit: null, co: 0, fixed: true }); return this; }

  /** E = I(B, R, P): what the relationships bring in, gated by place, applied to being. */
  express(u) {
    let context = zeros(this.width);
    for (const r of this.relations.values()) if (r.to === u.id) {
      const src = this.units.get(r.from); if (!src) continue;
      // incoming outward half arrives on this unit's inward half
      const arriving = r.kind === 'complete' ? [...half(src.B, 'out'), ...half(src.B, 'out')] : src.B;
      context = applyBinary(r.kind === 'complete' ? 'or' : RELATION_OPERATOR[r.kind], context, applyBinary(RELATION_OPERATOR.gate, arriving, u.B));
    }
    // alone, a unit expresses only its outward half (what it shows); relations switch on the rest
    const alone = [...zeros(this.width / 2), ...half(u.B, 'out')];
    return applyBinary('and', applyBinary('or', alone, context), u.P);
  }

  /** One step of Φ: discover, express, observe, compose. */
  step() {
    this.t++; this.discover();
    const changes = [];
    const next = new Map([...this.units.values()].map(u => [u.id, this.express(u)]));
    for (const [id, E] of next) {
      const u = this.units.get(id), before = u.E;
      const changed = [], kept = [];
      E.forEach((bit, i) => (bit !== before[i] ? changed : kept).push(i));
      if (changed.length) changes.push({ t: this.t, unit: id, from: toBitString(before), to: toBitString(E), changed, preserved: kept });
      u.E = E;
    }
    // observe co-expression on each relation; compose when it repeats
    for (const r of [...this.relations.values()]) {
      const a = this.units.get(r.from), b = this.units.get(r.to); if (!a || !b) continue;
      const both = ones(a.E) > 0 && ones(applyBinary('and', b.E, [...half(b.B, 'in'), ...zeros(this.width / 2)])) > 0;
      r.co = both ? r.co + 1 : 0;
      const cid = `${r.from}+${r.to}`;
      if (r.co >= this.composeAfter && !this.units.has(cid)) {
        // the new unit's being: what each brings, the viewer (from) first — directed, not symmetric
        const B = applyBinary('or', applyBinary(RELATION_OPERATOR.influence, a.B, b.B), applyBinary('and', a.B, b.B));
        this.add(cid, { being: B, position: applyBinary('or', a.P, b.P) }); this.composed++;
        changes.push({ t: this.t, composed: cid, from: r.from, to: r.to, being: toBitString(B) });
      }
    }
    this.history.push(...changes);
    return changes;
  }

  run(n = 1) { const all = []; for (let i = 0; i < n; i++) all.push(...this.step()); return all; }
  snapshot() { return [...this.units.values()].map(u => ({ id: u.id, being: toBitString(u.B), expressed: toBitString(u.E), position: toBitString(u.P) })); }
}

/** Expression as pixels: each unit's expressed bits drawn as a row of cells (the swarm is the picture). */
export function bitsToCells(swarm, { on = [185, 166, 255], off = [21, 20, 31] } = {}) {
  return [...swarm.units.values()].map(u => u.E.map(b => (b ? on : off)));
}
export default BitSwarm;
