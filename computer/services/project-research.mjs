import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import { searchEvidence, suggestedActions } from '../integration/fielddesk-evidence.mjs';
import { inspectMajikiSources } from '../integration/majiki-inspection.mjs';
export const digest = text => createHash('sha256').update(text).digest('hex');
export function safePath(path) {
  if (typeof path !== 'string' || path.length > 240 || !/^[\w. /-]+$/.test(path) || path.split('/').some(part => !part || part === '.' || part === '..' || part === '.git') || /^[A-Za-z]:/.test(path))
    throw new TypeError('Use a contained relative project file path');
  return path;
}
export class ProjectResearch {
  constructor(computer) { this.computer = computer; this.pending = Promise.resolve(); this.unsubscribers = []; this.importing = new Set(); }
  enqueue(fn) { const result = this.pending.then(fn, fn); this.pending = result.catch(() => {}); return result; }
  async boot() {
    this.unsubscribers.push(this.computer.bus.on('project:file-written', ({ payload }) => {
      if (this.importing.has(payload.projectId)) return;
      this.enqueue(() => this.inspect(payload.projectId)).catch(error => this.computer.bus.emit('research:error', { error: error.message }));
    }));
    // Reconcile durable source with cursors after an interrupted event handler.
    for (const project of this.computer.projects.list()) await this.enqueue(() => this.inspect(project.id));
    return this;
  }
  async import({ name, files, source = 'local-import' }) {
    if (!Array.isArray(files) || !files.length || files.length > 250) throw new TypeError('Import 1..250 text files');
    let total = 0;
    const names = new Set();
    const clean = files.map(file => {
      const path = safePath(file.path);
      if (names.has(path) || typeof file.content !== 'string' || file.content.length > 200000) throw new TypeError('Duplicate path or oversized/non-text source');
      names.add(path); total += file.content.length;
      return { path, content: file.content, originalPath: file.originalPath ?? null, digest: digest(file.content) };
    });
    if (total > 2800000) throw new RangeError('Project import exceeds 2.8 MB of text');
    const project = await this.computer.projects.create({ name, description: `Preserved source: ${source}` });
    // Originals remain in this immutable checkpoint; working files use ProjectWorkspace.
    await this.computer.state.set(`computer.research.originals.${project.id}`, { source, files: clean, at: Date.now(), digest: digest(JSON.stringify(clean)) }, { source: 'research-intake' });
    this.importing.add(project.id);
    try { for (const file of clean) await this.computer.projects.writeFile(project.id, file.path, file.content); }
    finally { this.importing.delete(project.id); }
    await this.pending;
    return { project: this.computer.projects.snapshot(project.id), research: await this.enqueue(() => this.inspect(project.id)) };
  }
  async inspect(projectId) {
    const files = this.computer.projects.listFiles(projectId);
    const signature = digest(JSON.stringify(files.map(file => ({ path: file.path, content: file.content }))));
    const key = `computer.research.reports.${projectId}`;
    const prior = this.computer.state.get(key);
    if (prior?.digest === signature) return prior;
    const paths = new Set(files.map(file => file.path));
    const dependencies = [], unresolved = [], evidence = [];
    for (const file of files) {
      if (file.path.endsWith('package.json')) {
        try {
          const manifest = JSON.parse(file.content);
          for (const [name, version] of Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })) {
            const condition = `package:${projectId}:${name}@${version}`;
            dependencies.push({ name, version, source: file.path, condition, verifiedInstalled: false });
            await this.computer.contextual.updateEnvironment({ [condition]: false });
          }
        } catch (error) { unresolved.push({ path: file.path, kind: 'invalid-manifest', message: error.message }); }
      }
      if (/\.[mc]?[jt]sx?$/.test(file.path)) {
        for (const match of file.content.matchAll(/(?:from\s*|import\s*\(|require\s*\(|import\s*)['"](\.[^'"]+)['"]/g)) {
          const required = posix.normalize(posix.join(posix.dirname(file.path), match[1]));
          if (/^(dist|build)\//.test(required) && !paths.has(required)) {
            dependencies.push({ name: required, source: file.path, kind: 'possible-build-output', present: false,
              interpretation: 'Conventional output path; production must be demonstrated by actual build and tests' });
            continue;
          }
          const condition = `file:${projectId}:${required}`;
          const present = paths.has(required);
          dependencies.push({ name: required, source: file.path, kind: 'relative-import', condition, present, interpretation: 'Exact-path static import; extension/package resolution is not inferred' });
          await this.computer.contextual.updateEnvironment({ [condition]: present });
          if (!present) unresolved.push({ path: file.path, kind: 'missing-source', required, condition });
        }
      }
      const findings = inspectMajikiSources([{ path: `/home/user/Imports/${file.path}`, content: file.content }]);
      evidence.push(...findings.map(finding => ({ ...finding, path: file.path, digest: digest(file.content), observed: true })));
    }
    const original = this.computer.state.get(`computer.research.originals.${projectId}`);
    const text = files.map(file => `Source: ${file.path}\n${file.content}`).join('\n\n').slice(0, 50000);
    const structure = text.trim() ? await this.computer.generative.inspect({ text, context: { projectId, sourceDigest: signature, role: 'project-source-evidence' } }) : null;
    const record = await this.computer.contextual.register({ id: `project:${projectId}`, source: { projectId, origin: original?.source ?? 'resident-project', originalVersion: original?.digest ?? projectId }, digest: signature,
      meaning: { source: 'project-manifests-and-import-statements', interpretation: 'Candidate project execution; not a semantic address inferred from a digest' },
      inputs: ['project source'], outputs: ['tested application artifact'], environment: ['runtime:node', ...dependencies.filter(item => item.condition).map(item => item.condition)],
      evidence: [...evidence, ...unresolved, ...(structure ? [{ kind: 'resident-generative-structure', receiptId: structure.id }] : [])], outstandingWork: ['Review source and bounded plan', 'Run actual project build and tests in isolation'], related: [] });
    const report = { id: crypto.randomUUID(), projectId, digest: signature, at: Date.now(), previous: prior?.id ?? null,
      sources: files.map(file => ({ path: file.path, digest: digest(file.content) })), dependencies, unresolved, evidence,
      capabilityId: record.id, structuralReceiptId: structure?.id ?? null, actions: suggestedActions(files.map(file => ({ id: file.path, name: file.path, text: file.content }))) };
    await this.computer.state.set(key, report, { source: 'project-research' });
    await this.computer.state.set(`computer.research.revisions.${projectId}.${signature}`, { digest: signature, files: files.map(file => ({ path: file.path, content: file.content })), report }, { source: 'source-revision-checkpoint' });
    await this.computer.state.set(`computer.research.cursors.${projectId}`, { digest: signature, reportId: report.id }, { source: 'project-observer' });
    this.computer.bus.emit('research:observed', { projectId, reportId: report.id, previous: report.previous, digest: signature });
    return report;
  }
  search(query) {
    if (typeof query !== 'string' || query.length > 2000) throw new TypeError('Bounded text query required');
    return searchEvidence(query, this.computer.projects.list().flatMap(project => this.computer.projects.listFiles(project.id).map(file => ({ id: `${project.id}:${file.path}`, name: file.path, text: file.content }))));
  }
  snapshot() { return { reports: Object.values(this.computer.state.get('computer.research.reports', {})), cursors: this.computer.state.get('computer.research.cursors', {}) }; }
  close() { this.unsubscribers.forEach(unsubscribe => unsubscribe()); }
}
