/**
 * WIRE — save a named project with Alexis's ProjectWorkspace.
 * Her class already writes the project and its files into Computer state.
 * This finds an existing project by name, or creates one, then calls writeFile.
 * ProjectWorkspace.mjs is not modified.
 */
export async function saveNamedWorkspace(computer, { name, description = '', files = [] } = {}) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) throw new TypeError('Workspace name is required.');
  if (trimmed.length > 200) throw new RangeError('Workspace name is too long.');
  if (!Array.isArray(files) || files.length > 200) throw new TypeError('Workspace files must be a list.');
  let project = computer.projects.list().find((item) => item.name === trimmed) ?? null;
  if (!project) project = await computer.projects.create({ name: trimmed, description: String(description || '') });
  for (const file of files) {
    if (!file || typeof file.path !== 'string' || typeof file.content !== 'string') {
      throw new TypeError('Each workspace file needs a path and text content.');
    }
    if (file.content.length > 500000) throw new RangeError('Workspace file is too large.');
    await computer.projects.writeFile(project.id, file.path, file.content, { type: typeof file.type === 'string' ? file.type : 'text/plain' });
  }
  return computer.projects.get(project.id);
}
