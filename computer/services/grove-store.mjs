import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { groveSupabaseSettings } from '../grove/supabase.settings.mjs';

const defaultRegistry = resolve(fileURLToPath(new URL('../grove/registry.json', import.meta.url)));

// Env names come from Alexis's existing Synthai2 app-runner / settings-routes
// and the YOU-N-I-VERSE supabase-original helper. Values are never invented here.
export const SUPABASE_ENV_NEEDED = {
  url: 'SUPABASE_PRIMARY_URL or SUPABASE_URL',
  key: 'SUPABASE_ANON_KEY, or SUPABASE_PRIMARY_KEY, or SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_KEY',
  bucket: 'optional SUPABASE_APP_BUCKET (defaults to synthia-apps)',
};

export function readSupabaseEnv(env = process.env, settings = groveSupabaseSettings) {
  const url = env?.SUPABASE_PRIMARY_URL || env?.SUPABASE_URL || settings?.url;
  const key = env?.SUPABASE_ANON_KEY || env?.SUPABASE_PRIMARY_KEY || env?.SUPABASE_SERVICE_ROLE_KEY || env?.SUPABASE_KEY || settings?.anonKey;
  const bucket = env?.SUPABASE_APP_BUCKET || settings?.bucket || 'synthia-apps';
  const trimmedUrl = url ? String(url).trim() : '';
  const trimmedKey = key ? String(key).trim() : '';
  if (!trimmedUrl || !trimmedKey) {
    return { configured: false, needed: SUPABASE_ENV_NEEDED, settingsFile: 'computer/grove/supabase.settings.mjs (empty — set by Alexis)' };
  }
  return {
    configured: true,
    url: trimmedUrl.replace(/\/+$/, ''),
    key: trimmedKey,
    bucket,
  };
}

export class GroveStore {
  constructor({ registryPath = defaultRegistry, installRoot, files, env = process.env, fetch: fetchImpl } = {}) {
    this.registryPath = registryPath;
    this.installRoot = installRoot;
    this.files = files;
    this.env = env;
    this.fetch = fetchImpl ?? globalThis.fetch;
  }

  supabaseConfig() {
    return readSupabaseEnv(this.env);
  }

  installedIndexPath() {
    if (!this.installRoot) return null;
    return join(this.installRoot, 'Grove', 'installed-index.json');
  }

  destFor(packageId) {
    return join(this.installRoot, 'Grove', packageId);
  }

  async readInstalled() {
    const path = this.installedIndexPath();
    if (!path || !existsSync(path)) return [];
    try {
      const raw = JSON.parse(await readFile(path, 'utf8'));
      return Array.isArray(raw) ? raw : (raw.installed ?? []);
    } catch {
      return [];
    }
  }

  async writeInstalled(entry) {
    const path = this.installedIndexPath();
    if (!path) return;
    const list = await this.readInstalled();
    const next = [entry, ...list.filter((item) => item.id !== entry.id)];
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify({ installed: next }, null, 2));
    if (this.files?.write) {
      await this.files.write(`/home/user/Grove/${entry.id}/installed.json`, JSON.stringify(entry, null, 2), 'grove-store');
    }
  }

  async listRemote(cfg) {
    if (!cfg.configured) return { packages: [], status: 'unconfigured', needed: cfg.needed };
    if (typeof this.fetch !== 'function') {
      return { packages: [], status: 'unavailable', error: 'fetch is not available' };
    }
    try {
      const res = await this.fetch(`${cfg.url}/storage/v1/object/list/${cfg.bucket}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.key}`,
          apikey: cfg.key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prefix: '', limit: 200, offset: 0 }),
      });
      if (!res.ok) {
        const text = await res.text();
        return { packages: [], status: 'error', error: `Supabase storage list failed ${res.status}: ${text.slice(0, 200)}` };
      }
      const rows = await res.json();
      const folders = new Map();
      for (const row of rows ?? []) {
        const name = String(row?.name || '');
        if (!name) continue;
        const prefix = name.includes('/') ? name.split('/')[0] : name;
        if (!folders.has(prefix)) {
          folders.set(prefix, {
            id: prefix,
            name: prefix,
            kind: 'supabase-module',
            bucket: cfg.bucket,
            prefix,
          });
        }
      }
      return { packages: [...folders.values()], status: 'ok', bucket: cfg.bucket };
    } catch (error) {
      return { packages: [], status: 'error', error: String(error?.message ?? error) };
    }
  }

  async list() {
    const raw = JSON.parse(await readFile(this.registryPath, 'utf8'));
    const installed = await this.readInstalled();
    const cfg = this.supabaseConfig();
    const remote = await this.listRemote(cfg);
    return {
      source: raw.source,
      builtin: raw.builtin ?? [],
      packages: raw.packages ?? [],
      installed,
      supabase: {
        configured: cfg.configured,
        needed: cfg.configured ? undefined : cfg.needed,
        status: remote.status,
        error: remote.error,
        bucket: cfg.configured ? cfg.bucket : undefined,
        packages: remote.packages,
      },
    };
  }

  async install(packageId) {
    const catalog = await this.list();
    if (catalog.builtin.some((item) => item.id === packageId)) {
      return { ok: true, already: true, id: packageId, reason: 'basic app is built in' };
    }
    const already = catalog.installed.find((item) => item.id === packageId);
    if (already && this.installRoot && existsSync(this.destFor(packageId))) {
      return { ok: true, already: true, id: packageId, path: this.destFor(packageId), offline: true };
    }
    const local = catalog.packages.find((item) => item.id === packageId);
    if (local?.kind === 'local-module') {
      const entry = { ok: true, id: local.id, location: local.location, kind: local.kind, at: new Date().toISOString() };
      await this.writeInstalled(entry);
      return entry;
    }
    if (local) {
      return this.installFromLocalPath(local);
    }
    const remote = catalog.supabase?.packages?.find((item) => item.id === packageId);
    if (remote) {
      return this.installFromSupabase(remote);
    }
    throw new TypeError('Unknown Grove package: ' + packageId);
  }

  async installFromLocalPath(pack) {
    if (!this.installRoot) throw new Error('No install root is configured.');
    const source = pack.sourcePath;
    if (!source || !existsSync(source)) {
      throw new Error('Package source is not available locally, and Supabase is not serving this package.');
    }
    const dest = this.destFor(pack.id);
    await mkdir(dirname(dest), { recursive: true });
    await cp(source, dest, { recursive: true });
    const entry = { ok: true, id: pack.id, path: dest, kind: pack.kind ?? 'local-path', at: new Date().toISOString() };
    await this.writeInstalled(entry);
    return entry;
  }

  async listStorageObjects(cfg, prefix) {
    const res = await this.fetch(`${cfg.url}/storage/v1/object/list/${cfg.bucket}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        apikey: cfg.key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefix: prefix ? `${prefix}/` : prefix, limit: 1000, offset: 0 }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase storage list failed ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json();
  }

  async downloadStorageObject(cfg, objectPath) {
    const encoded = String(objectPath).split('/').map(encodeURIComponent).join('/');
    const res = await this.fetch(`${cfg.url}/storage/v1/object/${cfg.bucket}/${encoded}`, {
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        apikey: cfg.key,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase storage download failed ${res.status}: ${text.slice(0, 200)}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  async installFromSupabase(pack) {
    if (!this.installRoot) throw new Error('No install root is configured.');
    const cfg = this.supabaseConfig();
    if (!cfg.configured) {
      throw new Error(
        `Supabase is not configured. Need ${SUPABASE_ENV_NEEDED.url} and ${SUPABASE_ENV_NEEDED.key}. Already-installed apps stay usable offline.`,
      );
    }
    if (typeof this.fetch !== 'function') throw new Error('fetch is not available');
    const dest = this.destFor(pack.id);
    await mkdir(dest, { recursive: true });
    const rows = await this.listStorageObjects(cfg, pack.prefix ?? pack.id);
    const files = (rows ?? []).filter((row) => row?.name && row.id !== null && !String(row.name).endsWith('/'));
    if (!files.length) {
      // A single object at the prefix itself (zip or file).
      const buffer = await this.downloadStorageObject(cfg, pack.prefix ?? pack.id);
      await writeFile(join(dest, pack.object || pack.id), buffer);
    } else {
      for (const row of files) {
        const relative = String(row.name).replace(/^\/+/, '');
        if (relative.includes('..')) continue;
        const objectPath = relative.startsWith(`${pack.prefix}/`) || relative.startsWith(`${pack.id}/`)
          ? relative
          : `${pack.prefix}/${relative}`;
        const inner = objectPath.startsWith(`${pack.prefix}/`) ? objectPath.slice(pack.prefix.length + 1) : objectPath;
        const target = join(dest, inner);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, await this.downloadStorageObject(cfg, objectPath));
      }
    }
    const entry = {
      ok: true,
      id: pack.id,
      path: dest,
      kind: 'supabase-module',
      bucket: cfg.bucket,
      at: new Date().toISOString(),
    };
    await this.writeInstalled(entry);
    return entry;
  }
}
