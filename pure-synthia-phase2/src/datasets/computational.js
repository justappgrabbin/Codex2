// src/datasets/computational.js
/**
 * Computational Datasets (Appendix H.3.3)
 * Finite-state machines, expression trees, dependency graphs, compositions.
 */

export class ComputationalDataset {
  constructor() {
    this.name = "computational-phase2";
    this.items = [];
  }

  // Finite state machines as transition tables
  finiteStateMachines() {
    const fsms = [
      {
        states: ["q0", "q1", "q2"],
        alphabet: ["0", "1"],
        transitions: [
          { from: "q0", input: "0", to: "q0" },
          { from: "q0", input: "1", to: "q1" },
          { from: "q1", input: "0", to: "q2" },
          { from: "q1", input: "1", to: "q0" },
          { from: "q2", input: "0", to: "q1" },
          { from: "q2", input: "1", to: "q2" },
        ],
        initial: "q0",
        accepting: ["q0"],
      },
    ];

    const items = fsms.map((fsm, i) => ({
      input: fsm,
      expected: { type: "fsm", stateCount: fsm.states.length },
      type: "finite_state_machine",
    }));

    this.items.push(...items);
    return items;
  }

  // Expression trees
  expressionTrees() {
    const trees = [
      { op: "+", left: { op: "*", left: "a", right: "b" }, right: "c" },
      { op: "-", left: { op: "+", left: "x", right: "y" }, right: "z" },
    ];

    const items = trees.map(t => ({
      input: t,
      expected: { operators: ["+", "*"], leaves: ["a", "b", "c"] },
      type: "expression_tree",
    }));

    this.items.push(...items);
    return items;
  }

  // Compositions of smaller automata
  automataCompositions() {
    const compositions = [
      {
        components: ["counter", "detector"],
        wiring: [{ from: "counter.out", to: "detector.in" }],
        expected: { componentCount: 2, connectionCount: 1 },
      },
    ];

    const items = compositions.map(c => ({
      input: c,
      expected: c.expected,
      type: "automata_composition",
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
