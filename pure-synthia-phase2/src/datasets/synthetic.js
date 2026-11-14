// src/datasets/synthetic.js
/**
 * Synthetic Formal Datasets (Appendix H.3.1)
 * Generated from known finite grammars for ground-truth control.
 */

export class SyntheticDataset {
  constructor(name) {
    this.name = name;
    this.items = [];
  }

  // Balanced delimiters: (), [], {}
  generateBalancedDelimiters(count = 100, maxDepth = 5) {
    const delims = { "(": ")", "[": "]", "{": "}" };
    const openers = Object.keys(delims);
    const items = [];

    for (let i = 0; i < count; i++) {
      let str = "";
      const stack = [];
      const length = 4 + Math.floor(Math.random() * 12);
      for (let j = 0; j < length; j++) {
        if (stack.length === 0 || (Math.random() > 0.5 && stack.length < maxDepth)) {
          const opener = openers[Math.floor(Math.random() * openers.length)];
          str += opener;
          stack.push(opener);
        } else if (stack.length > 0) {
          const opener = stack.pop();
          str += delims[opener];
        }
      }
      while (stack.length > 0) {
        const opener = stack.pop();
        str += delims[opener];
      }
      items.push({ input: str, expected: "balanced", grammar: "delimiter" });
    }

    this.items.push(...items);
    return items;
  }

  // Recursively nested expressions
  generateNestedExpressions(count = 100, maxDepth = 4) {
    const ops = ["+", "-", "*", "/"];
    const items = [];

    function build(depth) {
      if (depth <= 0) return String(Math.floor(Math.random() * 100));
      const left = build(depth - 1);
      const right = build(depth - 1);
      const op = ops[Math.floor(Math.random() * ops.length)];
      return `(${left}${op}${right})`;
    }

    for (let i = 0; i < count; i++) {
      const depth = 1 + Math.floor(Math.random() * maxDepth);
      items.push({ input: build(depth), expected: "expression", grammar: "arithmetic" });
    }

    this.items.push(...items);
    return items;
  }

  // Dependency chains: A -> B -> C implies A ~~> C
  generateDependencyChains(count = 50, chainLength = 5) {
    const items = [];
    for (let i = 0; i < count; i++) {
      const chain = [];
      for (let j = 0; j < chainLength; j++) {
        chain.push(`node_${i}_${j}`);
      }
      items.push({
        input: chain,
        expected: { transitive: [`${chain[0]}~~>${chain[chain.length - 1]}`] },
        grammar: "dependency",
      });
    }
    this.items.push(...items);
    return items;
  }

  // Split into discovery / validation / test
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
