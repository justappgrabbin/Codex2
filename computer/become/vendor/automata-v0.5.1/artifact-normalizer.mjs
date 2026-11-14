
import { detectForeignFormat } from './foreign-format-registry.mjs';

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

function isBlobLike(value) {
  return value && typeof value === 'object' && typeof value.arrayBuffer === 'function';
}

function looksUtf8(bytes) {
  if (!bytes?.length) return true;
  const sample = bytes.subarray(0, Math.min(bytes.length, 4096));
  let controls = 0;
  for (const value of sample) {
    if (value === 0) return false;
    if (value < 9 || (value > 13 && value < 32)) controls += 1;
  }
  return controls / sample.length < 0.03;
}

export function detectArtifactKind({ name = '', mime = '', bytes = new Uint8Array(), text = '' } = {}) {
  const descriptor = detectForeignFormat({ name, mime, bytes, text });
  if (descriptor.kind !== 'unknown') return descriptor.kind;
  const trimmed = String(text ?? '').trim();
  if (trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
    try { JSON.parse(trimmed); return 'json'; } catch {}
  }
  if (text || looksUtf8(bytes)) return 'text';
  return 'binary';
}

export async function normalizeArtifact(input, { name = null, mime = null } = {}) {
  let original = input;
  let resolvedName = name ?? input?.name ?? input?.originalName ?? input?.filename ?? 'artifact';
  let resolvedMime = mime ?? input?.type ?? input?.mime ?? '';
  let bytes;
  let text = '';

  if (typeof input === 'string') {
    text = input;
    bytes = textEncoder.encode(input);
  } else if (input instanceof Uint8Array) {
    bytes = input;
  } else if (input instanceof ArrayBuffer) {
    bytes = new Uint8Array(input);
  } else if (isBlobLike(input)) {
    bytes = new Uint8Array(await input.arrayBuffer());
  } else if (input?.bytes instanceof Uint8Array) {
    bytes = input.bytes;
    text = typeof input.content === 'string'
      ? input.content
      : typeof input.originalContent === 'string'
        ? input.originalContent
        : typeof input.text === 'string'
          ? input.text
          : '';
  } else if (input?.bytes instanceof ArrayBuffer) {
    bytes = new Uint8Array(input.bytes);
    text = typeof input.content === 'string' ? input.content : '';
  } else if (typeof input?.content === 'string') {
    text = input.content;
    bytes = textEncoder.encode(text);
  } else if (input && typeof input === 'object') {
    // Structured objects are a legitimate primitive input, not just a filename class.
    text = JSON.stringify(input);
    bytes = textEncoder.encode(text);
    if (!resolvedMime) resolvedMime = 'application/json';
  } else {
    text = String(input ?? '');
    bytes = textEncoder.encode(text);
  }

  if (!text && looksUtf8(bytes)) {
    try { text = textDecoder.decode(bytes); } catch {}
  }

  let format = detectForeignFormat({
    name: resolvedName,
    mime: resolvedMime,
    bytes,
    text,
  });
  let kind = format.kind;
  if (kind === 'unknown') {
    const trimmed = String(text ?? '').trim();
    if (trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
      try {
        JSON.parse(trimmed);
        kind = 'json';
        format = Object.freeze({
          kind:'json', family:'data', executable:false, container:false,
          confidence:0.85, evidence:Object.freeze(['content:json']),
          sourceLanguage:null, model:false, media:false, database:false,
        });
      } catch {}
    }
  }
  if (kind === 'unknown' && (text || looksUtf8(bytes))) {
    kind = 'text';
    format = Object.freeze({
      kind:'text', family:'data', executable:false, container:false,
      confidence:0.7, evidence:Object.freeze(['content:utf8']),
      sourceLanguage:null, model:false, media:false, database:false,
    });
  }
  if (kind === 'unknown') {
    kind = 'binary';
    format = Object.freeze({
      kind:'binary', family:'binary', executable:false, container:false,
      confidence:0.25, evidence:Object.freeze(['fallback:binary']),
      sourceLanguage:null, model:false, media:false, database:false,
    });
  }

  return Object.freeze({
    name: String(resolvedName),
    mime: String(resolvedMime || 'application/octet-stream'),
    kind,
    format,
    size: bytes.byteLength,
    bytes,
    text,
    original,
  });
}

export function textBytes(text = '') {
  return textEncoder.encode(String(text));
}
