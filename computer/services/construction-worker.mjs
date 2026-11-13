import { mkdir, mkdtemp, writeFile, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { digest, safePath } from './project-research.mjs';
const exec = promisify(execFile);
let executionQueue = Promise.resolve();
export const NODE_IMAGE = 'node@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee';
const KEY = 'computer.construction';
const dockerEnv = () => {
  const env = { ...process.env };
  for (const key of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[key];
  return env;
};
const docker = args => exec('docker', [process.platform === 'win32' ? '--host=npipe:////./pipe/docker_engine' : '--host=unix:///var/run/docker.sock', ...args], { env: dockerEnv(), timeout: 65000, maxBuffer: 250000 });
export class DockerProjectRunner {
  async cancel(jobId) { await docker(['rm', '-f', `synthia-${jobId}`]).catch(() => {}); }
  async available() {
    try { await docker(['image', 'inspect', NODE_IMAGE]); return { available: true, image: NODE_IMAGE }; }
    catch (error) { return { available: false, image: NODE_IMAGE, reason: String(error.message).slice(0, 1000) }; }
  }
  run(files, jobId, options) {
    const result = executionQueue.then(() => this.executeFiles(files, jobId, options));
    executionQueue = result.catch(() => {});
    return result;
  }
  async executeFiles(files, jobId, { command = 'npm run build && npm test', checks = ['npm run build', 'npm test'] } = {}) {
    const directory = await mkdtemp(join(tmpdir(), 'synthia-job-'));
    const container = `synthia-${jobId}`;
    try {
      await chmod(directory, 0o755);
      for (const file of files) {
        const target = join(directory, safePath(file.path));
        await mkdir(dirname(target), { recursive: true }); await writeFile(target, file.content, { mode: 0o444 });
        await chmod(target, 0o444);
        for (let folder = dirname(target); folder !== directory; folder = dirname(folder)) await chmod(folder, 0o755);
      }
      // Source is read-only. All writes and child processes stay in a disposable
      // container with no network, host credentials, daemon socket or host output mount.
      const args = ['run', '--name', container, '--pull=never', '--network=none', '--read-only', '--cap-drop=ALL',
        '--security-opt=no-new-privileges', '--pids-limit=64', '--memory=256m', '--cpus=1', '--user=65534:65534',
        '--env=HOME=/tmp', ...['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy'].map(key => `--env=${key}=`),
        '--tmpfs=/work:rw,exec,size=100m,mode=1777', '--tmpfs=/tmp:rw,noexec,size=16m,mode=1777',
        '--mount', `type=bind,src=${directory},dst=/input,readonly`, '--workdir=/work', NODE_IMAGE,
        '/usr/bin/timeout', '-s', 'KILL', '60', 'sh', '-c', 'cp -R /input/. /work/ && ' + command];
      const startedAt = Date.now();
      try {
        const result = await docker(args);
        return { ok: true, exitCode: 0, stdout: result.stdout, stderr: result.stderr, startedAt, finishedAt: Date.now(),
          checks, image: NODE_IMAGE, isolation: 'network-none/read-only-root/non-root/resource-limited', scope: 'Declared commands exited zero; not a proof of arbitrary application behavior' };
      } catch (error) {
        return { ok: false, exitCode: typeof error.code === 'number' ? error.code : null, stdout: error.stdout ?? '', stderr: error.stderr ?? '',
          error: error.message, timedOut: Boolean(error.killed), startedAt, finishedAt: Date.now(), checks, image: NODE_IMAGE };
      }
    } finally {
      await docker(['rm', '-f', container]).catch(() => {});
      await rm(directory, { recursive: true, force: true });
    }
  }
}

/** Bounded PR44 checkpoint/receipt pattern on resident state, PR72-style
 * explicit proposal/approval and contained changes. No second job database. */
export class ConstructionWorker {
  constructor(computer, { runner = new DockerProjectRunner() } = {}) { this.computer = computer; this.runner = runner; this.pending = Promise.resolve(); }
  data() { return this.computer.state.get(KEY, { jobs: {}, events: [], approvals: [], artifacts: {} }); }
  async save(data, type, jobId, detail = {}) {
    data.events.push({ id: crypto.randomUUID(), at: Date.now(), type, jobId, ...detail });
    await this.computer.state.set(KEY, data, { source: 'construction-worker' });
    this.computer.bus.emit(type, { jobId, ...detail });
  }
  serialize(fn) { const result = this.pending.then(fn, fn); this.pending = result.catch(() => {}); return result; }
  boot() {
    return this.serialize(async () => {
      const data = this.data();
      for (const job of Object.values(data.jobs)) if (job.status === 'RUNNING') {
        await this.runner.cancel?.(job.id);
        job.status = 'INTERRUPTED'; job.reason = 'Execution outcome unknown; no automatic retry. Inspect evidence and submit a new approved plan.';
        await this.save(data, 'worker:interrupted', job.id, { reason: job.reason });
      }
      this.computer.processRegistry.register('bounded-construction', { run: ({ input }) => this.run(input.id) }, { replace: true });
      return this;
    });
  }
  propose({ projectId, goal, changes, requestKey }) {
    return this.serialize(async () => {
      if (typeof goal !== 'string' || goal.length < 3 || goal.length > 2000 || typeof requestKey !== 'string' || requestKey.length < 8 || requestKey.length > 200)
        throw new TypeError('Goal and idempotency key (8..200 characters) required');
      if (!Array.isArray(changes) || changes.length > 8) throw new TypeError('At most eight bounded changes');
      let total = 0; const seen = new Set();
      const patch = changes.map(change => {
        const path = safePath(change.path);
        if (seen.has(path) || typeof change.content !== 'string' || change.content.length > 200000) throw new TypeError('Invalid or duplicate change');
        total += change.content.length; seen.add(path); return { path, content: change.content };
      });
      if (total > 500000) throw new RangeError('Changes exceed 500 KB');
      const snapshot = this.computer.projects.snapshot(projectId);
      const files = snapshot.files.map(file => ({ path: safePath(file.path), content: file.content }));
      const sourceDigest = digest(JSON.stringify(files));
      const id = digest(requestKey), data = this.data();
      const spec = { projectId, goal, changes: patch, sourceDigest };
      if (data.jobs[id]) {
        if (JSON.stringify(data.jobs[id].spec) !== JSON.stringify(spec)) throw new TypeError('Idempotency key conflicts with another plan/source revision');
        return data.jobs[id];
      }
      const report = this.computer.state.get(`computer.research.reports.${projectId}`);
      if (!report) throw new TypeError('Inspect project before proposing construction');
      const job = { id, spec, files, evidence: { reportId: report.id, digest: report.digest, unresolved: report.unresolved, dependencies: report.dependencies },
        status: 'PROPOSED', attempts: 0, maxAttempts: 1, at: Date.now(), plan: ['Retain immutable project snapshot', 'Apply listed changes in isolated copy', 'Execute npm run build and npm test without network', 'Export source and actual verification receipt'] };
      data.jobs[id] = job; await this.save(data, 'worker:proposed', id); return job;
    });
  }
  approve(id, { decision, planDigest }) {
    return this.serialize(async () => {
      const data = this.data(), job = data.jobs[id];
      if (!job || job.status !== 'PROPOSED' || !['approve', 'deny'].includes(decision) || planDigest !== digest(JSON.stringify(job.spec)))
        throw new TypeError('Approval must match the inspectable current proposal');
      data.approvals.push({ id: crypto.randomUUID(), jobId: id, decision, planDigest, at: Date.now(), scope: 'One isolated local build/test; no publish, network, spending or source overwrite' });
      job.status = decision === 'approve' ? 'APPROVED' : 'DENIED';
      await this.save(data, 'worker:approval', id, { decision }); return job;
    });
  }
  run(id) {
    return this.serialize(async () => {
      let data = this.data(), job = data.jobs[id];
      if (!job || job.status !== 'APPROVED' || job.attempts >= job.maxAttempts) throw new TypeError('An unused explicit approval is required; unsafe retries are refused');
      const available = await this.runner.available();
      if (!available.available) { job.blocker = available; await this.save(data, 'worker:blocked', id, available); return job; }
      const files = new Map(job.files.map(file => [file.path, file]));
      for (const change of job.spec.changes) files.set(change.path, change);
      const candidate = [...files.values()];
      let manifest;
      try { manifest = JSON.parse(files.get('package.json')?.content); } catch { throw new TypeError('A valid package.json is required'); }
      if (!manifest.scripts?.build || !manifest.scripts?.test) throw new TypeError('Project must declare real build and test commands; worker does not invent successful checks');
      job.status = 'RUNNING'; job.attempts++; await this.save(data, 'worker:started', id);
      let result;
      try { result = await this.runner.run(candidate, id); }
      catch (error) { result = { ok: false, checks: ['runner failed'], error: error.message }; }
      // Serialize all state mutations, so a completed receipt cannot overwrite proposals.
      data = this.data(); job = data.jobs[id];
      const receipt = { id: crypto.randomUUID(), jobId: id, ...result, digest: digest(JSON.stringify(candidate)), at: Date.now(),
        inputDigest: job.spec.sourceDigest, sourceProjectId: job.spec.projectId, approval: data.approvals.find(approval => approval.jobId === id && approval.decision === 'approve') };
      job.receipt = receipt; job.status = receipt.ok ? 'VERIFIED' : 'FAILED_VERIFICATION';
      if (receipt.ok) {
        const artifact = { id, kind: 'verified-source-bundle', name: `${job.spec.projectId}-verified.json`, files: candidate, receipt,
          limitation: 'Source bundle and command evidence; generated build outputs are not exported from the container' };
        const admitted = await this.computer.intake.ingest({ name: artifact.name, text: JSON.stringify(artifact), type: 'application/json', source: 'bounded-construction', tags: ['verified-source-bundle', id] });
        data.artifacts[id] = { artifactId: admitted.id, name: artifact.name, kind: artifact.kind, receiptId: receipt.id };
      }
      const capabilityId = `build:${id}`;
      await this.computer.contextual.register({ id: capabilityId, source: { projectId: job.spec.projectId, jobId: id, version: receipt.inputDigest }, digest: receipt.digest,
        related: [`project:${job.spec.projectId}`], evidence: [receipt], outputs: receipt.ok ? ['verified-source-bundle'] : [], environment: ['runtime:node'],
        outstandingWork: receipt.ok ? [] : ['Inspect actual diagnostics; prepare a new bounded plan and approval'] });
      await this.computer.contextual.review(capabilityId, { eligible: true, evidence: { approval: receipt.approval, scope: 'Approved isolated commands only; no host execution' } });
      await this.computer.contextual.verify(capabilityId, receipt);
      await this.save(data, 'worker:finished', id, { status: job.status, receiptId: receipt.id }); return job;
    });
  }
  snapshot() { const data = this.data(); return { ...data, jobs: Object.values(data.jobs).map(job => ({ ...job, planDigest: digest(JSON.stringify(job.spec)) })) }; }
  artifact(id) {
    const reference = this.data().artifacts[id];
    const record = reference && this.computer.artifacts.get(reference.artifactId);
    const file = record && this.computer.vfs.read(record.path);
    return file ? JSON.parse(file.content) : null;
  }
}
