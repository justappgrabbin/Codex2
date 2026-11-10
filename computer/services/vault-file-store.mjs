/**
 * WIRE — disk store for Alexis's PersonalVault.
 *
 * Her IndexedDBVaultStore persists in a browser. Her MemoryVaultStore forgets
 * when the process stops. Node on this computer has no IndexedDB, so this
 * store speaks the same get/put/delete/values/entries methods and writes the
 * vault with her JsonFilePersistence. PersonalVault.mjs is not modified.
 * Byte arrays are stored as base64 so a restart returns real Uint8Arrays.
 */
import { JsonFilePersistence } from '../runtime/json-file-persistence.mjs';

const IMMUTABLE = new Set(['originals', 'hashIndex']);

function freezeBytes(value) {
  if (value instanceof Uint8Array) return { __bytes: Buffer.from(value).toString('base64') };
  if (Array.isArray(value)) return value.map(freezeBytes);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = freezeBytes(item);
    return out;
  }
  return value;
}

function revive(value) {
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === 'object') {
    if (typeof value.__bytes === 'string' && Object.keys(value).length === 1) {
      return new Uint8Array(Buffer.from(value.__bytes, 'base64'));
    }
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = revive(item);
    return out;
  }
  return value;
}

export class FileVaultStore {
  constructor(filePath) {
    this.persistence = new JsonFilePersistence(filePath);
    this.data = {};
    this.ready = this.load();
  }

  async load() {
    const saved = await this.persistence.load('codex2-vault');
    this.data = saved && typeof saved === 'object' ? revive(saved) : {};
    return this.data;
  }

  bucket(store) {
    if (!this.data[store] || typeof this.data[store] !== 'object' || Array.isArray(this.data[store])) {
      this.data[store] = {};
    }
    return this.data[store];
  }

  async get(store, key) {
    await this.ready;
    const value = this.bucket(store)[key];
    return value === undefined ? null : structuredClone(value);
  }

  async put(store, key, value, { overwrite = true } = {}) {
    await this.ready;
    const bucket = this.bucket(store);
    if (bucket[key] !== undefined && (IMMUTABLE.has(store) || !overwrite)) {
      throw new Error(`Immutable record already exists: ${store}/${key}`);
    }
    bucket[key] = structuredClone(value);
    await this.persist();
    return structuredClone(bucket[key]);
  }

  async delete(store, key) {
    await this.ready;
    if (IMMUTABLE.has(store)) throw new Error(`Immutable store cannot delete: ${store}/${key}`);
    delete this.bucket(store)[key];
    await this.persist();
  }

  async values(store) {
    await this.ready;
    return Object.values(this.bucket(store)).map((value) => structuredClone(value));
  }

  async entries(store) {
    await this.ready;
    return Object.entries(this.bucket(store)).map(([key, value]) => [key, structuredClone(value)]);
  }

  async persist() {
    await this.persistence.save('codex2-vault', freezeBytes(this.data));
  }
}
