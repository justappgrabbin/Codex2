import { useEffect, useState } from 'react';

type Job = { id: string; status: string; planDigest: string; spec: { goal: string }; receipt?: unknown; blocker?: unknown; plan: string[] };
type Snapshot = {
  projects: { id: string; name: string }[];
  capabilities: { id: string; applicability: string; reasons: string[]; source: unknown }[];
  research: { reports: unknown[] };
  construction: { jobs: Job[]; artifacts: Record<string, { name: string }>; events: unknown[] };
  activity: unknown[];
  runner: { available: boolean; reason?: string };
};
const tabs = ['Computer', 'Projects', 'Research', 'Capabilities', 'Planner', 'Activity', 'Inbox', 'Artifacts'];
async function request(path: string, value?: unknown) {
  const response = await fetch(path, value === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Computer request failed');
  return data;
}
const show = (value: unknown) => <pre className="whitespace-pre-wrap break-all text-xs p-3 bg-black/20 rounded">{JSON.stringify(value, null, 2)}</pre>;
export default function Computer() {
  const [tab, setTab] = useState('Computer');
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [projectId, setProject] = useState('');
  const [goal, setGoal] = useState('');
  const [changes, setChanges] = useState('[]');
  const [prefix, setPrefix] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<unknown>(null);
  const [preview, setPreview] = useState<{ files: { path: string; content: string }[]; receipt: unknown } | null>(null);
  const refresh = async () => setData(await request('/api/continuity'));
  useEffect(() => { refresh().catch(reason => setError(String(reason))); }, []);
  const act = async (action: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await action(); await refresh(); } catch (reason) { setError(String(reason)); }
    finally { setBusy(false); }
  };
  const input = 'bg-black/20 border border-white/20 rounded p-2 w-full';
  const button = 'px-3 py-2 rounded bg-blue-600 disabled:opacity-50';
  return <div className="h-full overflow-auto p-4 space-y-4 text-sm">
    <div className="flex flex-wrap gap-2">{tabs.map(name => <button className={tab === name ? button : 'px-2 py-1'} key={name} onClick={() => setTab(name)}>{name}</button>)}</div>
    <button className={button} disabled={busy} onClick={() => act(refresh)}>Refresh observed state</button>
    {busy && <p role="status">Computer operation in progress. Build verification may take up to 65 seconds.</p>}
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {tab === 'Computer' && <><h2>Resident Computer</h2><p>The local service is {data ? 'connected' : 'not connected'}. Start with the local launcher; stop with Ctrl+C in its terminal.</p><p>Isolated Node worker: {data?.runner.available ? 'available' : 'blocked'}. Core research requires no paid service.</p>{data?.runner.reason && show(data.runner.reason)}<p>Import existing source, inspect evidence, propose changes, review the exact plan, then approve one isolated build. Verification reports the commands actually run. Experimental semantic systems retain their existing engine.</p></>}
    {tab === 'Projects' && <><h2>Import text files or a folder</h2><p>Files are retained as originals. Use the existing Import app for ZIPs, then select the admitted folder prefix below.</p>
      <input aria-label="Import project files" type="file" multiple disabled={busy} onChange={event => {
        const selection = Array.from(event.target.files ?? []);
        if (selection.length) act(async () => {
          const files = await Promise.all(selection.map(async file => ({ path: file.webkitRelativePath || file.name, content: await file.text() })));
          await request('/api/projects/import', { name: selection[0].name, files });
        });
      }} />
      <input aria-label="Import project folder" type="file" multiple {...{ webkitdirectory: '' }} disabled={busy} onChange={event => {
        const selection = Array.from(event.target.files ?? []);
        if (selection.length) act(async () => {
          const files = await Promise.all(selection.map(async file => ({ path: file.webkitRelativePath.split('/').slice(1).join('/'), content: await file.text() })));
          await request('/api/projects/import', { name: selection[0].webkitRelativePath.split('/')[0], files });
        });
      }} />
      <input className={input} aria-label="Admitted ZIP folder" placeholder="/home/user/Imports/project/" value={prefix} onChange={event => setPrefix(event.target.value)} />
      <button className={button} disabled={busy || !prefix} onClick={() => act(() => request('/api/projects/from-import', { name: prefix.split('/').filter(Boolean).at(-1), prefix }))}>Recognize admitted ZIP project</button>
      {data?.projects.map(project => <div key={project.id}>{project.name} <code>{project.id}</code> <button onClick={() => { setProject(project.id); setTab('Planner'); }}>Plan work</button></div>)}
    </>}
    {tab === 'Research' && <><input className={input} aria-label="Evidence query" placeholder="Search exact local evidence" value={query} onChange={event => setQuery(event.target.value)} /><button className={button} disabled={busy} onClick={() => act(async () => setResults(await request('/api/research/search?q=' + encodeURIComponent(query))))}>Search sources</button>{results !== null && show(results)}{show(data?.research)}</>}
    {tab === 'Capabilities' && data?.capabilities.map(capability => <div key={capability.id} className="border-b border-white/20 py-2"><strong>{capability.applicability}</strong> {capability.id}{show({ reasons: capability.reasons, source: capability.source })}</div>)}
    {tab === 'Planner' && <><select className={input} aria-label="Project" value={projectId} onChange={event => setProject(event.target.value)}><option value="">Choose project</option>{data?.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
      <input className={input} aria-label="Goal" placeholder="Evidence-backed goal" value={goal} onChange={event => setGoal(event.target.value)} />
      <label>Bounded changes: JSON array of {'{path, content}'}. An empty array verifies the current snapshot.<textarea className={input} rows={5} value={changes} onChange={event => setChanges(event.target.value)} /></label>
      <button className={button} disabled={busy || !projectId || !goal} onClick={() => act(() => request('/api/construction/propose', { projectId, goal, changes: JSON.parse(changes), requestKey: crypto.randomUUID() }))}>Prepare inspectable plan</button>
      {data?.construction.jobs.map(job => <section key={job.id} className="border border-white/20 rounded p-3 space-y-2"><h3>{job.status}: {job.spec.goal}</h3>{show(job)}
        {job.status === 'PROPOSED' && <><button className={button} disabled={busy} onClick={() => act(() => request('/api/construction/approve', { id: job.id, decision: 'approve', planDigest: job.planDigest }))}>Approve this plan: one isolated build/test</button> <button disabled={busy} onClick={() => act(() => request('/api/construction/approve', { id: job.id, decision: 'deny', planDigest: job.planDigest }))}>Deny</button></>}
        {job.status === 'APPROVED' && <button className={button} disabled={busy} onClick={() => act(() => request('/api/construction/run', { id: job.id }))}>Run authorized work</button>}
      </section>)}
    </>}
    {tab === 'Activity' && show(data?.activity)}
    {tab === 'Inbox' && <><h2>Work requiring attention and completed results</h2>{data?.construction.jobs.filter(job => job.status !== 'RUNNING').map(job => <p key={job.id}>{job.status}: {job.spec.goal}</p>)}<p>Notifications are retained here; OS background notifications are not implemented.</p></>}
    {tab === 'Artifacts' && <><p>Downloads include the staged source and actual command receipt. Build products remain in the disposable container. Standalone index.html source can be previewed in an isolated frame with network access disabled.</p>{Object.entries(data?.construction.artifacts ?? {}).map(([id, artifact]) => <p key={id}><a className="underline" href={'/api/artifact?id=' + id} download>{artifact.name}</a> <button onClick={() => act(async () => setPreview(await request('/api/artifact?id=' + id)))}>Inspect / preview</button></p>)}
      {preview && <>{show(preview.receipt)}{show(preview.files.map(file => ({ path: file.path, characters: file.content.length })))}{preview.files.find(file => file.path === 'index.html') ? <iframe title="Isolated source preview" className="w-full h-80 bg-white" sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={'<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data:; connect-src \'none\'; form-action \'none\'; base-uri \'none\'">' + preview.files.find(file => file.path === 'index.html')!.content} /> : <p>No standalone HTML source is present; inspect the source bundle and command receipt.</p>}</>}
    </>}
  </div>;
}
