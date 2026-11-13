import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import useOSStore from '../store/useOSStore';

export default function NeuralTerminal() {
  const terminalVisible = useOSStore((s) => s.terminalVisible);
  const toggleTerminal = useOSStore((s) => s.toggleTerminal);
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

  if (!terminalVisible) return null;

  const execute = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    addTerminalEntry({ type: 'prompt', content: `morph@substrate:~$ ${trimmed}` });
    setHistory((h) => [...h, trimmed]);
    setHistIndex(-1);

    const parts = trimmed.split(' ');
    const command = parts[0];

    switch (command) {
      case 'help':
        addTerminalEntry({ type: 'info', content: `Available commands:
  neural-status        Show substrate status
  gate-list            List active gates
  self-inject          Trigger self-injection
  federation-status    Show federation connections
  federation-connect   Connect to an instance
  federation-publish   Publish to federation
  evolve-status        Show evolution status
  evolve-trigger       Trigger evolution cycle
  bedrock-strata       List Bedrock Linux strata
  bedrock-enable       Enable a stratum
  clear                Clear terminal
  help                 Show this help` });
        break;

      case 'neural-status':
        addTerminalEntry({ type: 'success', content: 'Substrate: ONLINE\nActive Gates: 24/64\nMesh Nodes: 12\nCoherence: 0.87\nDimension Balance: MOVEMENT(65) EVOLUTION(78) BEING(52) DESIGN(43) SPACE(71)' });
        break;

      case 'gate-list':
        addTerminalEntry({ type: 'info', content: 'Active Gates: 1, 2, 3, 7, 10, 11, 14, 17, 20, 22, 23, 25, 29, 34, 35, 36, 37, 41, 42, 43, 44, 48, 53, 57' });
        break;

      case 'self-inject':
        addTerminalEntry({ type: 'success', content: 'Self-injection cycle triggered. New neural pathways forming...' });
        pushToast({ message: 'Self-injection cycle started', type: 'info' });
        break;

      case 'federation-status': {
        const peers = useOSStore.getState().federationPeers;
        let out = 'Federation Status: FEDERATED\nConnected Peers:\n';
        for (const p of peers) {
          out += `  [${p.status.toUpperCase()}] ${p.name} (${p.domain}) — ${p.messageCount} msgs\n`;
        }
        addTerminalEntry({ type: 'info', content: out.trim() });
        break;
      }

      case 'federation-connect': {
        const instance = parts[1];
        if (!instance) {
          addTerminalEntry({ type: 'error', content: 'Usage: federation-connect <instance-domain>' });
        } else {
          addTerminalEntry({ type: 'success', content: `Connecting to ${instance}...\nHandshake successful. Peer added to federation mesh.` });
          pushToast({ message: `Connected to ${instance}`, type: 'success' });
        }
        break;
      }

      case 'federation-publish': {
        const msg = parts.slice(1).join(' ');
        if (!msg) {
          addTerminalEntry({ type: 'error', content: 'Usage: federation-publish <message>' });
        } else {
          addTerminalEntry({ type: 'success', content: `Published to federation: "${msg}"` });
          pushToast({ message: 'Message published to federation', type: 'success' });
        }
        break;
      }

      case 'evolve-status': {
        const ev = useOSStore.getState().evolution;
        addTerminalEntry({ type: 'info', content: `Evolution Cycle: #${ev.currentCycle}\nPhase: ${ev.currentPhase}\nProgress: ${Math.round(ev.phaseProgress * 100)}%\nBest Fitness: ${ev.bestFitness.toFixed(2)}\nStatus: ${ev.enabled ? 'ACTIVE' : 'PAUSED'}` });
        break;
      }

      case 'evolve-trigger':
        addTerminalEntry({ type: 'success', content: 'Evolution cycle triggered manually. Population evaluation starting...' });
        pushToast({ message: 'Evolution cycle triggered', type: 'success' });
        break;

      case 'bedrock-strata': {
        const strata = useOSStore.getState().bedrockStrata;
        let out = 'Bedrock Linux Strata:\n';
        for (const s of strata) {
          out += `  [${s.status.toUpperCase()}] ${s.distro} — ${s.packages} pkgs (P${s.priority})\n`;
        }
        addTerminalEntry({ type: 'info', content: out.trim() });
        break;
      }

      case 'bedrock-enable': {
        const stratumName = parts[1];
        if (!stratumName) {
          addTerminalEntry({ type: 'error', content: 'Usage: bedrock-enable <stratum-name>' });
        } else {
          const strata = useOSStore.getState().bedrockStrata;
          const stratum = strata.find((s) => s.name === stratumName);
          if (stratum) {
            useOSStore.getState().toggleStratum(stratum.id);
            addTerminalEntry({ type: 'success', content: `Stratum "${stratumName}" enabled.` });
          } else {
            addTerminalEntry({ type: 'error', content: `Stratum "${stratumName}" not found.` });
          }
        }
        break;
      }

      case 'clear':
        useOSStore.setState({ terminalHistory: [] });
        break;

      default:
        addTerminalEntry({ type: 'error', content: `Command not found: ${command}. Type "help" for available commands.` });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      execute(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = histIndex < history.length - 1 ? histIndex + 1 : histIndex;
        setHistIndex(newIndex);
        setInput(history[history.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIndex > 0) {
        const newIndex = histIndex - 1;
        setHistIndex(newIndex);
        setInput(history[history.length - 1 - newIndex] || '');
      } else {
        setHistIndex(-1);
        setInput('');
      }
    }
  };

  return (
    <div className="neural-terminal">
      <div className="terminal-header">
        <span className="text-sm font-semibold flex items-center gap-2">
          <span className="text-[var(--accent)]">&#x25C8;</span> Neural Terminal
        </span>
        <button onClick={toggleTerminal} className="p-1 rounded hover:bg-white/10 transition-colors">
          <X size={14} className="text-[var(--text-muted)]" />
        </button>
      </div>
      <div className="terminal-body" ref={scrollRef}>
        {terminalHistory.map((entry) => (
          <div key={entry.id} className="terminal-line">
            {entry.type === 'prompt' ? (
              <span className="text-[var(--text-muted)]">{entry.content}</span>
            ) : (
              <span className={`term-${entry.type}`}>{entry.content}</span>
            )}
          </div>
        ))}
      </div>
      <div className="terminal-input-row">
        <span className="terminal-prompt text-xs">morph@substrate:~$</span>
        <input
          className="terminal-input"
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
