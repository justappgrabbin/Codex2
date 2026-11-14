import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { FederatedSynthia } from '../federated-synthia.mjs';

const UI_ROOT = fileURLToPath(new URL('../../ui/', import.meta.url));
const MIME = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
});

function stringify(value) {
  return JSON.stringify(value, (_key, member) => {
    if (typeof member === 'bigint') return member.toString();
    if (member instanceof Uint8Array) return { type: 'Uint8Array', length: member.length, values: [...member.slice(0, 256)] };
    if (member instanceof Map) return Object.fromEntries(member);
    if (member instanceof Set) return [...member];
    return member;
  });
}

function reply(response, status, value, contentType = 'application/json; charset=utf-8') {
  const body = contentType.startsWith('application/json') ? stringify(value) : value;
  response.writeHead(status, {
    'content-type': contentType,
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  response.end(body);
}

async function bodyOf(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 5 * 1024 * 1024) throw new RangeError('request body exceeds 5 MiB');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function startSynthiaFrontScreen({ port = Number(process.env.PORT ?? 4173), host = '127.0.0.1', synthia = null } = {}) {
  const organism = synthia ?? await FederatedSynthia.create();
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
      if (request.method === 'GET' && url.pathname === '/api/status') {
        const audit = organism.wiringAudit();
        const readyFields = [
          'oneSemanticEngine', 'localMeshCoordination',
          'independentHands', 'chatPipeline', 'executionAddressResolver',
          'executionTray', 'frontScreenSurface', 'exactAddressRecall',
          'fiveLevelStateSpaceLive', 'nineCenterBody', 'channelMeshBody',
        ];
        const ready = readyFields.every((field) => audit[field] === true)
          && audit.federation?.links > 0
          && audit.localMeshes > 1;
        return reply(response, 200, {
          ok: ready,
          auditComplete: audit.ok,
          feedbackCycleActivated: audit.autonomyLoop,
          identity: 'Synthia',
          purpose: 'cultivation',
          audit,
          counts: {
            liveProcesses: audit.liveProcessCount,
            hands: audit.integratedHandCount,
            meshes: audit.localMeshes,
            channels: audit.channelBody.channelMeshes,
            centers: audit.centerBody.centers,
            instruments: organism.hands().stateSpaceInstruments.length,
          },
          dimensions: ['Movement', 'Evolution', 'Being', 'Design', 'Space'],
        });
      }
      if (request.method === 'GET' && url.pathname === '/api/tray') {
        return reply(response, 200, { ok: true, instruments: organism.trayCatalog() });
      }
      if (request.method === 'GET' && url.pathname === '/api/channels') {
        return reply(response, 200, { ok: true, ...organism.channelBody.snapshot() });
      }
      if (request.method === 'GET' && url.pathname === '/api/proposals') {
        return reply(response, 200, {
          ok: true,
          audit: organism.system.proposals.audit(),
          proposals: organism.system.proposals.records,
        });
      }
      if (request.method === 'POST' && url.pathname === '/api/chat') {
        const body = await bodyOf(request);
        return reply(response, 200, await organism.chat(body.message ?? '', body.context ?? {}));
      }
      if (request.method === 'POST' && url.pathname === '/api/execute') {
        const body = await bodyOf(request);
        return reply(response, 200, await organism.executeArtifact(body.artifact ?? body, body.context ?? {}));
      }
      if (request.method === 'POST' && url.pathname === '/api/tray') {
        return reply(response, 200, await organism.executeTray(await bodyOf(request)));
      }
      if (request.method === 'POST' && url.pathname === '/api/proposals') {
        const body = await bodyOf(request);
        const result = body.operation === 'accept'
          ? organism.system.proposals.accept(body.proposalId, { actor: 'user' })
          : body.operation === 'dismiss'
            ? organism.system.proposals.dismiss(body.proposalId, body.reason, { actor: 'user' })
            : body.operation === 'rollback'
              ? organism.system.proposals.rollback(body.proposalId)
              : { ok: false, error: 'unknown proposal operation' };
        return reply(response, result.ok === false ? 400 : 200, result);
      }
      if (request.method !== 'GET') return reply(response, 405, { ok: false, error: 'method not allowed' });
      const requested = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      if (!/^[a-zA-Z0-9._/-]+$/.test(requested) || requested.includes('..')) {
        return reply(response, 400, { ok: false, error: 'invalid path' });
      }
      const bytes = await readFile(join(UI_ROOT, requested));
      return reply(response, 200, bytes, MIME[extname(requested)] ?? 'application/octet-stream');
    } catch (error) {
      const status = error?.code === 'ENOENT' ? 404 : error instanceof SyntaxError || error instanceof TypeError || error instanceof RangeError ? 400 : 500;
      return reply(response, status, { ok: false, error: error.message, code: error.code ?? null });
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  const address = server.address();
  const actualPort = typeof address === 'object' ? address.port : port;
  return Object.freeze({ server, synthia: organism, url: `http://${host}:${actualPort}` });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const started = await startSynthiaFrontScreen();
  console.log(`Synthia front screen: ${started.url}`);
}

export default startSynthiaFrontScreen;
