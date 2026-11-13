import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Terminal as TerminalIcon, Zap } from "lucide-react";
import { FileSystem, type FileNode } from "@/lib/fileSystem";

interface TerminalLine {
  type: "input" | "output" | "error";
  content: string;
}
interface TerminalProps {
  onClose?: () => void;
}
interface ContainerStatus {
  enabled: boolean;
  shell: string;
  cwd: string;
  message: string;
}
const QUICK_COMMANDS = [
  { label: "Help", cmd: "help", icon: "❓" },
  { label: "Start App", cmd: "start app", icon: "▶" },
  { label: "Files", cmd: "ls", icon: "📋" },
  { label: "History", cmd: "history", icon: "📜" },
  { label: "Clear", cmd: "clear", icon: "🧹" },
];

const OFFLINE: ContainerStatus = {
  enabled: false,
  shell: "IDE workspace",
  cwd: "/ide",
  message: "Native command runtime not connected",
};

function allProjectFiles(): FileNode[] {
  const items: FileNode[] = [];
  function walk(nodes: FileNode[]) {
    for (const item of nodes) {
      items.push(item);
      if (item.children) walk(item.children);
    }
  }
  walk(FileSystem.getAllFiles());
  return items;
}

export function Terminal({ onClose }: TerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: "output", content: "SynthAi2 Terminal • IDE workspace" },
    { type: "output", content: "Use 'start app' to launch the real IDE preview. Type 'help' for commands." },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showReference, setShowReference] = useState(false);
  const [container, setContainer] = useState<ContainerStatus>(OFFLINE);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Never assume a same-origin SPA fallback is the command API.
    fetch("/api/container/status", { cache: "no-store" })
      .then(async response => {
        if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
          return OFFLINE;
        }
        const result: ContainerStatus = await response.json();
        return typeof result.enabled === "boolean" ? result : OFFLINE;
      })
      .then(setContainer)
      .catch(() => setContainer(OFFLINE));
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  function write(content: string, type: TerminalLine["type"] = "output") {
    setLines(old => [...old, { type, content }]);
  }

  async function executeShell(command: string) {
    try {
      const response = await fetch("/api/container/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      if (!response.headers.get("content-type")?.includes("application/json")) {
        throw new Error("Execution service is not available");
      }
      const result: { success?: boolean; code?: number | null; stdout?: string; stderr?: string; error?: string } = await response.json();
      if (!response.ok || !result.success || result.code !== 0) {
        write(result.error || result.stderr || "Command failed", "error");
        return;
      }
      write([result.stdout, result.stderr].filter(Boolean).join("\n") || "[finished successfully]");
    } catch (error) {
      setContainer(OFFLINE);
      write(error instanceof Error ? error.message : "Execution service disconnected", "error");
    }
  }

  async function execute(raw: string) {
    const value = raw.trim();
    if (!value) return;
    write("$ " + value, "input");
    setHistory(old => [...old, value]);
    setHistoryIndex(-1);
    const [command, ...args] = value.split(/\s+/);
    const name = command.toLowerCase();
    const path = args[0];

    try {
      switch (name) {
        case "help":
          write([
            "IDE commands (run inside this APK):",
            "  start app    Launch the actual project preview",
            "  ls           List IDE workspace files",
            "  cat FILE     Read a project file",
            "  touch FILE   Create a project file",
            "  mkdir NAME   Create a project folder",
            "  rm FILE      Delete a project file or folder",
            "  pwd          Show IDE workspace",
            "  echo TEXT    Echo text",
            "  date         Current time",
            "  history      Command history",
            "  clear        Clear output",
            "OS commands are forwarded only when an actual command backend is connected.",
            "There is no simulated Linux, network, disk, or process output.",
          ].join("\n"));
          return;
        case "clear":
          setLines([]);
          return;
        case "history":
          write(history.length ? history.map((x, i) => (i + 1) + "  " + x).join("\n") : "No prior commands");
          return;
        case "pwd":
          write("IDE project /");
          return;
        case "echo":
          write(args.join(" "));
          return;
        case "date":
          write(new Date().toString());
          return;
        case "ls": {
          const files = allProjectFiles();
          write(files.length ? files.map(x => (x.type === "folder" ? "📁 " : "📄 ") + x.path).join("\n") : "Project has no files");
          return;
        }
        case "cat": {
          const file = allProjectFiles().find(x => x.path === path && x.type === "file");
          if (!file) { write("File not found: " + (path || "(none)"), "error"); return; }
          write(file.content || "(empty file)");
          return;
        }
        case "mkdir": {
          if (!path) { write("Usage: mkdir NAME", "error"); return; }
          if (allProjectFiles().some(x => x.path === path)) { write("Already exists: " + path, "error"); return; }
          const segments = path.split("/");
          const folder = segments.pop() || "";
          const parent = segments.join("/");
          if (parent && !allProjectFiles().some(x => x.path === parent && x.type === "folder")) {
            write("Parent folder does not exist: " + parent, "error"); return;
          }
          FileSystem.createFolder(parent, folder);
          write("Created project folder: " + path);
          return;
        }
        case "touch": {
          if (!path) { write("Usage: touch FILE", "error"); return; }
          if (allProjectFiles().some(x => x.path === path)) { write("Already exists: " + path); return; }
          const segments = path.split("/");
          const filename = segments.pop() || "";
          const parent = segments.join("/");
          if (parent && !allProjectFiles().some(x => x.path === parent && x.type === "folder")) {
            write("Parent folder does not exist: " + parent, "error"); return;
          }
          FileSystem.createFile(parent, filename);
          write("Created project file: " + path);
          return;
        }
        case "rm": {
          if (!path || path.startsWith("-")) { write("Usage: rm PROJECT_FILE", "error"); return; }
          if (!allProjectFiles().some(x => x.path === path)) { write("File not found: " + path, "error"); return; }
          if (!window.confirm("Delete " + path + " from the IDE workspace?")) { write("Cancelled"); return; }
          FileSystem.deleteFile(path);
          write("Deleted from IDE workspace: " + path);
          return;
        }
        case "start":
        case "run": {
          if (args.length && args[0] !== "app" && args[0] !== "preview") break;
          if (!FileSystem.findFile("index.html")?.content) {
            write("No index.html project file is available to start.", "error");
            return;
          }
          window.dispatchEvent(new Event("synthia-ide-start-app"));
          write("Launched the real IDE project preview.");
          return;
        }
      }
      if (container.enabled) {
        await executeShell(value);
      } else {
        write("No native command runtime connected. IDE file commands and 'start app' still work. This is not a simulated shell.", "error");
      }
    } catch (error) {
      write(error instanceof Error ? error.message : String(error), "error");
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = input;
    setInput("");
    void execute(value);
  }

  return (
    <div className="flex flex-col h-full min-h-[250px] bg-black/95 text-green-400 rounded-lg overflow-hidden border border-green-500/20">
      <div className="flex items-center justify-between px-3 py-2 bg-green-500/10 border-b border-green-500/20">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-4 w-4" />
          <span className="text-sm font-mono font-semibold">SynthAi2 Terminal</span>
          <span className="text-xs text-green-300/70">{container.enabled ? "OS connected" : "IDE workspace"}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setShowReference(!showReference)} className="h-7 text-xs text-green-300">
            {showReference ? "Hide help" : "Commands"}
          </Button>
          {onClose && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Close terminal"><X className="h-4 w-4" /></Button>}
        </div>
      </div>
      <div className="px-3 py-2 flex flex-wrap gap-2 border-b border-green-500/20">
        <Zap className="w-4 h-4 self-center" />
        {(showReference ? QUICK_COMMANDS : QUICK_COMMANDS.slice(0, 4)).map(x => (
          <Badge key={x.cmd} variant="outline" className="cursor-pointer border-green-500/30 text-green-300" onClick={() => void execute(x.cmd)}>
            {x.icon} {x.label}
          </Badge>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3" ref={scrollRef}>
        <div className="font-mono text-sm space-y-1">
          {lines.map((line, index) => (
            <div key={index} className={"whitespace-pre-wrap break-words " + (line.type === "error" ? "text-red-400" : line.type === "input" ? "text-green-400 font-semibold" : "text-green-300/80")}>{line.content}</div>
          ))}
        </div>
      </div>
      <form onSubmit={submit} className="p-3 border-t border-green-500/20">
        <div className="flex items-center gap-2">
          <span className="font-mono">$</span>
          <Input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} placeholder="start app" className="flex-1 bg-transparent border-none text-green-300 font-mono" data-testid="input-terminal-command"/>
        </div>
      </form>
    </div>
  );
}
