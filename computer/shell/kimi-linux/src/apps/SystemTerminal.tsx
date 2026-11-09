/** Thin glue: system-profile shell using Alexis's Synthai2 container exec API. */
import { useEffect, useRef, useState } from 'react';

interface Line { type: 'in' | 'out' | 'err'; text: string }

export default function SystemTerminal() {
  const [lines, setLines] = useState<Line[]>([
    { type: 'out', text: 'System Terminal — host Linux boot layer (permission-separated from the user terminal)' },
  ]);
  const [input, setInput] = useState('');
  const [cwd, setCwd] = useState('');
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/system-container/status')
      .then((r) => r.json())
      .then((s) => setCwd(s.cwd ?? ''))
      .catch(() => setLines((old) => [...old, { type: 'err', text: 'System container API is not available.' }]));
  }, []);
  useEffect(() => { scroller.current && (scroller.current.scrollTop = scroller.current.scrollHeight); }, [lines]);

  const run = async () => {
    const command = input.trim();
    if (!command) return;
    setInput('');
    setLines((old) => [...old, { type: 'in', text: command }]);
    try {
      const response = await fetch('/api/system-container/exec', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const result = await response.json();
      if (result.stdout) setLines((old) => [...old, { type: 'out', text: result.stdout }]);
      if (result.stderr) setLines((old) => [...old, { type: 'err', text: result.stderr }]);
      if (result.error && !result.stderr) setLines((old) => [...old, { type: 'err', text: String(result.error) }]);
    } catch (error) {
      setLines((old) => [...old, { type: 'err', text: String(error) }]);
    }
  };

  return (
    <div className="h-full flex flex-col font-mono text-xs p-2" style={{ background: 'var(--bg-window)', color: 'var(--text-primary)' }}>
      <div className="shrink-0 opacity-70 mb-1">system {cwd}</div>
      <div ref={scroller} className="flex-1 overflow-auto whitespace-pre-wrap">
        {lines.map((line, i) => (
          <div key={i} style={{ color: line.type === 'err' ? '#f88' : line.type === 'in' ? 'var(--accent-primary)' : 'inherit' }}>
            {line.type === 'in' ? `$ ${line.text}` : line.text}
          </div>
        ))}
      </div>
      <form className="shrink-0 flex gap-2 mt-1" onSubmit={(e) => { e.preventDefault(); void run(); }}>
        <input className="flex-1 bg-transparent outline-none border-t border-current/20 pt-1" value={input} onChange={(e) => setInput(e.target.value)} autoFocus />
      </form>
    </div>
  );
}
