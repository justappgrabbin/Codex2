export function javascriptArtifactName(name, type) {
  const safe = String(name ?? 'artifact').split(/[\\/]/).at(-1).replace(/[^\w. -]/g, '_') || 'artifact';
  const kind = String(type ?? '').toLowerCase();
  if (['javascript', 'js', 'mjs', 'cjs'].includes(kind) && !/\.(js|mjs|cjs)$/i.test(safe)) {
    return safe.replace(/\.txt$/i, '') + '.js';
  }
  return safe;
}

export function collectStdout(value, depth = 0, seen = new Set()) {
  const lines = [];
  if (!value || typeof value !== 'object' || depth > 8 || seen.has(value)) return lines;
  seen.add(value);
  if (Array.isArray(value.stdout)) lines.push(...value.stdout.map((item) => item == null ? '' : String(item)));
  if (value.result && typeof value.result === 'object') lines.push(...collectStdout(value.result, depth + 1, seen));
  return lines;
}
