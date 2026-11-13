import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { NODE_IMAGE } from '../computer/services/construction-worker.mjs';
const env = { ...process.env };
for (const key of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[key];
const host = process.platform === 'win32' ? 'npipe:////./pipe/docker_engine' : 'unix:///var/run/docker.sock';
const result = await promisify(execFile)('docker', [`--host=${host}`, 'pull', NODE_IMAGE], { env, timeout: 300000, maxBuffer: 100000 });
console.log(result.stdout, result.stderr);
