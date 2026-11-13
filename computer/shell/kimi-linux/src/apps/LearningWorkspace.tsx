import { useEffect, useState } from 'react';

const example = JSON.stringify({
  goal: 'Calculate quotation with sales tax', entry: '/quote.js', exportName: 'quote',
  files: { '/quote.js': 'export function quote(x){return x.price*x.quantity*1.1}' },
  tests: [{ input: { price: 10, quantity: 2 }, expected: 22 }],
}, null, 2);

export default function LearningWorkspace() {
  const [query, setQuery] = useState('');
  const [repository, setRepository] = useState('');
  const [paths, setPaths] = useState('README.md');
  const [goal, setGoal] = useState('');
  const [exampleInput, setExampleInput] = useState('{}');
  const [expectedOutput, setExpectedOutput] = useState('{}');
  const [codingAvailable, setCodingAvailable] = useState(false);
  const [candidate, setCandidate] = useState(example);
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [componentId, setComponentId] = useState('');
  const [components, setComponents] = useState<{id: string; goal: string}[]>([]);
  const [input, setInput] = useState('{"price":5,"quantity":4}');
  const request = async (route: string, value?: unknown) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/learning${route}`, value === undefined ? {} : {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Request failed');
      setOutput(JSON.stringify(result, null, 2));
      if (route === '/build' && result.ok) {
        setComponentId(result.id);
        setComponents(previous => [...previous, { id: result.id, goal: result.goal }]);
      }
      if (route === '') { setComponents(result.components); setCodingAvailable(result.codingAvailable); }
    } catch (error) { setOutput(String(error)); }
    finally { setBusy(false); }
  };
  useEffect(() => { fetch('/api/learning').then(response => { if (!response.ok) throw new Error('Could not load retained components'); return response.json(); }).then(data => { setComponents(data.components); setCodingAvailable(data.codingAvailable); }).catch(error => setOutput(String(error))); }, []);
  const button = 'px-3 py-2 rounded bg-[var(--bg-hover)] border border-[var(--border-subtle)] disabled:opacity-50';
  const field = 'w-full rounded p-2 bg-[var(--bg-titlebar)] border border-[var(--border-subtle)]';
  return <section className="border-t border-[var(--border-subtle)] mt-5 pt-4 space-y-3">
    <h2 className="font-semibold">Learn, retrieve and build</h2>
    <p className="text-xs text-[var(--text-secondary)]">Import text and source files, retrieve cited passages, and retain components that pass your checks. GitHub downloads require a connection; cached files work offline.</p>
    <div className="flex gap-2 flex-wrap">
      <button className={button} disabled={busy} onClick={() => request('/index', {})}>Learn imported text</button>
      <button className={button} disabled={busy} onClick={() => request('')}>Sources and components</button>
    </div>
    <textarea aria-label="Question or teaching" className={field} value={query} onChange={e => setQuery(e.target.value)} placeholder="Question, concept, or correction" />
    <div className="flex gap-2">
      <button className={button} disabled={busy || !query.trim()} onClick={() => request('/search', { query })}>Find source evidence</button>
      <button className={button} disabled={busy || !query.trim()} onClick={() => request('/teach', { text: query })}>Remember teaching</button>
    </div>
    <input aria-label="GitHub repository" className={field} value={repository} onChange={e => setRepository(e.target.value)} placeholder="GitHub owner/repository" />
    <textarea aria-label="GitHub file paths" className={field} value={paths} onChange={e => setPaths(e.target.value)} placeholder="One repository file path per line" />
    <button className={button} disabled={busy || !repository.trim()} onClick={() => request('/github', { repository, paths: paths.split('\n').map(p => p.trim()).filter(Boolean) })}>Import GitHub source at a fixed commit</button>
    <h3 className="font-semibold">Build from a goal</h3>
    <textarea aria-label="What should Synthia build" className={field} value={goal} onChange={e => setGoal(e.target.value)} placeholder="What should this component do?" />
    <label className="block">Example input<input aria-label="Goal example input" className={field} value={exampleInput} onChange={e => setExampleInput(e.target.value)} /></label>
    <label className="block">Expected result<input aria-label="Goal expected result" className={field} value={expectedOutput} onChange={e => setExpectedOutput(e.target.value)} /></label>
    <p className="text-xs text-[var(--text-secondary)]">{codingAvailable ? 'Your local coding model is connected. Synthia will retrieve relevant material, write code, check it, and attempt repairs.' : 'No local coding model is configured. Supplied source can still be checked below; generating new code needs a local coding model.'}</p>
    <button className={button} disabled={busy || !goal.trim() || !codingAvailable} onClick={() => {
      const parse = (text: string) => { try { return JSON.parse(text); } catch { return text; } };
      request('/build', { goal, tests: [{ input: parse(exampleInput), expected: parse(expectedOutput) }] });
    }}>Build from my goal</button>
    <details><summary className="cursor-pointer">Advanced: supply source and checks</summary>
    <label className="block">Goal, source modules and acceptance checks
      <textarea aria-label="Component build specification" className={`${field} mt-1 font-mono text-xs min-h-64`} value={candidate} onChange={e => setCandidate(e.target.value)} />
    </label>
    <p className="text-xs text-[var(--text-secondary)]">With a configured local coding model, omit “files” to request generation and up to two repairs. Otherwise supply source modules. Passing checks verify those cases, not all possible behavior.</p>
    <button className={button} disabled={busy} onClick={() => { try { request('/build', JSON.parse(candidate)); } catch (e) { setOutput(String(e)); } }}>Build and check component</button>
    </details>
    {components.length > 0 && <div className="space-y-2"><h3 className="font-semibold">Retained components</h3>
      {components.map(component => <button key={component.id} className={`${button} block w-full text-left`} onClick={() => setComponentId(component.id)}>{component.goal}</button>)}
    </div>}
    <input aria-label="Verified component ID" className={field} value={componentId} onChange={e => setComponentId(e.target.value)} placeholder="Verified component ID" />
    <input aria-label="Component input JSON" className={field} value={input} onChange={e => setInput(e.target.value)} />
    <button className={button} disabled={busy || !componentId} onClick={() => { try { request('/run', { id: componentId, input: JSON.parse(input) }); } catch (e) { setOutput(String(e)); } }}>Run retained component</button>
    <p role="status">{busy ? 'Working…' : ''}</p>
    {output && <pre className="text-xs p-3 bg-[var(--bg-titlebar)] whitespace-pre-wrap break-words max-h-96 overflow-auto">{output}</pre>}
  </section>;
}
