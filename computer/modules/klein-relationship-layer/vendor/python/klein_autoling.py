"""klein_autoling.py : AUTOLING's phrase-structure learner, rebuilt from the 1968 report (UWCS TR #43, section 3).

Read from your Drive PDF. What the report fixes, and what is used here:
  * multi-path parser; with no complete parse, the TOP NODES of the best incomplete parse are the input to heuristic 1
  * heuristic 1  coin the closure of the parse as a sentence rule (the whole string when no rule applies)
  * heuristic 2  two single units in identical environments (X _ Y) go into one class      X m1 Y, X m2 Y  ->  X C Y, C := m1 | m2
  * heuristic 3  a morpheme and a class in identical environments: the morpheme joins the class
  * negative rule: no new rules when the differing strings are not single units
  * every class is tested by substitution: the system generates a sentence it has not been given and asks the
    informant "CAN YOU SAY:"; NO means the substitution is not made and the sentence joins the list of illegals
  * illegals: a new rule that would parse an illegal is dropped; every 5 inputs all illegals are re-parsed and a
    parse means a bad rule got in, so the grammar is rebuilt from the stored inputs (recycling, nesting depth 3)
Heuristic 4 (recursion) is not coded separately: the report says heuristic 2 on non-terminal units already learns it
(its own artificial-language example learns X^n Y^n that way). Heuristic 5 (class splitting) and the transformation
learner (section 4) are not in this file.

One thing the report does not state and that I inferred from its three transcripts: a sentence symbol may stand as a
constituent in a partial parse only when it is flanked on both sides (X S1 Y in the artificial language), not at the
edge of the sentence (English II codes "EAT THE CAT S" from terminals, not as S1 + S).

Run: python3 klein_autoling.py      (replays the report's three transcripts with the informant's answers, plus the
six-sentence probe from the independent audit of the Kimi v1.4.0 build)
"""
from __future__ import annotations
import itertools
import re


class Rule:
    def __init__(self, lhs, rhs, star=False):
        self.lhs, self.rhs, self.star = lhs, tuple(rhs), star

    def key(self):
        return (self.rhs, self.star)

    def __repr__(self):
        return f"{'*' if self.star else ''}{self.lhs} := {' '.join(self.rhs)}"


def is_nt(sym):
    return bool(re.fullmatch(r"S\d+", sym))


class Autoling:
    def __init__(self, informant, max_recycle=3):
        self.informant = informant
        self.rules: list[Rule] = []
        self.inputs: list[list[str]] = []
        self.illegals: list[list[str]] = []
        self.perm_illegals: list[list[str]] = []
        self.asked: set = set()
        self.n = 0
        self.max_recycle = max_recycle
        self.log: list[str] = []
        self.linkers: set = set()     # words that join clauses (and, because, ...); empty keeps the report's single-clause behaviour
        self.counters = dict(rules_coined=0, merges=0, tests=0, recycles=0, parsed_ok=0)

    # ------------------------------------------------------------------ grammar helpers
    def fresh(self):
        used = {r.lhs for r in self.rules}
        i = 1
        while f"S{i}" in used:
            i += 1
        return f"S{i}"

    def members(self, sym):
        return [r for r in self.rules if r.lhs == sym]

    def is_class(self, sym):
        rs = self.members(sym)
        return bool(rs) and all(len(r.rhs) == 1 and not r.star for r in rs)

    # ------------------------------------------------------------------ parsing (all parses, chart)
    def chart(self, words, rules=None):
        rules = self.rules if rules is None else rules
        n = len(words)
        spans = {(i, j): set() for i in range(n) for j in range(i + 1, n + 1)}
        changed = True

        def match(rhs, k, pos, end):
            if k == len(rhs):
                return pos == end
            sym = rhs[k]
            if is_nt(sym):
                for j in range(pos + 1, end + 1):
                    if sym in spans[(pos, j)] and match(rhs, k + 1, j, end):
                        return True
                return False
            return pos < end and words[pos] == sym and match(rhs, k + 1, pos + 1, end)

        while changed:
            changed = False
            for r in rules:
                for i in range(n):
                    for j in range(i + 1, n + 1):
                        if r.lhs not in spans[(i, j)] and match(r.rhs, 0, i, j):
                            spans[(i, j)].add(r.lhs)
                            changed = True
        return spans

    def parses(self, words, rules=None):
        spans = self.chart(words, rules)
        rs = self.rules if rules is None else rules
        stars = {r.lhs for r in rs if r.star}
        return bool(stars & spans[(0, len(words))]) if words else False

    def top_nodes(self, words):
        spans = self.chart(words)
        n = len(words)
        stars = {r.lhs for r in self.rules if r.star}
        INF = 10 ** 9
        best = [INF] * (n + 1); best[n] = 0; pick = [None] * (n + 1)
        for i in range(n - 1, -1, -1):
            options = [(1, 1, words[i])]
            for j in range(i + 1, n + 1):
                edge_open = (i == 0 and j < n and words[j] in self.linkers) or (j == n and i > 0 and words[i - 1] in self.linkers)
                blocked = {s for s in stars} if ((i == 0 or j == n) and not edge_open) else set()
                nts = sorted(spans[(i, j)] - blocked, key=lambda s: int(s[1:]))
                if nts and not (i == 0 and j == n):
                    options.append((1, j - i, nts[0]))
            for cost, length, sym in options:
                c = 1 + best[i + length]
                if c < best[i] or (c == best[i] and pick[i] and length > pick[i][0]):
                    best[i], pick[i] = c, (length, sym)
        out, i = [], 0
        while i < n:
            length, sym = pick[i]
            out.append(sym); i += length
        return out

    # ------------------------------------------------------------------ generation for the informant tests
    def gen(self, sym, stack=(), limit=60):
        """All sentences a symbol derives; a symbol may recur on the path at most three times (recursion is bounded)."""
        if not is_nt(sym):
            yield (sym,); return
        if stack.count(sym) >= 3:
            return
        for r in self.members(sym):
            parts = [list(self.gen(s, stack + (sym,))) for s in r.rhs]
            if any(not p for p in parts):
                continue
            for combo in itertools.islice(itertools.product(*parts), limit):
                yield tuple(w for part in combo for w in part)

    def language(self, rule_lhs_list=None, cap=200):
        out = []
        for r in self.rules:
            if r.star and (rule_lhs_list is None or r.lhs in rule_lhs_list):
                for s in itertools.islice(self.gen(r.lhs), cap):
                    out.append(s)
        return out

    # ------------------------------------------------------------------ the informant
    def ask(self, sentence):
        sentence = tuple(sentence)
        self.counters["tests"] += 1
        ok = self.informant(list(sentence))
        self.log.append(f"CAN YOU SAY: {' '.join(sentence)}  -> {'YES' if ok else 'NO'}")
        if not ok and list(sentence) not in self.illegals:
            self.illegals.append(list(sentence))
        return ok

    def seen(self, s):
        return list(s) in self.inputs

    def pick_test(self, rule_set_after, lhs):
        """Choose one unseen sentence from the changed rule: the longest / most novel one."""
        tmp = Autoling(self.informant); tmp.rules = rule_set_after
        cands = [s for s in tmp.gen(lhs) if not self.seen(s)]
        cands = [s for s in cands if tuple(s) not in self.asked]
        if not cands:
            return None
        cands.sort(key=lambda s: (-len(s), s))
        return list(cands[0])

    def violates_illegals(self, rule_set):
        tmp = Autoling(self.informant); tmp.rules = rule_set
        return any(tmp.parses(s, rule_set) for s in self.illegals + self.perm_illegals)

    # ------------------------------------------------------------------ the learner
    def feed(self, sentence, _depth=0):
        words = sentence.split() if isinstance(sentence, str) else list(sentence)
        if _depth == 0:
            self.inputs.append(words)
        if self.parses(words):
            self.counters["parsed_ok"] += 1
            self.log.append("PARSED OK")
            self.maybe_recycle(_depth)
            return "PARSED OK"
        top = self.top_nodes(words)
        new = Rule(self.fresh(), top, star=True)                                  # heuristic 1
        if any(r.rhs == new.rhs and r.star for r in self.rules):
            return "known"
        self.rules.append(new)
        self.counters["rules_coined"] += 1
        self.generalise()                                                      # heuristics 2 and 3 with testing
        self.maybe_recycle(_depth)
        return "learned"

    def generalise(self, new=None):
        """Heuristics 2 and 3 between sentence rules, and substitution of known classes into other rules, until nothing changes."""
        for _ in range(50):
            if self.try_substitutions() or self.try_pair_merges():
                continue
            break
        self.cleanup()

    def try_pair_merges(self):
        stars = [r for r in self.rules if r.star]
        for i in range(len(stars)):
            for j in range(i + 1, len(stars)):
                other, new = stars[i], stars[j]
                if len(other.rhs) != len(new.rhs):
                    continue
                diff = [k for k in range(len(new.rhs)) if new.rhs[k] != other.rhs[k]]
                if len(diff) != 1:
                    continue                                                      # negative rule: single units only
                if self.merge(other, new, diff[0]):
                    return True
        return False

    def merge(self, other, new, p):
        a, b = other.rhs[p], new.rhs[p]
        trial = [Rule(r.lhs, r.rhs, r.star) for r in self.rules if r is not new and r is not other]
        if self.is_class(a) and not is_nt(b):
            cls = a; add = [Rule(a, (b,))]                                        # heuristic 3
        elif self.is_class(b) and not is_nt(a):
            cls = b; add = [Rule(b, (a,))]
        else:
            in_use = {r.lhs for r in trial} | {s for r in trial for s in r.rhs if is_nt(s)} | {other.lhs}
            cls = new.lhs if new.lhs not in in_use else None                      # the freed symbol names the class
            if cls is None:
                k = 1
                while f"S{k}" in in_use:
                    k += 1
                cls = f"S{k}"
            add = [Rule(cls, (a,)), Rule(cls, (b,))]                              # heuristic 2
        merged = Rule(other.lhs, other.rhs[:p] + (cls,) + other.rhs[p + 1:], True)
        cand = trial + add + [merged]
        if new.lhs != merged.lhs and cls != new.lhs:
            for r in cand:
                r.rhs = tuple(merged.lhs if s_ == new.lhs else s_ for s_ in r.rhs)
        test = self.pick_test(cand, merged.lhs)
        ok = True
        if test is not None:
            self.asked.add(tuple(test))
            ok = self.ask(test)
        if ok and not self.violates_illegals(cand):
            self.rules = cand
            self.counters["merges"] += 1
            return True
        return False

    def try_substitutions(self):
        """The report: when a class is coined, every rule is inspected for tokens of its members; the class name is
        tentatively substituted and a test sentence put to the informant."""
        for cls, mem in list(self.classes().items()):
            for r in list(self.rules):
                if not r.star:
                    continue
                for p, sym in enumerate(r.rhs):
                    if sym in mem and sym != cls and not (is_nt(sym) and sym == r.lhs):
                        cand_rhs = r.rhs[:p] + (cls,) + r.rhs[p + 1:]
                        if any(x.star and x.rhs == cand_rhs for x in self.rules):
                            continue
                        trial = [Rule(x.lhs, x.rhs, x.star) for x in self.rules if x is not r] + [Rule(r.lhs, cand_rhs, True)]
                        test = self.pick_test(trial, r.lhs)
                        ok = True
                        if test is not None:
                            self.asked.add(tuple(test))
                            ok = self.ask(test)
                        if ok and not self.violates_illegals(trial):
                            self.rules = trial
                            return True
        return False

    def cleanup(self):
        seen, out = {}, []
        redirect = {}
        for r in self.rules:
            if r.star and r.key() in seen and seen[r.key()] != r.lhs:
                redirect[r.lhs] = seen[r.key()]
                continue
            k = (r.lhs, r.rhs, r.star)
            if k in {(x.lhs, x.rhs, x.star) for x in out}:
                continue
            if r.star:
                seen[r.key()] = r.lhs
            out.append(r)
        for r in out:
            r.rhs = tuple(redirect.get(x, x) for x in r.rhs)
        self.rules = out

    # ------------------------------------------------------------------ illegals and recycling
    def maybe_recycle(self, depth):
        if len(self.inputs) % 5 != 0 or not self.illegals:
            return
        if any(self.parses(s) for s in self.illegals):
            if depth >= self.max_recycle:
                self.log.append("GIVE UP: recycle limit")
                return
            self.counters["recycles"] += 1
            self.log.append("PARSING ILLEGALS: a bad rule got in; recycling")
            stored = list(self.inputs)
            bad = [s for s in self.illegals if self.parses(s)]
            self.perm_illegals += bad
            self.rules = []; self.asked = set()
            head = stored[-5:]; rest = stored[:-5]
            for s in head + rest:
                self.feed(s, _depth=depth + 1)

    def show(self):
        return "\n".join(map(repr, self.rules))

    def classes(self):
        out = {}
        for r in self.rules:
            if len(r.rhs) == 1 and not r.star:
                out.setdefault(r.lhs, set()).add(r.rhs[0])
        return out


# ================================== replay of the report's transcripts ==============================
def language_oracle(sentences):
    allowed = {tuple(s) for s in sentences}
    return lambda s: tuple(s) in allowed


def selftest():
    ok = True

    def check(label, cond, extra=""):
        nonlocal ok
        ok &= bool(cond)
        print(f"  [{'PASS' if cond else 'FAIL'}] {label} {extra}")

    # 3.2.1 artificial language: X^n Y^n
    A = Autoling(lambda s: len(s) % 2 == 0 and s == ["X"] * (len(s) // 2) + ["Y"] * (len(s) // 2) and len(s) >= 2)
    for s in ("X Y", "X X Y Y", "X X X Y Y Y"):
        A.feed(s)
    results = [A.feed("X " * n + "Y " * n) for n in (4, 12)]
    check("3.2.1 artificial language: after X Y / XXYY / XXXYYY the grammar parses X^4 Y^4 and X^12 Y^12 (PARSED OK)", results == ["PARSED OK", "PARSED OK"], str(results))
    cl = A.classes()
    check("3.2.1 the learned grammar has a class holding the two sentence symbols (the report's S3 := S2 | S1)", any(len(v) == 2 and all(is_nt(x) for x in v) for v in cl.values()), A.show().replace("\n", " | "))
    check("3.2.1 and it still rejects what the informant would reject (X X X Y Y)", not A.parses("X X X Y Y".split()))

    # 3.2.2 English I: the report's final grammar defines the informant
    S2 = ["NEED", "WANT"]; S3 = ["HER", "HIM"]; S4 = ["YOU", "I"]; S5 = ["RUN", "GO"]; S7 = ["SHE", "HE"]
    lang1 = [[a, b, c, "TO", d] for a in S4 for b in S2 for c in S3 for d in S5] + [[a, b, "S", c, "TO", d] for a in S7 for b in S2 for c in S3 for d in S5]
    E = Autoling(language_oracle(lang1))
    for s in ["I WANT HIM TO GO", "I NEED HIM TO GO", "I WANT HER TO GO", "YOU WANT HER TO GO", "YOU WANT HIM TO RUN", "HE WANT S HER TO GO", "SHE WANT S HIM TO RUN"]:
        E.feed(s)
    cl = E.classes()
    want = [{"NEED", "WANT"}, {"HER", "HIM"}, {"YOU", "I"}, {"RUN", "GO"}, {"SHE", "HE"}]
    found = [any(v == w for v in cl.values()) for w in want]
    check("3.2.2 English I: the learner finds the report's five classes (NEED/WANT, HER/HIM, YOU/I, RUN/GO, SHE/HE)", all(found), str(found))
    check("3.2.2 and parses a sentence it was never given (SHE WANT S HER TO RUN)", E.parses("SHE WANT S HER TO RUN".split()))

    # 3.2.3 English II
    D = ["A", "THE", "SOME"]; D2 = ["THOSE", "SOME", "THESE", "THE"]; N = ["DOG", "CAT"]; V = ["EAT", "KNOW"]; P = ["I", "YOU"]
    lang2 = [[v, d, n] for v in V for d in D for n in N] + [[v, d, n, "S"] for v in V for d in D2 for n in N] \
        + [[p, v, d, n] for p in P for v in V for d in D for n in N] + [[p, v, d, n, "S"] for p in P for v in V for d in D2 for n in N]
    F = Autoling(language_oracle(lang2))
    for s in ["EAT THE CAT", "EAT A CAT", "EAT THE CAT S", "EAT A DOG", "KNOW THE DOG", "EAT THESE CAT S", "EAT SOME CAT S", "EAT SOME CAT", "EAT THOSE CAT S", "I EAT A CAT", "YOU EAT A CAT"]:
        F.feed(s)
    check("3.2.3 English II: the informant's NO to 'EAT A CAT S' is respected (the learner never accepts it)", not F.parses("EAT A CAT S".split()), F.show().replace("\n", " | ")[:300])
    check("3.2.3 and EAT THE DOG (never input) is accepted", F.parses("EAT THE DOG".split()))
    cl = F.classes()
    check("3.2.3 it forms the noun class DOG/CAT", any(v == {"DOG", "CAT"} for v in cl.values()), str(list(cl.values())))

    # the independent audit's probe on the Kimi v1.4.0 AutolingEngine
    probe = ["the dog eats fish", "the cat eats fish", "the dog eats rice", "the cat eats rice", "the bird eats rice", "the bird eats seed"]
    subj = ["dog", "cat", "bird"]; obj = ["fish", "rice", "seed"]
    G = Autoling(language_oracle([["the", a, "eats", b] for a in subj for b in obj]))
    counts = []
    for s in probe:
        before = len(G.rules)
        G.feed(s)
        counts.append(len(G.rules))
    check("audit probe: the Kimi build created 1 rule from six related sentences; this learner builds classes", len(G.rules) > 1 and any(v == {"dog", "cat", "bird"} for v in G.classes().values()), f"(rules after each input: {counts})")
    check("audit probe: it generalises to an unseen sentence (the bird eats fish)", G.parses("the bird eats fish".split()))
    print("ALL PASS" if ok else "SOME FAILED")
    return ok, A, E, F, G


if __name__ == "__main__":
    ok, A, E, F, G = selftest()
    for name, g in (("artificial", A), ("English I", E), ("English II", F), ("audit probe", G)):
        print(f"\n--- grammar learned for {name}")
        print(g.show())
    raise SystemExit(0 if ok else 1)
