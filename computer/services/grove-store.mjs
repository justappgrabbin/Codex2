import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRegistry = resolve(fileURLToPath(new URL('../grove/registry.json', import.meta.url)));

export class GroveStore {
  constructor({ registryPath = defaultRegistry, installRoot, files } = {}) {
    this.registryPath = registryPath;
    this.installRoot = installRoot;
    this.files = files;
  }

  async list() {
    const raw = JSON.parse(await readFile(this.registryPath, 'utf8'));
    return { source: raw.source, builtin: raw.builtin ?? [], packages: raw.packages ?? [] };
  }

  async install(packageId) {
    const catalog = await this.list();
    if (catalog.builtin.some((item) => item.id === packageId)) {
      return { ok: true, already: true, id: packageId, reason: 'basic app is built in' };
    }
    const pack = catalog.packages.find((item) => item.id === packageId);
    if (!pack) throw new TypeError('Unknown Grove package: ' + packageId);
    if (pack.kind === 'local-module') {
      return { ok: true, id: pack.id, location: pack.location, kind: pack.kind };
    }
    if (!this.installRoot) throw new Error('No install root is configured.');
    const source = pack.sourcePath;
    if (!source || !existsSync(source)) throw new Error('Package source is not available locally (no remote Supabase in this scaffold).');
    const dest = join(this.installRoot, 'Grove', pack.id);
    await mkdir(dirname(dest), { recursive: true });
    await cp(source, dest, { recursive: true });
    if (this.files?.write) {
      await this.files.write(`/home/user/Grove/${pack.id}/installed.json`, JSON.stringify({ id: pack.id, at: new Date().toISOString() }, null, 2), 'grove-store');
    }
    return { ok: true, id: pack.id, path: dest };
  }
}
