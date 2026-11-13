/** System-profile shell using the permission-checked hidden Linux backend. */
import { useEffect, useRef, useState } from 'react';

interface Line { type: 'in' | 'out' | 'err' | 'ok'; text: string }
interface Status { cwd?: string; engineLabel?: string; shell?: string; enabled?: boolean; root?: string }

export default function SystemTerminal() {
  const [lines, setLines] = useState<Line[]>([
    { type: 'out', text: 'System Terminal — hidden Linux backend (permission-separated from the user terminal)' },
  ]);
  const [input, setInput] = useState('');
  const [cwd, setCwd] = useState('');
  const [engine, setEngine] = useState('');
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/terminal/status?profile=system', { cache: 'no-store' })
      .then((r) => r.json())
      .then((s: Status) => {
        setCwd(s.cwd ?? '');
        setEngine(s.engineLabel ?? '');
        if (s.enabled === false) {
          setLines((old) => [...old, { type: 'err', text: s.shell ? `Backend disabled (${s.shell})` : 'Backend disabled.' }]);
        }
      })
      .catch(() => setLines((old) => [...old, { type: 'err', text: 'System container API is not available.' }]));
  }, []);
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight; }, [lines]);

  const run = async (approve = false) => {
    const command = input.trim();
    if (!command || busy) return;
    if (!approve) setInput('');
    setBusy(true);
    setLines((old) => [...old, { type: 'in', text: command }]);
    try {
      const response = await fetch('/api/terminal/exec', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, profile: 'system', cwd, approve }),
      });
      const result = await response.json();
      if (result.cwd) setCwd(result.cwd);
      if (result.engine) setEngine(result.engine);
      if (result.denied) setLines((old) => [...old, { type: 'err', text: `Blocked: ${result.error}` }]);
      else if (result.requiresApproval) {
        setInput(command);
        setLines((old) => [...old, { type: 'err', text: `${result.error} (press Approve)` }]);
      } else {
        if (result.stdout) setLines((old) => [...old, { type: 'out', text: result.stdout }]);
        if (result.stderr) setLines((old) => [...old, { type: 'err', text: result.stderr }]);
        if (result.error && !result.stderr) setLines((old) => [...old, { type: 'err', text: String(result.error) }]);
        if (result.ok) setLines((old) => [...old, { type: 'ok', text: `exit ${result.exitCode ?? 0}` }]);
      }
    } catch (error) {
      setLines((old) => [...old, { type: 'err', text: String(error) }]);
    } finally { setBusy(false); }
  };

  return (
    <div className="h-full flex flex-col font-mono text-xs p-2" style={{ background: 'var(--bg-window)', color: 'var(--text-primary)' }}>
      <div className="shrink-0 opacity-70 mb-1">system {cwd}{engine ? ` · ${engine}` : ''}</div>
      <div ref={scroller} className="flex-1 overflow-auto whitespace-pre-wrap">
        {lines.map((line, i) => (
          <div key={i} style={{ color: line.type === 'err' ? '#f88' : line.type === 'in' ? 'var(--accent-primary)' : line.type === 'ok' ? '#8f8' : 'inherit' }}>
            {line.type === 'in' ? `$ ${line.text}` : line.text}
          </div>
        ))}
      </div>
      <form className="shrink-0 flex gap-2 mt-1" onSubmit={(e) => { e.preventDefault(); void run(false); }}>
        <input className="flex-1 bg-transparent outline-none border-t border-current/20 pt-1" value={input} onChange={(e) => setInput(e.target.value)} autoFocus />
        <button type="button" onClick={() => void run(true)} className="opacity-70 hover:opacity-100" title="Approve the command that needs network or install access">approve</button>
      </form>
    </div>
  );
}
