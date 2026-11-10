#!/usr/bin/env python3
"""
klein_dependency.py -- Klein's coherent-discourse generator, from the papers themselves.

SOURCES (read this session from your Drive):
  Klein & Simmons 1963, "Syntactic Dependence and the Computer Generation of Coherent Discourse",
      Mechanical Translation 7(2): the ten dependency rules, transitivity of dependence, the three
      rules of non-transitivity, a phrase-structure generator of grammatical nonsense, and a
      monitor that aborts any choice whose dependencies do not hold in the source text.
  Klein 1965, "Control of Style with a Generative Grammar", Language 41(4): style is controlled by
      weighting the chance that each generation rule is tried (incl. subject-pronoun frequency);
      essay format: a major cycle over outline nouns, a minor cycle over verbs, each verb used once.

What is implemented, as the papers state it
  Dependency edges are stored dependent -> governor:
    1 verb -> head of its subject          2 object head -> verb
    3 object of a preposition -> the preposition
    4 preposition -> its verb, and also the noun before it in the predicate if there is one
    5 determiners and adjectives -> their head noun
    7 two-way links between a phrase head and any form of "to be" or the preposition "of"
    8 two-way links between tokens of the same noun (across the whole text)
  Transitivity: a word depends on another if a path of these edges joins them, EXCEPT that a path
    may not pass THROUGH a verb (other than "to be"), a preposition (other than "of"), or a
    subordinating conjunction.
  Generation: choose heads first; each chosen TOKEN must depend, by such a path, on the token it
    modifies; the object of a verb is always attempted (a verb is intransitive only if the source
    gives it no object).
Provisional (yours, not the papers'): the reading of who/what/where/when/why as Space, Evolution,
  Being, Movement, Design, and how each is found in a sentence.

Run: python3 klein_dependency.py   (demo + self-test; reproduces examples from both papers)
"""
import random
import re
from collections import defaultdict, deque

BE = {"is", "are", "was", "were", "be", "been", "am"}
DIM_OF_EARLIER = {"who": "Space", "what": "Evolution", "where": "Being", "when": "Movement", "why": "Design"}   # before Colors book p.40 was read
DIM_OF = {"who": "Space", "what": "Evolution", "where": "Movement", "when": "Being", "why": "Design"}            # p.40 (see five_w.py)


class Tok:
    def __init__(self, i, word, pos, sent, tags):
        self.i, self.word, self.pos, self.sent, self.tags = i, word, pos, sent, set(tags)
        self.lem = word.lower()

    def __repr__(self):
        return f"{self.word}#{self.i}"


def parse(text):
    """Source text, tagged word/POS[:tag,tag] (POS: ART ADJ N V P CONJ), one sentence per line.
    Tags: m f n pl (gender/number), time, place. Returns (tokens, dependency graph)."""
    toks, edges = [], defaultdict(set)
    sentences = [ln.strip() for ln in re.split(r"\.(?:\s|$)|\n", text) if ln.strip()]   # a sentence ends at a period or a line
    for si, line in enumerate(sentences):
        for part in line.replace(".", "").split():
            w, rest = part.split("/")
            pos, _, tg = rest.partition(":")
            toks.append(Tok(len(toks), w, pos, si, tg.split(",") if tg else []))
    by_sent = defaultdict(list)
    for t in toks:
        by_sent[t.sent].append(t)

    def link(a, b, two=False):
        edges[a.i].add(b.i)
        if two:
            edges[b.i].add(a.i)

    for si, ts in by_sent.items():
        clauses, cur = [], []
        for t in ts:
            if t.pos == "CONJ":
                clauses.append(cur); cur = []
            else:
                cur.append(t)
        clauses.append(cur)
        for cl in clauses:                                   # no links across a subordinating conjunction
            chunks, i = [], 0
            while i < len(cl):
                if cl[i].pos in ("ART", "ADJ", "N"):
                    j = i
                    while j < len(cl) and cl[j].pos in ("ART", "ADJ"):
                        j += 1
                    if j < len(cl) and cl[j].pos == "N":
                        for m in cl[i:j]:
                            link(m, cl[j])                    # rule 5
                        chunks.append(("NP", cl[j])); i = j + 1; continue
                chunks.append((cl[i].pos, cl[i])); i += 1
            subj = verb = prev_noun = None
            k = 0
            while k < len(chunks):
                kind, t = chunks[k]
                if kind == "NP" and verb is None and subj is None:
                    subj = t; prev_noun = t
                elif kind == "V" and verb is None:
                    verb = t
                    if subj:
                        link(verb, subj, two=(verb.lem in BE))          # rules 1, 7
                elif kind == "NP" and verb is not None and (k == 0 or chunks[k - 1][0] != "P"):
                    link(t, verb, two=(verb.lem in BE)); prev_noun = t  # rule 2 (and 7)
                elif kind == "P":
                    obj = chunks[k + 1][1] if k + 1 < len(chunks) and chunks[k + 1][0] == "NP" else None
                    if obj is not None:
                        if t.lem == "of":
                            link(obj, prev_noun, two=True) if prev_noun else None        # rule 7
                        else:
                            link(obj, t)                                                  # rule 3
                            link(t, verb) if verb else None                               # rule 4
                            if prev_noun is not None and prev_noun is not subj:
                                link(t, prev_noun)                                        # rule 4, intervening noun
                        k += 1
                k += 1
    seen = {}
    for t in toks:                                           # rule 8: like noun tokens, two-way
        if t.pos == "N":
            if t.lem in seen:
                link(t, seen[t.lem], two=True)
            seen[t.lem] = t
    return toks, edges


class Graph:
    def __init__(self, text):
        self.toks, self.edges = parse(text)

    def depends(self, a, b, transitive_prep=False, word_level=False):
        """Does token a depend (transitively) on token b? Word-level compares any tokens of those words."""
        if word_level:
            return any(self.depends(x, y, transitive_prep)
                       for x in self.toks if x.lem == a.lem for y in self.toks if y.lem == b.lem)
        q, seen = deque([a.i]), {a.i}
        while q:
            u = q.popleft()
            for v in self.edges[u]:
                if v == b.i:
                    return True
                if v in seen:
                    continue
                t = self.toks[v]                              # passing THROUGH t
                blocked = (t.pos == "V" and t.lem not in BE) or \
                          (t.pos == "P" and t.lem != "of" and not transitive_prep) or t.pos == "CONJ"
                if not blocked:
                    seen.add(v); q.append(v)
        return False


DEFAULT_W = {"adj": 0.4, "art": 0.9, "pp": 0.6, "pron": 0.0}


class Generator:
    """Weighted random generation with an optional dependency monitor."""

    def __init__(self, text, weights=None, monitor=True, word_level=False, transitive_prep=False, seed=None):
        self.g = Graph(text)
        self.w = dict(DEFAULT_W, **(weights or {}))
        self.monitor, self.word_level, self.tp = monitor, word_level, transitive_prep
        self.rng = random.Random(seed)
        T = self.g.toks
        self.N = [t for t in T if t.pos == "N"]; self.V = [t for t in T if t.pos == "V"]
        self.P = [t for t in T if t.pos == "P"]; self.ADJ = [t for t in T if t.pos == "ADJ"]
        self.ART = [t for t in T if t.pos == "ART"]

    @staticmethod
    def show(t):
        return t.word if "p" in t.tags else t.word.lower()

    def dep(self, a, b):
        return (not self.monitor) or self.g.depends(a, b, self.tp, self.word_level)

    def np(self, head, first):
        out = []
        if self.ART and self.rng.random() < self.w["art"]:
            c = [a for a in self.ART if self.dep(a, head)]
            if c:
                out.append(self.show(self.rng.choice(c)))
        if self.ADJ and self.rng.random() < self.w["adj"]:
            c = [a for a in self.ADJ if self.dep(a, head)]
            if c:
                out.append(self.show(self.rng.choice(c)))
        out.append(self.show(head))
        return out

    def pronoun(self, t):
        return {"m": "he", "f": "she", "n": "it", "pl": "they"}.get(next((g for g in ("m", "f", "n", "pl") if g in t.tags), "n"))

    def sentence(self, subject=None, verb=None, prev_subject=None):
        if subject is not None:
            cands = [subject]
        else:                                    # as in the paper: if a noun cannot be the subject, another is selected
            cands = list(self.N)
            self.rng.shuffle(cands)
        for s in cands:
            vs = [v for v in self.V if self.dep(v, s)] if verb is None else [verb]
            if vs:
                break
        else:
            return None
        v = self.rng.choice(vs)
        os_ = [o for o in self.N if o is not s and self.dep(o, v)]       # an object is always attempted
        o = self.rng.choice(os_) if os_ else None
        use_pron = prev_subject is not None and prev_subject.lem == s.lem and self.rng.random() < self.w["pron"]
        words = [self.pronoun(s)] if use_pron else self.np(s, True)
        words.append(self.show(v))
        if o is not None:
            words += self.np(o, False)
        if self.P and self.rng.random() < self.w["pp"]:
            ps = [p for p in self.P if self.dep(p, v) or (o is not None and self.dep(p, o))]
            if ps:
                p = self.rng.choice(ps)
                qs = [q for q in self.N if q is not o and self.dep(q, p)]
                if qs:
                    words += [self.show(p)] + self.np(self.rng.choice(qs), False)
        text = " ".join(words)
        return text[0].upper() + text[1:] + ".", s, v, o

    def essay(self, outline_nouns):
        """Klein 1965: major cycle over outline nouns, minor cycle over the verb list; a verb used
        once is deleted; each paragraph says what can be said about one subject."""
        verbs, paras, used = list(self.V), [], set()
        for lem in outline_nouns:
            subs = [n for n in self.N if n.lem == lem.lower()]
            if not subs:
                continue
            para, prev = [], None
            for v in list(verbs):
                if v.i in used:
                    continue
                for s in subs:
                    if self.g.depends(v, s, self.tp):
                        r = self.sentence(subject=s, verb=v, prev_subject=prev)
                        if r:
                            para.append(r[0]); prev = s; used.add(v.i)
                        break
            paras.append(para)
        return paras


def read_5w(text):
    """PROVISIONAL reading of one tagged sentence as who/what/where/when/why -> Space, Evolution,
    Being, Movement, Design (your mapping). who = subject head, what = object/complement head,
    where = object of a preposition tagged place, when = ... tagged time, why = the clause after because."""
    g = Graph(text)
    out, clauses, cur = {}, [], []
    for t in g.toks:
        if t.pos == "CONJ" and t.lem == "because":
            clauses.append(cur); cur = []
            continue
        cur.append(t)
    clauses.append(cur)
    main = clauses[0]
    subj = next((t for t in main if t.pos == "N"), None)
    vi = next((i for i, t in enumerate(main) if t.pos == "V"), None)
    if subj:
        out["who"] = subj.word
    if vi is not None:
        for i in range(vi + 1, len(main)):
            t = main[i]
            if t.pos == "N" and (i == 0 or main[i - 1].pos != "P") and (i == 0 or main[i - 1].pos in ("ART", "ADJ", "V")):
                out.setdefault("what", t.word)
            if t.pos == "N" and "time" in t.tags:
                out["when"] = t.word
            if t.pos == "N" and "place" in t.tags:
                out["where"] = t.word
    if len(clauses) > 1:
        out["why"] = " ".join(t.word for t in clauses[1])
    return {k: (v, DIM_OF[k]) for k, v in out.items()}


# ---------------------------------------------------------------- self-test
def selftest():
    ok = True

    def check(name, cond, detail=""):
        nonlocal ok
        ok &= bool(cond)
        print(f"  [{'PASS' if cond else 'FAIL'}] {name} {detail}")

    print("KLEIN DEPENDENCY SELF-TEST")
    soup = "The/ART man/N ate/V soup/N in/P the/ART summer/N."
    g = Graph(soup)
    t = {x.word: x for x in g.toks if x.pos != "ART"}
    check("1963 example: 'summer' reaches 'ate' only if transitivity across prepositions is allowed",
          not g.depends(t["summer"], t["ate"]) and g.depends(t["summer"], t["ate"], transitive_prep=True))
    check("'in' depends on both 'ate' and the noun before it, 'soup' (rule 4)",
          g.depends(t["in"], t["ate"]) and g.depends(t["in"], t["soup"]))

    def sentences(txt, n=400, **kw):
        out = set()
        for s in range(n):
            r = Generator(txt, seed=s, **kw).sentence()
            if r:
                out.add(r[0])
        return out
    with_m = sentences(soup)
    free = sentences(soup, transitive_prep=True)
    check("monitor keeps 'The man ate summer' out; allowing transitivity across 'in' lets it in",
          not any("ate summer" in s or "ate the summer" in s for s in with_m)
          and any("ate summer" in s or "ate the summer" in s for s in free))

    two = "The/ART man/N works/V in/P a/ART store/N. The/ART man/N sleeps/V in/P a/ART bed/N."
    tok = sentences(two); wrd = sentences(two, word_level=True)
    check("token-level monitor never makes 'works in a bed'; word-level does (the paper's own warning)",
          not any("works in a bed" in s or "sleeps in a store" in s for s in tok)
          and any("works in a bed" in s or "sleeps in a store" in s for s in wrd))

    dogs = "Dogs/N are/V canines/N. Canines/N eat/V meat/N."
    good = sentences(dogs, weights={"pp": 0, "art": 0, "adj": 0}); nonsense = sentences(dogs, monitor=False, weights={"pp": 0, "art": 0, "adj": 0})
    bad = {"Meat eat dogs.", "Canines eat dogs.", "Meat are dogs.", "Dogs eat canines."}
    check("dogs/canines: 'Dogs eat meat' and 'Dogs are canines' come out; 'Meat eat dogs' never does",
          {"Dogs eat meat.", "Dogs are canines."} <= good and not (good & {"Meat eat dogs.", "Canines eat dogs."}))
    check("without the monitor the same grammar makes nonsense (the paper's Table 1 versus Table 5)",
          len(nonsense & bad) >= 2, f"({sorted(nonsense & bad)})")

    story = ("John/N:m,p killed/V Peter/N:m,p. Helen/N:f,p killed/V Mary/N:f,p. John/N:m,p loved/V Helen/N:f,p. "
             "Helen/N:f,p wanted/V John/N:m,p. Peter/N:m,p was/V a/ART bullfighter/N. Mary/N:f,p was/V a/ART countess/N.")

    def pron_share(p):
        c = n = 0
        for s in range(60):
            for para in Generator(story, weights={"pron": p, "pp": 0, "art": 1, "adj": 0}, seed=s).essay(["Mary", "Helen", "John", "Peter"]):
                for sent in para:
                    n += 1
                    c += sent.split()[0].lower() in ("he", "she", "it", "they")
        return c / n
    shares = [pron_share(p) for p in (0.1, 0.5, 0.9)]
    check("style control: subject-pronoun frequency rises with its weight (Output Texts 1-3)",
          shares[0] < shares[1] < shares[2], f"({shares[0]:.2f} < {shares[1]:.2f} < {shares[2]:.2f})")

    gen = Generator(story, seed=1)
    paras = gen.essay(["Mary", "Helen", "John", "Peter"])
    verbs_used = sum(len(p) for p in paras)
    check("essay: one paragraph per outline noun, each verb used at most once",
          len(paras) == 4 and verbs_used <= len(gen.V), f"({verbs_used} sentences from {len(gen.V)} verbs)")

    w = read_5w("The/ART man/N ate/V soup/N in/P the/ART summer/N:time.")
    w2 = read_5w("The/ART man/N works/V in/P a/ART store/N:place.")
    w3 = read_5w("John/N:p killed/V Peter/N:p because/CONJ John/N:p loved/V Helen/N:p.")
    check("5W reading: who/what/when/where/why map to Space/Evolution/Movement/Being/Design",
          w["who"] == ("man", "Space") and w["what"] == ("soup", "Evolution") and w["when"] == ("summer", "Being")
          and w2["where"] == ("store", "Movement") and w3["why"][1] == "Design" and w3["what"][0] == "Peter")
    print("ALL PASS" if ok else "SOME FAILED")
    return ok


if __name__ == "__main__":
    print("coherent paraphrase of Klein's dogs/canines text, then the same grammar with no monitor:")
    dg = "Dogs/N are/V canines/N. Canines/N eat/V meat/N."
    print("  monitored:", sorted({Generator(dg, seed=s, weights={'pp': 0, 'art': 0, 'adj': 0}).sentence()[0] for s in range(200)}))
    print("  no monitor:", sorted({Generator(dg, seed=s, monitor=False, weights={'pp': 0, 'art': 0, 'adj': 0}).sentence()[0] for s in range(200)})[:6], "...")
    print()
    raise SystemExit(0 if selftest() else 1)
