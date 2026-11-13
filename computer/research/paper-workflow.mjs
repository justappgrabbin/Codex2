import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const stages = ['select', 'deep-read', 'implement', 'persist'];
const required = { select: ['title', 'source'], 'deep-read': ['summary', 'codeContrast'], implement: ['experiment', 'result'], persist: ['conclusion'] };
function validText(value) { return typeof value === 'string' && value.trim().length > 0; }
export function validateStage(stage, data) {
  if (!stages.includes(stage)) throw new Error('Unknown stage');
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Stage data must be an object');
  for (const field of required[stage]) if (!validText(data[field])) throw new Error(`Missing ${stage} field: ${field}`);
  return true;
}
export async function recordStage(root, id, stage, data) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw new Error('Invalid paper ID');
  validateStage(stage, data);
  const directory = resolve(root, 'docs/paper_deep');
  await mkdir(directory, { recursive: true });
  const path = join(directory, id + '.json');
  let record = { id, stages: {}, history: [] };
  try { record = JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const index = stages.indexOf(stage);
  if (index && !record.stages[stages[index - 1]]) throw new Error('Previous stage required: ' + stages[index - 1]);
  const now = new Date().toISOString();
  record.stages[stage] = { ...data, recordedAt: now };
  record.history.push({ stage, recordedAt: now });
  const temporary = path + '.' + randomUUID() + '.tmp';
  await writeFile(temporary, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
  await rename(temporary, path);
  if (stage === 'persist') {
    const registry = join(directory, 'MEMORY_PAPER_REGISTRY.json');
    let entries = [];
    try { entries = JSON.parse(await readFile(registry, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    entries = entries.filter(entry => entry.id !== id);
    entries.push({ id, title: record.stages.select.title, source: record.stages.select.source, path: 'docs/paper_deep/' + id + '.json', updatedAt: now });
    const tempRegistry = registry + '.' + randomUUID() + '.tmp';
    await writeFile(tempRegistry, JSON.stringify(entries, null, 2) + '\n', { flag: 'wx' });
    await rename(tempRegistry, registry);
  }
  return record;
}
