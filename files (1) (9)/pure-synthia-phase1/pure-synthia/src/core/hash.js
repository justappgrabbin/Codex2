import { createHash } from "node:crypto";

/**
 * Stable JSON stringify: sorts object keys recursively so that
 * two structurally-identical objects always serialize identically,
 * regardless of property insertion order.
 */
export function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const keys = Object.keys(value).sort();
  const body = keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
    .join(",");
  return `{${body}}`;
}

/**
 * Deterministic content hash. Same logical content -> same hash,
 * every time, on every machine. Never uses Math.random/Date.now,
 * per Appendix I.3's determinism requirement.
 */
export function contentHash(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}
