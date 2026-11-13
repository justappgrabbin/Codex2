"""klein_diseminer.py : DISEMINER built to the paper, tested against the paper's own questions and riddles.

Source: Klein, Lieman and Lindstrom (1968), "DISEMINER: A Distributional-Semantics Inference Maker",
Computer Studies in the Humanities and Verbal Behavior 1:10-20. Read from your Drive PDF, including the page images
(the two parse diagrams for "The boy is a big eater" and the flow chart of Warshall's algorithm).

What the paper fixes, and what this file does about each point
  * A link x -> y means "x is dependent on y". Links INTO a noun are transitive (T); links into a verb, preposition or
    other form are intransitive (I).
  * M = every transitive path, plus every transitive path with ONE final intransitive link. Formula (1) in the paper
    has the last link "t or i" for any path of two or more nodes, so a single intransitive link counts; M therefore
    contains the direct intransitive links. (The TypeScript build leaves them out; see merged_as_shipped().)
  * "to be": the one-way parse (object depends on subject, via "is") is replaced by two links between the nouns:
    object -> subject is T and subject -> object is I. ("All boys are likely to be big eaters but not all big
    eaters are likely to be boys.") Page 13 diagrams.
  * Questions: parse the question, and every dependency pair it implies must be in M. Otherwise the answer is
    NOT POSSIBLE and the missing links are listed as "'x' not dependent on 'y'".
  * Riddles: "Who/What V1 and V2 ...": S_i = {t | link from stem_i to t in M}; forms of "be" and conjunctions
    stand for "every stem"; the answer is the intersection, or INTERSECTION EMPTY.

Run: python3 klein_diseminer.py       (self-test reproduces the paper's 27 questions and 9 riddles)
"""
from __future__ import annotations
from collections import defaultdict

BE = {"is", "are", "was", "were", "be", "am"}


class Diseminer:
    def __init__(self):
        self.T = set()          # (x, y): x depends on y, y a noun
        self.I = set()          # (x, y): x depends on y, y not a noun
        self.stems = set()
        self.pos = defaultdict(set)
        self._m = None

    # ---- input ------------------------------------------------------------------------------------
    def add_links(self, links):
        for x, y, kind in links:
            (self.T if kind == "T" else self.I).add((x, y))
            self.stems.update((x, y))
        self._m = None

    def read(self, sentence, lex):
        """sentence: plain words; lex(word) -> (stem, POS). Parses and stores the links."""
        links = parse(sentence, lex)
        for w in sentence.lower().replace(".", "").split():
            s, p = lex(w)
            self.pos[s].add(p)
        self.add_links(links)
        return links

    # ---- matrices -----------------------------------------------------------------------------------
    def closure(self):
        """T*: Warshall's algorithm as in the paper's flow chart (non-reflexive transitive closure of T)."""
        t = defaultdict(set)
        for x, y in self.T:
            t[x].add(y)
        nodes = list(self.stems)
        for j in nodes:                      # pivot stem j
            into = [i for i in nodes if j in t[i]]
            out = t[j]
            for i in into:
                t[i] |= out
        return t

    def M(self):
        if self._m is None:
            tstar = self.closure()
            m = defaultdict(set)
            for x in self.stems:
                m[x] |= tstar[x]                                   # all transitive paths
                for k in tstar[x]:                                 # ... plus one final intransitive link
                    for (a, b) in self.I:
                        if a == k:
                            m[x].add(b)
            for a, b in self.I:                                    # a single intransitive link (formula 1, n = 2)
                m[a].add(b)
            self._m = m
        return self._m

    def merged_as_shipped(self):
        """What the TypeScript build computes: T* + T*xI only, no direct intransitive links."""
        tstar = self.closure()
        m = defaultdict(set)
        for x in self.stems:
            m[x] |= tstar[x]
            for k in tstar[x]:
                for (a, b) in self.I:
                    if a == k:
                        m[x].add(b)
        return m

    # ---- questions and riddles ----------------------------------------------------------------------
    def question(self, sentence, lex):
        need = parse(sentence, lex, question=True)
        M = self.M()
        miss = [(x, y) for x, y, _ in need if y not in M[x]]
        seen, out = set(), []
        for p in miss:
            if p not in seen:
                seen.add(p); out.append(p)
        return (not out), out

    def riddle(self, words, lex):
        sets = []
        M = self.M()
        for w in words:
            s, p = lex(w)
            if w.lower() in BE or p in ("CONJ", "ART"):
                continue                                           # ignored: stands for every stem
            sets.append(set(M[s]))
        if not sets:
            return set()
        r = set.intersection(*sets)
        return {x for x in r if "N" in self.pos[x]}          # the answer is class membership among the nouns


# ---- the parser: the paper's small dependency grammar ---------------------------------------------------
def parse(sentence, lex, question=False):
    """Returns [(x, y, 'T'|'I')] for one sentence in the paper's grammar.
    Rules used: determiner/adjective -> noun (T); main verb -> subject head (T); object -> verb (I);
    preposition -> head of the phrase it modifies (and, in a predicate, also the verb and an intervening noun);
    object of a preposition -> preposition (I); N1 is N2 -> N2->N1 (T) and N1->N2 (I)."""
    toks = [lex(w) for w in sentence.lower().replace(".", "").replace("?", "").split()]
    ws = [w for w in sentence.lower().replace(".", "").replace("?", "").split()]
    links = []

    def link(x, y):
        if x != y or True:
            kind = "T" if "N" in POSSET.get(y, {"N"}) and y_is_noun(y) else "I"
        links.append((x, y, kind))

    nouns = set()

    def y_is_noun(y):
        return y in nouns

    # first pass: which stems are nouns in this sentence (so link kind can be decided by the target class)
    for (s, p) in toks:
        if p == "N":
            nouns.add(s)
    POSSET = {}

    def L(x, y):
        links.append((x, y, "T" if y in nouns else "I"))

    def np(i):
        """Noun phrase with its own post-modifying prepositional phrases; returns (head, next index)."""
        mods = []
        while i < len(toks) and toks[i][1] in ("ART", "ADJ"):
            mods.append(toks[i][0]); i += 1
        if i >= len(toks) or toks[i][1] != "N":
            return None, i
        head = toks[i][0]; i += 1
        for m in mods:
            L(m, head)
        while i < len(toks) and toks[i][1] == "P":               # phrase-internal PP: modifies this head
            p = toks[i][0]; i += 1
            h2, i = np(i)
            if h2 is None:
                break
            L(p, head); L(h2, p)
        return head, i

    i = 0
    subj, i = np(i)
    if subj is None:
        return links
    if i < len(toks) and (ws[i] in BE):                          # N1 is N2 / N1 is PP
        i += 1
        if i < len(toks) and toks[i][1] == "P":
            while i < len(toks) and toks[i][1] == "P":
                p = toks[i][0]; i += 1
                h2, i = np(i)
                if h2 is None:
                    break
                L(p, subj); L(h2, p)
        else:
            comp, i = np(i)
            if comp is not None:
                L(comp, subj)                                    # object -> subject, transitive
                if not question:                                 # a question lists only the pair it asks about
                    links.append((subj, comp, "I"))              # subject -> object, intransitive (stored from text)
        return links
    if i < len(toks) and toks[i][1] == "V":
        verb = toks[i][0]; i += 1
        L(verb, subj)
        last_noun = None
        obj, j = np(i)
        if obj is not None:
            L(obj, verb); last_noun = obj; i = j
        while i < len(toks) and toks[i][1] == "P":
            p = toks[i][0]; i += 1
            h2, i2 = np(i)
            L(p, verb)
            if last_noun is not None:
                L(p, last_noun)
            if h2 is not None:
                L(h2, p); last_noun = h2
            i = i2
    return links


# =========================== self-test: the paper's own text, questions and riddles ======================
STEM = {"potatoes": "potato", "songs": "song", "sites": "site", "horses": "horse", "men": "man", "walls": "wall", "chairs": "chair",
        "animals": "animal", "parks": "park", "lives": "live", "ate": "eat", "owned": "own", "saw": "see", "wrote": "write",
        "flew": "fly", "flies": "fly", "writes": "write", "eats": "eat", "rides": "ride", "thinks": "think", "sings": "sing",
        "smiles": "smile", "threw": "throw", "sat": "sit", "smiled": "smile", "flying": "fly", "cats": "eat", "sits": "sit",
        "smile": "smile", "fly": "fly", "sees": "see", "owns": "own", "see": "see", "own": "own", "eat": "eat", "think": "think", "ride": "ride", "sleeps": "sleep", "dogs": "dog", "walls": "wall", "thought": "think"}
POS = {}
for w in "the a an his".split(): POS[w] = "ART"
for w in "in on at to about near with of".split(): POS[w] = "P"
for w in ["and"]: POS[w] = "CONJ"
for w in "flying large big".split(): POS[w] = "ADJ"
for w in "is are lives sat ate owned saw wrote flew flies writes eats rides thinks sings smiles threw eat sleeps fly sit smile throw smiled sees owns".split(): POS[w] = "V"
# the paper forces 'mortal', 'good', 'bad' and 'completion' into the noun class to fit its grammar
for w in ("girl woman city chair house potatoes dog airplane air letter table man ground bird book dinner restaurant car horse hay stable "
          "park john la california paris boy songs animals animal ball wall sites mortal fork spoon completion horses men walls chairs good bad").split():
    POS[w] = "N"


def lex(w):
    w = w.lower()
    s = STEM.get(w, w)
    if s in ("john", "la", "california", "paris"):
        s = {"john": "John", "la": "LA", "california": "California", "paris": "Paris"}[s]
    return s, POS.get(w, "N")


TEXT1 = ["The girl is a woman", "The woman lives in a city", "The woman sat on a chair in the house", "The girl ate potatoes", "The girl owned a dog",
         "LA is a city in California", "The girl saw an airplane in the air", "The woman wrote a letter at a table", "The airplane flew to LA",
         "The girl flies to Paris", "The man on the ground saw the flying bird", "John is a man", "John writes a book", "John eats dinner at a restaurant",
         "The restaurant near the car is good", "The book near completion is bad", "The horse eats hay in a stable", "The man rides about the park on his horse",
         "The man thinks about the horse", "The girl thinks about the man"]
TEXT2 = ["The boy is near the girl", "The woman in the park sings songs", "The large man in the house smiles at the boy", "Men are animals",
         "The girl threw the ball at the wall", "John saw sites in LA", "Horses are animals", "Horses are mortal", "The man ate with a fork", "The woman eats with a spoon"]
Q1 = [("LA flew to the airplane", False, ["fly->LA", "airplane->to"]), ("The chair is in LA", False, ["LA->in"]),
      ("The restaurant is near the girl", False, ["girl->near"]), ("The girl lives in a city", True, []), ("The girl sits", True, []),
      ("The woman flies to LA", True, []), ("The restaurant near completion is good", True, []), ("The book near the car is bad", True, []),
      ("The man thinks about the man", True, []), ("The woman thinks about parks", True, [])]
Q2 = [("The restaurant is near the girl", True, []), ("The girl in the park sat on the horse", True, []), ("The animal smiled at the wall", True, []),
      ("The ball threw the girl", False, ["throw->ball", "girl->throw"]), ("Walls smile", False, ["smile->wall"]), ("Chairs fly", False, ["fly->chair"]),
      ("The chair is in LA", True, []), ("The man eats with a spoon", True, []), ("Men are horses", False, ["horse->man"]), ("Horses are men", False, ["man->horse"]),
      ("Animals are mortal", True, []), ("Men are mortal", False, ["mortal->man"]), ("The horse eats hay in a city", True, []), ("The book eats dinner", False, ["eat->book"]),
      ("Dinner ate John", False, ["eat->dinner", "John->eat"]), ("John eats California", False, ["California->eat"]), ("John eats dinner at a dog", False, ["dog->at"])]
RIDDLES = [("What flies", {"girl", "woman", "airplane", "bird"}), ("Who flies and writes", {"girl", "woman"}), ("Who eats potatoes and chairs", set()),
           ("Who eats and is man", {"man", "John", "animal"}), ("Who sees and flies", {"girl", "woman"}), ("Who lives and flies and eats", {"girl", "woman"}),
           ("Who thinks and sings and owns", {"girl", "woman"}), ("Who thinks rides eats and sees", {"man", "John", "animal"}), ("Who is an animal and thinks", {"man", "John", "animal"})]


def selftest():
    ok = True

    def check(label, cond, extra=""):
        nonlocal ok
        ok &= bool(cond)
        print(f"  [{'PASS' if cond else 'FAIL'}] {label} {extra}")

    d = Diseminer()
    # sentences 1 and 2 of the paper's input: "The is A." "A is the."  (be rule: object->subject T, subject->object I)
    d.add_links([("a", "the", "T"), ("the", "a", "I"), ("the", "a", "T"), ("a", "the", "I")])
    for s in TEXT1:
        d.read(s, lex)
    bad = []
    for q, expect, why in Q1:
        got, miss = d.question(q, lex)
        if got != expect:
            bad.append((q, expect, got, miss))
    check(f"questions on sentences 1-22: {len(Q1) - len(bad)}/{len(Q1)} match the paper", not bad, str(bad[:3]) if bad else "")
    # reasons given by the paper for the NOT POSSIBLE answers
    for q, expect, why in Q1:
        if not expect:
            _, miss = d.question(q, lex)
            check(f"reason for '{q}?' is '{', '.join(why)}'", sorted(f"{x}->{y}" for x, y in miss) == sorted(why), str([f"{x}->{y}" for x, y in miss]))
    for s in TEXT2:
        d.read(s, lex)
    bad = []
    for q, expect, why in Q2:
        got, miss = d.question(q, lex)
        if got != expect:
            bad.append((q, expect, got, [f"{x}->{y}" for x, y in miss]))
    check(f"questions on sentences 1-32: {len(Q2) - len(bad)}/{len(Q2)} match the paper", not bad, str(bad[:4]) if bad else "")
    for q, expect, why in Q2:
        if not expect:
            _, miss = d.question(q, lex)
            check(f"reason for '{q}?' is '{', '.join(why)}'", sorted(f"{x}->{y}" for x, y in miss) == sorted(why), str([f"{x}->{y}" for x, y in miss]))
    bad = []
    for q, want in RIDDLES:
        got = d.riddle(q.split()[1:], lex)
        got = {g for g in got if g in {s for s in d.stems if "N" in d.pos[s]} or True}
        if got != want:
            bad.append((q, sorted(want), sorted(got)))
    check(f"riddles: {len(RIDDLES) - len(bad)}/{len(RIDDLES)} match the paper", not bad, str(bad[:3]) if bad else "")
    shipped = d.merged_as_shipped()
    direct = sum(1 for a, b in d.I if b not in shipped[a])
    check("the as-shipped M (T* + T*I) is missing the direct intransitive links; this M has them", direct > 0, f"({direct} links missing there)")
    print("ALL PASS" if ok else "SOME FAILED")
    return ok


if __name__ == "__main__":
    raise SystemExit(0 if selftest() else 1)
