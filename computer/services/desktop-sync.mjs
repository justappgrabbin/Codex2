/** Build the desktop node tree as a view of the real/host-backed file records. */
function generateId() { return crypto.randomUUID(); }

export function pathOfNode(nodes, node) {
  const parts = [];
  const visited = new Set();
  let current = node;
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.name !== '/') parts.unshift(current.name);
    current = current.parentId ? nodes[current.parentId] : null;
  }
  return '/' + parts.join('/');
}

export function filesystemFromRecords(records, existing = null) {
  const prior = existing?.nodes && typeof existing.nodes === 'object' ? existing.nodes : {};
  const byPath = new Map();
  for (const node of Object.values(prior)) {
    try { byPath.set(pathOfNode(prior, node), node); } catch { /* ignore broken nodes */ }
  }
  const nodes = {};
  const ensure = (parentId, name, type = 'folder') => {
    const parentPath = parentId ? pathOfNode(nodes, nodes[parentId]) : '';
    const path = name === '/' ? '/' : (parentPath === '/' ? '/' + name : (parentPath || '') + '/' + name);
    const key = path === '//' ? '/' : path;
    const reuse = byPath.get(key === '' ? '/' : key);
    if (reuse && nodes[reuse.id]) return nodes[reuse.id];
    const id = reuse?.id ?? generateId();
    const node = {
      id,
      parentId,
      name,
      type,
      createdAt: reuse?.createdAt ?? Date.now(),
      modifiedAt: reuse?.modifiedAt ?? Date.now(),
      isHidden: name.startsWith('.') && name !== '/',
    };
    nodes[id] = node;
    byPath.set(key === '' ? '/' : key, node);
    return node;
  };
  const root = ensure(null, '/');
  const home = ensure(root.id, 'home');
  const user = ensure(home.id, 'user');
  for (const name of ['Desktop', 'Documents', 'Downloads', 'Imports', 'Music', 'Pictures', 'Videos']) {
    ensure(user.id, name);
  }
  for (const record of records ?? []) {
    const parts = String(record.path || '').split('/').filter(Boolean);
    if (parts[0] !== 'home') continue;
    let parent = home;
    for (const part of parts.slice(1, -1)) parent = ensure(parent.id, part);
    const file = ensure(parent.id, parts.at(-1), 'file');
    const encoding = record.meta?.encoding;
    nodes[file.id] = {
      ...file,
      type: 'file',
      content: encoding === 'base64' ? undefined : record.content,
      size: record.meta?.size ?? (record.content?.length ?? 0),
      modifiedAt: record.updatedAt ?? Date.now(),
    };
  }
  return { nodes, trashMetadata: existing?.trashMetadata ?? {} };
}
