/**
 * Thin MCP glue for Trident.
 * Protocol surface follows Alexis's mcpHub.js (initialize, tools/list, tools/call).
 * Client shape follows her mrnn-mcp-client (list tools, call tools).
 * Filesystem and terminal tools call this computer's VFS and her Synthai2 container shell.
 * GitHub uses GITHUB_TOKEN / GH_TOKEN from the environment only. Nothing is committed.
 * Donor copies stay unchanged under computer/donors/copied/.
 */
import { createHostShell } from './host-shell.mjs';

export function createTridentMcp({ vfs, shell, computer, githubToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? '' } = {}) {
  const tools = [
    { name: 'filesystem_list', description: "List files in the computer's filesystem.", inputSchema: { type: 'object', properties: { prefix: { type: 'string' } } } },
    { name: 'filesystem_read', description: 'Read a file from the computer filesystem.', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
    { name: 'filesystem_write', description: 'Write a file into the computer filesystem.', inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } },
    { name: 'terminal_run', description: "Run a command in the user's permission-controlled terminal.", inputSchema: { type: 'object', properties: { command: { type: 'string' }, cwd: { type: 'string' } }, required: ['command'] } },
    { name: 'registry_list', description: "List Codex2 registered capabilities, apps, and artifacts.", inputSchema: { type: 'object', properties: { kind: { type: 'string' } } } },
    { name: 'github_search', description: 'Search GitHub for RAG context when GITHUB_TOKEN is set.', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  ];

  async function callTool(name, args = {}) {
    switch (name) {
      case 'filesystem_list':
        return { ok: true, records: typeof vfs.list === 'function' ? vfs.list(args.prefix ?? '/') : [] };
      case 'filesystem_read': {
        const rec = vfs.read(args.path);
        return rec ? { ok: true, path: rec.path, content: rec.content, type: rec.type } : { ok: false, error: 'not found' };
      }
      case 'filesystem_write': {
        const rec = await vfs.write(args.path, args.content ?? '', { type: 'text' });
        return { ok: true, path: rec.path, digest: rec.digest };
      }
      case 'terminal_run': {
        if (!shell) return { ok: false, error: 'no shell' };
        const result = await shell.runUser(String(args.command ?? ''), { cwd: args.cwd });
        return { ok: result.ok, stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode };
      }
      case 'registry_list': {
        const dump = (reg) => (reg?.list?.() ?? []).map((item) => ({ id: item.id, name: item.name, kind: item.kind }));
        return {
          ok: true,
          registry: {
            capabilities: dump(computer?.capabilityRegistry),
            apps: dump(computer?.apps),
            artifacts: dump(computer?.artifacts),
            tools: dump(computer?.tools),
          },
        };
      }
      case 'github_search': {
        if (!githubToken) return { ok: false, skipped: true, error: 'GITHUB_TOKEN is not set; GitHub RAG is skipped.' };
        const url = `https://api.github.com/search/code?q=${encodeURIComponent(String(args.query ?? ''))}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'synthia-computer' } });
        if (!res.ok) return { ok: false, error: `GitHub ${res.status}` };
        const body = await res.json();
        return { ok: true, items: (body.items ?? []).slice(0, 8).map((it) => ({ name: it.name, path: it.path, repo: it.repository?.full_name, url: it.html_url })) };
      }
      default:
        return { ok: false, error: `unknown tool ${name}` };
    }
  }

  function handle(req) {
    const { id, method, params } = req;
    if (method === 'initialize') {
      return { jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', serverInfo: { name: 'synthia-computer-trident', version: '0.1.0' }, capabilities: { tools: {} } } };
    }
    if (method === 'tools/list') {
      return { jsonrpc: '2.0', id, result: { tools } };
    }
    if (method === 'tools/call') {
      return callTool(params.name, params.arguments || {}).then((result) => ({
        jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result) }] },
      }));
    }
    return { jsonrpc: '2.0', id, error: { code: -32601, message: `unknown method ${method}` } };
  }

  return {
    listTools() { return tools.map((t) => ({ ...t })); },
    callTool,
    handle,
  };
}
