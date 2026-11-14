import { Primitive, PrimitiveRegistry } from "../core/primitive.js";

/**
 * D1 — Feature/phoneme benchmark tier (§H.2 L0/L1, §H.3.2).
 *
 * Assumptions A-D1-01, A-D1-02, A-D1-03 (see assumptions.js) govern
 * this file's structure; consult that registry rather than treating
 * anything here as scientifically settled.
 */

export const featureIds = [
  "f.place.lab",
  "f.place.alv",
  "f.place.vel",
  "f.manner.stop",
  "f.manner.nas",
  "f.manner.fric",
  "f.voice",
  "f.voiceless",
];

export function buildFeatureRegistry() {
  const registry = new PrimitiveRegistry();
  const defs = [
    ["f.place.lab", "labial place"],
    ["f.place.alv", "alveolar place"],
    ["f.place.vel", "velar place"],
    ["f.manner.stop", "stop/plosive manner"],
    ["f.manner.nas", "nasal manner"],
    ["f.manner.fric", "fricative manner"],
    ["f.voice", "voiced"],
    ["f.voiceless", "voiceless"],
  ];
  for (const [id, identity] of defs) {
    registry.register(new Primitive({ id, identity, scale: "feature" }));
  }
  return registry;
}

/** Gold structure: phoneme -> its exactly-3 constituent feature ids. */
export const goldPhonemes = {
  p: ["f.place.lab", "f.manner.stop", "f.voiceless"],
  b: ["f.place.lab", "f.manner.stop", "f.voice"],
  t: ["f.place.alv", "f.manner.stop", "f.voiceless"],
  d: ["f.place.alv", "f.manner.stop", "f.voice"],
  k: ["f.place.vel", "f.manner.stop", "f.voiceless"],
  g: ["f.place.vel", "f.manner.stop", "f.voice"], // held out
  m: ["f.place.lab", "f.manner.nas", "f.voice"],
  n: ["f.place.alv", "f.manner.nas", "f.voice"],
  f: ["f.place.lab", "f.manner.fric", "f.voiceless"],
  v: ["f.place.lab", "f.manner.fric", "f.voice"], // held out
};

// Per A-D1-03.
export const discoverySplit = ["p", "b", "t", "d", "k", "m", "n", "f"];
export const testSplit = ["g", "v"];

export function split() {
  return {
    discovery: discoverySplit.map((id) => ({ id, features: goldPhonemes[id] })),
    test: testSplit.map((id) => ({ id, features: goldPhonemes[id] })),
  };
}
