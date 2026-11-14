// src/operators/registry.js
import { createBundleOperator } from "./bundle.js";
import { createSequenceOperator } from "./sequence.js";
import { createProjectOperator } from "./project.js";
import { createTransformOperator } from "./transform.js";
import { createRecurseOperator } from "./recurse.js";

export class OperatorRegistry {
  constructor() {
    this.operators = new Map();
    this.register(createBundleOperator());
    this.register(createSequenceOperator());
    this.register(createProjectOperator());
    this.register(createTransformOperator());
    this.register(createRecurseOperator());
  }

  register(operator) {
    this.operators.set(operator.id, operator);
    return this;
  }

  get(id) {
    return this.operators.get(id) || null;
  }

  list() {
    return Array.from(this.operators.values());
  }

  findForScale(scale) {
    return this.list().filter(op => op.scales.includes(scale));
  }

  toJSON() {
    return this.list().map(op => op.toJSON());
  }
}
