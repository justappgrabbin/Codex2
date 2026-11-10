/** Thin glue: system-profile shell using Alexis's Synthai2 container exec API. */
import { useEffect, useRef, useState } from 'react';

interface Line { type: 'in' | 'out' | 'err'; text: string }

export default function SystemTerminal() {
  const [lines, setLines] = useState<Line[]>([
    { type: 'out', text: 'System Terminal — host Linux boot layer (permission-separated from the user terminal)' },
  ]);
  const [input, setInput] = useState('');
  const [cwd, setCwd] = useState('');
  const [engine, setEngine] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/system-container/status')
      .then((r) => r.json())
      .then((s) => { setCwd(s.cwd ?? ''); setEngine(s.engine ?? s.backend ?? ''); })
      .catch(() => setLines((old) => [...old, { type: 'err', text: 'System container API is not available.' }]));
  }, []);
  useEffect(() => { scroller.current && (scroller.current.scrollTop = scroller.current.scrollHeight); }, [lines]);
  useEffect(() => { inputRef.current?.focus(); }, []);

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
      if (result.cwd) setCwd(result.cwd);
      if (result.stdout) setLines((old) => [...old, { type: 'out', text: result.stdout }]);
      if (result.stderr) setLines((old) => [...old, { type: 'err', text: result.stderr }]);
      if (result.error && !result.stderr) setLines((old) => [...old, { type: 'err', text: String(result.error) }]);
    } catch (error) {
      setLines((old) => [...old, { type: 'err', text: String(error) }]);
    }
  };

  return (
    <div className="h-full flex flex-col font-mono text-xs p-2" style={{ background: 'var(--bg-window)', color: 'var(--text-primary)' }} onMouseDown={() => inputRef.current?.focus()}>
      <div className="shrink-0 opacity-70 mb-1" data-testid="system-terminal-status">system {cwd} {engine}</div>
      <div ref={scroller} className="flex-1 overflow-auto whitespace-pre-wrap">
        {lines.map((line, i) => (
          <div key={i} style={{ color: line.type === 'err' ? '#f88' : line.type === 'in' ? 'var(--accent-primary)' : 'inherit' }}>
            {line.type === 'in' ? `$ ${line.text}` : line.text}
          </div>
        ))}
      </div>
      <form className="shrink-0 flex items-center gap-2 mt-1 px-1" style={{ borderTop: '1px solid var(--border-subtle)', minHeight: 32 }} onSubmit={(e) => { e.preventDefault(); void run(); }}>
        <span>$</span>
        <input ref={inputRef} data-testid="system-terminal-input" placeholder="type a command" className="flex-1 bg-transparent outline-none" style={{ minHeight: 28 }} value={input} onChange={(e) => setInput(e.target.value)} autoFocus />
      </form>
    </div>
  );
}
