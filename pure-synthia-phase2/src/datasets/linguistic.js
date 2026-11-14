// src/datasets/linguistic.js
/**
 * Linguistic Datasets (Appendix H.3.2)
 * Progressively structured linguistic observations.
 */

export class LinguisticDataset {
  constructor() {
    this.name = "linguistic-phase2";
    this.items = [];
  }

  // Minimal pairs for contrastive analysis
  minimalPairs() {
    const pairs = [
      { word1: "bat", word2: "pat", contrast: "voice", feature: "f.voice" },
      { word1: "din", word2: "tin", contrast: "voice", feature: "f.voice" },
      { word1: "mat", word2: "bat", contrast: "manner", feature: "f.manner.nas" },
      { word1: "pat", word2: "tat", contrast: "place", feature: "f.place.lab" },
      { word1: "tin", word2: "kin", contrast: "place", feature: "f.place.alv" },
    ];

    const items = pairs.map(p => ({
      input: [p.word1, p.word2],
      expected: { contrast: p.contrast, feature: p.feature },
      type: "minimal_pair",
    }));

    this.items.push(...items);
    return items;
  }

  // Morphologically related word families
  wordFamilies() {
    const families = [
      { root: "act", forms: ["act", "acting", "acted", "actor", "action"] },
      { root: "love", forms: ["love", "loving", "loved", "lover", "lovely"] },
      { root: "read", forms: ["read", "reading", "reader", "readable"] },
    ];

    const items = families.map(f => ({
      input: f.forms,
      expected: { root: f.root, familySize: f.forms.length },
      type: "word_family",
    }));

    this.items.push(...items);
    return items;
  }

  // Controlled sentences
  controlledSentences() {
    const sentences = [
      { text: "The cat sleeps.", structure: "DET NOUN VERB", tokens: ["The", "cat", "sleeps"] },
      { text: "A dog runs fast.", structure: "DET NOUN VERB ADV", tokens: ["A", "dog", "runs", "fast"] },
      { text: "The big cat sleeps.", structure: "DET ADJ NOUN VERB", tokens: ["The", "big", "cat", "sleeps"] },
    ];

    const items = sentences.map(s => ({
      input: s.text,
      expected: { structure: s.structure, tokens: s.tokens },
      type: "sentence",
    }));

    this.items.push(...items);
    return items;
  }

  split(ratios = { discovery: 0.6, validation: 0.2, test: 0.2 }) {
    const shuffled = [...this.items].sort(() => Math.random() - 0.5);
    const dEnd = Math.floor(shuffled.length * ratios.discovery);
    const vEnd = dEnd + Math.floor(shuffled.length * ratios.validation);

    return {
      discovery: shuffled.slice(0, dEnd),
      validation: shuffled.slice(dEnd, vEnd),
      test: shuffled.slice(vEnd),
      name: this.name,
    };
  }

  toJSON() {
    return { name: this.name, items: this.items };
  }
}
