import { useState, useRef, useEffect } from 'react';
import { Terminal as TermIcon } from 'lucide-react';
import useOSStore from '../../store/useOSStore';

export default function TerminalApp() {
  const terminalHistory = useOSStore((s) => s.terminalHistory);
  const addTerminalEntry = useOSStore((s) => s.addTerminalEntry);
  const pushToast = useOSStore((s) => s.pushToast);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIndex, setHistIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [terminalHistory]);

  const execute = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    addTerminalEntry({ type: 'command', content: trimmed });
    setHistory((h) => [...h, trimmed]);
    setHistIndex(-1);

    const parts = trimmed.split(' ');
    const command = parts[0].toLowerCase();

    switch (command) {
      case 'neural-status':
        addTerminalEntry({ type: 'success', content: 'Substrate: ONLINE | 64 gates | 9 centers | Coherence: 0.87' });
        break;
      case 'gate-list':
        addTerminalEntry({ type: 'info', content: 'Active: 1,2,3,7,10,11,14,17,20,22,23,25,29,34,35,36,37,41,42,43,44,48,53,57' });
        break;
      case 'self-inject':
        addTerminalEntry({ type: 'success', content: 'Injection cycle initiated. New pathways forming.' });
        break;
      case 'federation-status':
        addTerminalEntry({ type: 'info', content: 'Status: FEDERATED\nPeers: substrate.local, neural.mesh, ancient.mesh\nMessages: 5,701 total' });
        break;
      case 'federation-connect': {
        const inst = parts[1];
        if (!inst) addTerminalEntry({ type: 'error', content: 'Usage: federation-connect <instance>' });
        else addTerminalEntry({ type: 'success', content: `Connected to ${inst}` });
        break;
      }
      case 'evolve-status':
        addTerminalEntry({ type: 'info', content: 'Cycle #1847 | Phase: STABLE | Progress: 72% | Best: 0.91' });
        break;
      case 'evolve-trigger':
        addTerminalEntry({ type: 'success', content: 'Evolution cycle triggered manually.' });
        pushToast({ message: 'Evolution triggered', type: 'success' });
        break;
      case 'bedrock-strata': {
        const strata = useOSStore.getState().bedrockStrata;
        let out = 'Bedrock Strata:\n';
        for (const s of strata) out += `  [${s.status}] ${s.name} — ${s.packages} pkgs (P${s.priority})\n`;
        addTerminalEntry({ type: 'info', content: out.trim() });
        break;
      }
      case 'bedrock-enable': {
        const name = parts[1];
        if (!name) addTerminalEntry({ type: 'error', content: 'Usage: bedrock-enable <stratum>' });
        else {
          const st = useOSStore.getState().bedrockStrata.find((s) => s.name === name);
          if (st) { useOSStore.getState().toggleStratum(st.id); addTerminalEntry({ type: 'success', content: `Enabled ${name}` }); }
          else addTerminalEntry({ type: 'error', content: `Stratum "${name}" not found` });
        }
        break;
      }
      case 'clear':
        useOSStore.setState({ terminalHistory: [] as any });
        break;
      case 'help':
        addTerminalEntry({ type: 'info', content: 'Commands: neural-status, gate-list, self-inject, federation-status, federation-connect, evolve-status, evolve-trigger, bedrock-strata, bedrock-enable, clear, help' });
        break;
      default:
        addTerminalEntry({ type: 'error', content: `Unknown: ${command}. Try "help".` });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { execute(input); setInput(''); }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const ni = histIndex < history.length - 1 ? histIndex + 1 : histIndex;
        setHistIndex(ni);
        setInput(history[history.length - 1 - ni] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIndex > 0) { setHistIndex(histIndex - 1); setInput(history[history.length - histIndex] || ''); }
      else { setHistIndex(-1); setInput(''); }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="term-output flex-1 overflow-y-auto font-mono text-xs leading-relaxed" ref={scrollRef}>
        {terminalHistory.map((entry) => (
          <div key={entry.id} className="mb-1">
            {entry.type === 'command' ? (
              <div className="flex">
                <span className="text-[var(--accent)] font-bold mr-2">morph@substrate:~$</span>
                <span className="text-[var(--text)]">{entry.content}</span>
              </div>
            ) : (
              <div className={`term-${entry.type} pl-4 whitespace-pre-wrap`}>{entry.content}</div>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border)] flex-shrink-0">
        <TermIcon size={12} className="text-[var(--accent)] flex-shrink-0" />
        <span className="text-[var(--accent)] font-bold font-mono text-xs whitespace-nowrap">morph@substrate:~$</span>
        <input
          className="flex-1 bg-transparent border-none outline-none text-[var(--text)] font-mono text-xs"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command..."
          autoFocus
        />
      </div>
    </div>
  );
}
