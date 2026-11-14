// src/core/address.js
/**
 * CanonicalAddress: candidate recursive address per §6.
 * Independent from primitive — the architecture supports addresses
 * without requiring the scientific hypothesis concerning those addresses.
 */
export class CanonicalAddress {
  constructor({
    planetaryDimension = null,
    gate = null,
    line = null,
    color = null,
    tone = null,
    base = null,
    degree = null,
    minute = null,
    second = null,
    arcSecond = null,
    zodiac = null,
    house = null,
  } = {}) {
    Object.assign(this, {
      planetaryDimension,
      gate,
      line,
      color,
      tone,
      base,
      degree,
      minute,
      second,
      arcSecond,
      zodiac,
      house,
    });

    Object.freeze(this);
  }

  toString() {
    const parts = [];
    if (this.planetaryDimension != null) parts.push(`PD:${this.planetaryDimension}`);
    if (this.gate != null) parts.push(`G:${this.gate}`);
    if (this.line != null) parts.push(`L:${this.line}`);
    if (this.color != null) parts.push(`C:${this.color}`);
    if (this.tone != null) parts.push(`T:${this.tone}`);
    if (this.base != null) parts.push(`B:${this.base}`);
    if (this.degree != null) parts.push(`Deg:${this.degree}`);
    if (this.minute != null) parts.push(`Min:${this.minute}`);
    if (this.second != null) parts.push(`Sec:${this.second}`);
    if (this.arcSecond != null) parts.push(`Arc:${this.arcSecond}`);
    if (this.zodiac != null) parts.push(`Z:${this.zodiac}`);
    if (this.house != null) parts.push(`H:${this.house}`);
    return parts.join(" / ") || "(unaddressed)";
  }

  toJSON() {
    return { ...this };
  }

  static fromJSON(data) {
    return new CanonicalAddress(data);
  }
}
