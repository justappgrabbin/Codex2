import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { readFile, stat, appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { JsonFilePersistence } from './json-file-persistence.mjs';
import { EventEmitter } from '../events/event-emitter.mjs';

export async function readStateKey(path) {
  const metadata = await stat(path);
  if (process.platform !== 'win32' && (metadata.mode & 0o077)) throw new Error('State key must be accessible only to its owner (chmod 600)');
  const key = await readFile(path);
  if (key.length !== 32) throw new Error('State key must contain exactly 32 independently generated random bytes');
  return key;
}

class Codec {
  constructor(key) {
    if (!Buffer.isBuffer(key) || key.length !== 32) throw new TypeError('A 32-byte encryption key is required');
    this.key = Buffer.from(key);
  }
  seal(value, domain) {
    const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', this.key, nonce);
    cipher.setAAD(Buffer.from(domain));
    const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return { schema: 'synthia.aes256gcm.v1', nonce: nonce.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
  }
  open(envelope, domain) {
    if (envelope?.schema !== 'synthia.aes256gcm.v1') throw new Error('Encrypted checkpoint envelope is invalid; refusing to initialize empty state');
    const nonce = Buffer.from(envelope.nonce, 'base64'), tag = Buffer.from(envelope.tag, 'base64');
    if (nonce.length !== 12 || tag.length !== 16) throw new Error('Encrypted envelope parameters are invalid');
    const decipher = createDecipheriv('aes-256-gcm', this.key, nonce);
    decipher.setAAD(Buffer.from(domain)); decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.data, 'base64')), decipher.final()]).toString('utf8'));
  }
}

/** Optional persistence implementation; same StateStore, no second memory. */
export class EncryptedFilePersistence {
  constructor(filePath, key) { this.file = new JsonFilePersistence(filePath); this.codec = new Codec(key); }
  async load(namespace) {
    const envelope = await this.file.load(namespace);
    return envelope === undefined ? undefined : this.codec.open(envelope, `state:${namespace}`);
  }
  async save(namespace, value) { return this.file.save(namespace, this.codec.seal(value, `state:${namespace}`)); }
}

/** Optional encrypted implementation of the original event grammar/API. */
export class EncryptedEventEmitter extends EventEmitter {
  constructor({ key, ...options }) { super(options); this.codec = new Codec(key); this.pending = Promise.resolve(); }
  emitEvent(partial = {}) {
    const event = this.buildEvent(partial);
    const write = async () => {
      await mkdir(dirname(this.logPath), { recursive: true, mode: 0o700 });
      await appendFile(this.logPath, JSON.stringify(this.codec.seal(event, 'event-grammar-v1')) + '\n', { mode: 0o600 });
      this.bus?.emit('event:emitted', event); this.bus?.emit(`event:${event.event_type}`, event);
      return event;
    };
    const result = this.pending.then(write, write).catch(error => {
      this.bus?.emit('event:persistence-failure', { event_id: event.event_id, error: error.message }); throw error;
    });
    this.pending = result.catch(() => {}); return result;
  }
  async readAll() {
    await this.pending;
    const text = await readFile(this.logPath, 'utf8').catch(error => { if (error.code === 'ENOENT') return ''; throw error; });
    return text.split('\n').filter(line => line.trim()).map(line => this.codec.open(JSON.parse(line), 'event-grammar-v1'));
  }
}
