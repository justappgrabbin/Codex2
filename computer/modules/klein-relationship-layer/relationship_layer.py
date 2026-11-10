"""Relationship layer on top of Cynthia-Klein-Original-Trained.

The four language tools live in vendor/python, copied from Alexis's files and
not edited here. This file only wires their public functions together.

IMPLEMENTATION DECISION (Resolver):
  Her Klein tree has a module named frame_resolver.py. That module reads
  longitudes, charts, and degree/minute/second once a leading dimension is
  known. Addressing and birth time are on hold, so it is not used.
  Beside that sits klein_dependency.py (Klein & Simmons 1963). Its parser
  returns who-depends-on-whom links. DISEMINER (1968) stores exactly those
  kinds of links. So this layer uses klein_dependency.parse / Graph as the
  language Resolver that feeds DISEMINER. The difference is one of scale:
  frame_resolver resolves a sky frame; klein_dependency resolves a sentence.

IMPLEMENTATION DECISION (CompGram tags for the Resolver):
  klein_dependency.parse requires words already tagged (word/POS). CompGram
  (klein_grammar_coder.code_sentence) returns candidate class sets, not POS
  tags. When a word's class set maps to exactly one of ART, N, V, ADJ, P,
  CONJ, that tag is used. If more than one tag remains, the word is left
  untagged and the Resolver is not asked to parse that sentence. No tag is
  invented beyond this mapping of her published class names.

IMPLEMENTATION DECISION (the language-model lane):
  This layer takes text from the language-model lane and runs the tools on
  that text. It does not pass addresses, charts, or state-space into the
  model, and it does not import dimension_clock or frame_resolver.
  Starting her full Agent still needs pyswisseph (see probe_language_model).
  That is a fact about the existing agent, not a change made here.

IMPLEMENTATION DECISION (Klein Mesh):
  The v5.1 KleinEngine is a module bus (tools register and process symbols
  for each other). The Python paper tools answer the language questions.
  KleinEngine is used only as the named relationship bus, not as a stand-in
  for DISEMINER or CompGram.
"""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
VENDOR_PY = HERE / "vendor" / "python"


def _load(name: str, filename: str):
    path = VENDOR_PY / filename
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    # IMPLEMENTATION DECISION: load from the copied path so the originals
    # outside this folder stay untouched, even if they are also on sys.path.
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


diseminer = _load("klein_diseminer", "klein_diseminer.py")
autoling = _load("klein_autoling", "klein_autoling.py")
compgram = _load("klein_grammar_coder", "klein_grammar_coder.py")
resolver = _load("klein_dependency", "klein_dependency.py")

# IMPLEMENTATION DECISION: map CompGram class names (Table 1) onto the six
# POS tags klein_dependency.parse already understands.
CLASS_TO_POS = {
    "ART": "ART",
    "NOUN": "N",
    "PN": "N",
    "PN S": "N",
    "PN O": "N",
    "PN S/O": "N",
    "PN POS": "N",
    "PN DEM": "N",
    "PN REL": "N",
    "PN IND": "N",
    "PN RCN": "N",
    "VERB": "V",
    "VERB IS": "V",
    "AXV": "V",
    "V/AXV": "V",
    "/ING/": "V",
    "/HAVE/": "V",
    "ADJ": "ADJ",
    "ADV": "ADV",
    "PREP": "P",
    "PREP 0": "P",
    "PREP 1": "P",
    "PREP OF": "P",
    "CONJC": "CONJ",
    "CONJR": "CONJ",
    "CONJRO": "CONJ",
    "CONJR2": "CONJ",
}
# IMPLEMENTATION DECISION: punctuation classes are not POS tags.
SKIP_CLASSES = {". TYPE", ", TYPE"}


def run_diseminer(sentences, question=None, lex=None):
    """Ask her DISEMINER to read sentences and, optionally, answer a question."""
    d = diseminer.Diseminer()
    lex_fn = lex or diseminer.lex
    links = []
    for s in sentences:
        links.extend(d.read(s, lex_fn))
    out = {"tool": "DISEMINER", "links": [list(x) for x in links], "stems": sorted(d.stems)}
    if question is not None:
        ok, miss = d.question(question, lex_fn)
        out["question"] = question
        out["possible"] = bool(ok)
        out["missing"] = [f"{x}->{y}" for x, y in miss]
    return out, d


def run_autoling(sentences, informant=None):
    """Feed sentences to her AUTOLING learner and return the rules it coined."""
    sents = [s.split() if isinstance(s, str) else list(s) for s in sentences]
    if informant is None:
        allowed = {tuple(s) for s in sents}
        informant = lambda s, _allowed=allowed: tuple(s) in _allowed
    learner = autoling.Autoling(informant)
    reports = [learner.feed(s) for s in sents]
    classes = {k: sorted(v) for k, v in learner.classes().items()}
    return {
        "tool": "AUTOLING",
        "reports": reports,
        "rules": learner.show(),
        "classes": classes,
        "sentences": [" ".join(s) for s in sents],
    }, learner


def run_compgram(text):
    """Code text with her 1963 computational grammar coder."""
    words = compgram.tokenize(text) if isinstance(text, str) else list(text)
    codes = compgram.code_sentence_text(words)
    rows = [{"word": w, "codes": list(c) if not isinstance(c, str) else [c]} for w, c in zip(words, codes)]
    return {"tool": "CompGram", "rows": rows}, rows


def _unique_pos(codes):
    useful = [c for c in codes if c not in SKIP_CLASSES]
    if not useful:
        return "PUNCT"
    tags = {CLASS_TO_POS[c] for c in useful if c in CLASS_TO_POS}
    if len(tags) == 1:
        return next(iter(tags))
    return None


def tag_with_compgram(text):
    """IMPLEMENTATION DECISION: CompGram class sets to Resolver POS tags, only when unique."""
    result, rows = run_compgram(text)
    tagged = []
    pending = []
    for row in rows:
        word = row["word"]
        pos = _unique_pos(row["codes"])
        if pos == "PUNCT" or word in ".?!":
            tagged.append(".")
            continue
        if pos is None:
            pending.append(row)
        else:
            tagged.append(f"{word}/{pos}")
    result["tagged"] = " ".join(x for x in tagged if x != ".") + ("." if tagged and tagged[-1] == "." else "")
    result["pending"] = pending
    return result


def run_resolver(tagged_text):
    """Resolve dependency links with her 1963 parser."""
    graph = resolver.Graph(tagged_text)
    links = []
    for tok in graph.toks:
        for head_i in graph.edges[tok.i]:
            head = graph.toks[head_i]
            kind = "T" if head.pos == "N" else "I"
            links.append((tok.lem, head.lem, kind))
    lex_map = {t.lem: (t.lem, t.pos) for t in graph.toks}
    return {
        "tool": "Resolver",
        "source": "klein_dependency.py",
        "tagged": tagged_text,
        "tokens": [{"word": t.word, "pos": t.pos, "lem": t.lem} for t in graph.toks],
        "links": [list(x) for x in links],
    }, graph, lex_map


def resolver_to_diseminer(tagged_text, question=None):
    """Pipe Resolver links into DISEMINER. This is the language pipe, not an address pipe."""
    resolved, graph, lex_map = run_resolver(tagged_text)
    d = diseminer.Diseminer()
    d.add_links([(x, y, k) for x, y, k in (tuple(L) for L in resolved["links"])])
    for lem, (_s, pos) in lex_map.items():
        d.pos[lem].add(pos)
        d.stems.add(lem)

    def lex(w, _map=lex_map):
        key = w.lower()
        if key in _map:
            return _map[key]
        return diseminer.lex(w)

    out = {"from": "Resolver", "into": "DISEMINER", "links": resolved["links"], "tagged": tagged_text}
    if question is not None:
        ok, miss = d.question(question, lex)
        out["question"] = question
        out["possible"] = bool(ok)
        out["missing"] = [f"{x}->{y}" for x, y in miss]
    return out, d


def autoling_to_compgram(sentences, informant=None):
    """Pipe sentences AutoLing accepted (or coined rules over) into CompGram."""
    learned, _learner = run_autoling(sentences, informant=informant)
    text = " ".join(s if s.endswith((".", "?", "!")) else s + "." for s in learned["sentences"])
    coded, _rows = run_compgram(text)
    return {"from": "AUTOLING", "into": "CompGram", "autoling": learned, "compgram": coded}


def from_language_model_lane(text):
    """End-to-end: text from the language-model lane, through CompGram, Resolver, DISEMINER.

    No address, birth time, or state-space is attached to the text.
    """
    if not text or not str(text).strip():
        return {"ok": False, "error": "empty text from the language-model lane"}
    text = str(text).strip()
    if not text.endswith((".", "?", "!")):
        text = text + "."
    tagged = tag_with_compgram(text)
    out = {
        "ok": False,
        "lane": "language-model",
        "text": text,
        "compgram": tagged,
        "used_address": False,
        "used_state_space": False,
        "path": None,
    }
    # IMPLEMENTATION DECISION: Resolver is only fed uniquely tagged words.
    # CompGram often leaves more than one class (that is the 1963 coder).
    # When that happens, the lane still asks DISEMINER to read the plain
    # sentence with DISEMINER's own lex and parser, which are hers, rather
    # than inventing tags for the Resolver.
    if not tagged["pending"]:
        piped, _d = resolver_to_diseminer(tagged["tagged"], question=text.rstrip("."))
        out["ok"] = True
        out["path"] = "compgram-resolver-diseminer"
        out["resolver"] = {"links": piped["links"], "tagged": piped["tagged"]}
        out["diseminer"] = {
            "possible": piped.get("possible"),
            "missing": piped.get("missing"),
            "question": piped.get("question"),
        }
        return out
    dise, _d = run_diseminer([text.rstrip(".")], question=text.rstrip("."))
    out["ok"] = True
    out["path"] = "diseminer-own-lex"
    out["resolver"] = {
        "skipped": True,
        "reason": "CompGram left more than one class on some words; tags were not invented.",
        "pending": tagged["pending"],
    }
    out["diseminer"] = {
        "possible": dise.get("possible"),
        "missing": dise.get("missing"),
        "question": dise.get("question"),
        "links": dise.get("links"),
    }
    return out


def probe_language_model(python_bin: str, klein_root: str) -> dict:
    """Can her Agent start without compiling extensions?

    pyswisseph has no pre-built wheel here and needs Python.h (the Python
    development headers) to compile. The paper tools in this layer do not.
    """
    import subprocess
    # Keep this probe tiny and side-effect free.
    probe = r"""
import importlib.util, json, sys
missing = []
for name in ("torch", "tokenizers", "swisseph"):
    if importlib.util.find_spec(name) is None:
        missing.append(name)
print(json.dumps({"ok": not missing, "missing": missing}))
"""
    try:
        proc = subprocess.run(
            [python_bin, "-c", probe],
            capture_output=True, text=True, timeout=20, check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        return {"ok": False, "error": str(exc), "needs_python_dev_headers": True}
    try:
        data = json.loads(proc.stdout.strip().splitlines()[-1])
    except (json.JSONDecodeError, IndexError):
        return {"ok": False, "error": proc.stderr or proc.stdout, "needs_python_dev_headers": True}
    data["needs_python_dev_headers"] = "swisseph" in data.get("missing", [])
    data["why"] = (
        "pyswisseph has no binary wheel on this Python, so pip has to compile it, "
        "and that compile needs Python.h (the python3-dev / Python development headers). "
        "The paper tools in this layer do not use it. Her Agent imports "
        "dialogue_experiment, which imports dimension_clock, which imports swisseph."
        if data["needs_python_dev_headers"]
        else "Agent imports appear to be present."
    )
    data["klein_root_present"] = Path(klein_root).is_dir()
    data["weights_present"] = (Path(klein_root) / "run" / "model.pt").is_file()
    return data


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    if not argv:
        print(json.dumps({"error": "need a command"}))
        return 2
    cmd = argv[0]
    payload = json.loads(argv[1]) if len(argv) > 1 else {}
    if cmd == "diseminer":
        out, _ = run_diseminer(payload["sentences"], payload.get("question"))
        print(json.dumps(out))
        return 0
    if cmd == "autoling":
        out, _ = run_autoling(payload["sentences"])
        print(json.dumps(out))
        return 0
    if cmd == "compgram":
        out, _ = run_compgram(payload["text"])
        print(json.dumps(out))
        return 0
    if cmd == "resolver":
        out, _g, _m = run_resolver(payload["tagged"])
        print(json.dumps(out))
        return 0
    if cmd == "resolver-to-diseminer":
        out, _ = resolver_to_diseminer(payload["tagged"], payload.get("question"))
        print(json.dumps(out))
        return 0
    if cmd == "autoling-to-compgram":
        print(json.dumps(autoling_to_compgram(payload["sentences"])))
        return 0
    if cmd == "from-lm-lane":
        print(json.dumps(from_language_model_lane(payload["text"])))
        return 0
    if cmd == "probe-lm":
        print(json.dumps(probe_language_model(payload["python"], payload["root"])))
        return 0
    print(json.dumps({"error": f"unknown command {cmd}"}))
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
