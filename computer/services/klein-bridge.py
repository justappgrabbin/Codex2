#!/usr/bin/env python3
"""Thin stdin/stdout bridge to Alexis's unchanged Klein agent. Does not modify weights."""
import json, os, sys
from pathlib import Path

root = Path(os.environ.get("SYNTHIA_KLEIN_ROOT", "")).expanduser()
if not root.is_dir():
    print(json.dumps({"ok": False, "error": "SYNTHIA_KLEIN_ROOT is missing"}), flush=True)
    sys.exit(2)
sys.path.insert(0, str(root / "klein_tools_fixed/neural"))
from skilled_agent import Agent

agent = Agent(root)
print(json.dumps({"ok": True, "ready": True}), flush=True)
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        payload = json.loads(line)
        text = str(payload.get("text") or payload.get("message") or "")
        result = agent.respond(text, preferred=payload.get("language") or "en",
                               skill=payload.get("skill"), speaker=payload.get("name") or "user")
        if isinstance(result, dict):
            out = {"ok": True, **{k: result[k] for k in result if k in ("text", "reply", "message", "utterance") or True}}
            # keep JSON-serializable
            print(json.dumps({"ok": True, "result": json.loads(json.dumps(result, default=str))}, ensure_ascii=False), flush=True)
        else:
            print(json.dumps({"ok": True, "result": {"text": str(result)}}), flush=True)
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}), flush=True)
