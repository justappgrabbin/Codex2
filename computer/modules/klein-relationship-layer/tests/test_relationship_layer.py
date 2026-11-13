"""Unittest: each paper tool answers, and tools pass results to each other.

python3 -m unittest computer.modules... is awkward because of the hyphenated
folder name, so run:

    python3 -m unittest discover -s computer/modules/klein-relationship-layer/tests -v
"""
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

from relationship_layer import (
    run_diseminer,
    run_autoling,
    run_compgram,
    run_resolver,
    resolver_to_diseminer,
    autoling_to_compgram,
    from_language_model_lane,
    probe_language_model,
)


class ToolAnswers(unittest.TestCase):
    def test_diseminer_answers_a_paper_question(self):
        out, _d = run_diseminer(
            ["The girl lives in a city", "The girl ate potatoes"],
            question="The girl lives in a city",
        )
        self.assertTrue(out["possible"])
        self.assertEqual(out["missing"], [])

    def test_autoling_answers_on_the_report_language(self):
        sentences = ["X Y", "X X Y Y", "X X X Y Y Y"]
        allowed = {tuple(s.split()) for s in sentences}
        out, learner = run_autoling(sentences, informant=lambda s: tuple(s) in allowed)
        self.assertTrue(out["rules"].strip())
        self.assertTrue(learner.parses(["X", "Y"]))

    def test_compgram_codes_a_plain_sentence(self):
        out, _rows = run_compgram("The girl sleeps.")
        words = [r["word"] for r in out["rows"]]
        self.assertIn("The", words)
        the = next(r for r in out["rows"] if r["word"] == "The")
        self.assertIn("ART", the["codes"])

    def test_resolver_answers_a_tagged_sentence(self):
        tagged = "The/ART girl/N lives/V in/P a/ART city/N."
        out, graph, _lex = run_resolver(tagged)
        self.assertTrue(out["links"])
        girl = next(t for t in graph.toks if t.lem == "girl")
        the = next(t for t in graph.toks if t.lem == "the")
        self.assertTrue(graph.depends(the, girl))


class ToolPipes(unittest.TestCase):
    def test_resolver_feeds_diseminer(self):
        tagged = "The/ART girl/N lives/V in/P a/ART city/N. The/ART girl/N ate/V potatoes/N."
        out, _d = resolver_to_diseminer(tagged, question="The girl lives in a city")
        self.assertEqual(out["from"], "Resolver")
        self.assertEqual(out["into"], "DISEMINER")
        self.assertTrue(out["links"])
        self.assertTrue(out["possible"], out)

    def test_autoling_feeds_compgram(self):
        sentences = ["the bird eats fish", "the bird eats rice", "the bird eats seed"]
        out = autoling_to_compgram(sentences)
        self.assertEqual(out["from"], "AUTOLING")
        self.assertEqual(out["into"], "CompGram")
        words = [r["word"] for r in out["compgram"]["rows"]]
        self.assertIn("bird", words)


class LanguageModelLane(unittest.TestCase):
    def test_end_to_end_from_language_model_lane(self):
        result = from_language_model_lane("The girl lives in a city")
        self.assertEqual(result["lane"], "language-model")
        self.assertFalse(result["used_address"])
        self.assertFalse(result["used_state_space"])
        self.assertTrue(result["ok"], result)
        self.assertTrue(result["diseminer"]["possible"], result)
        self.assertEqual(result["path"], "diseminer-own-lex")
        self.assertTrue(result["resolver"]["skipped"])

    def test_probe_reports_swisseph_without_installing_headers(self):
        root = "/workspace/model-plan/dl/x/Cynthia-Klein-Original-Trained/vendor/klein-agent"
        probe = probe_language_model("/workspace/models-runtime/klein-venv/bin/python", root)
        self.assertTrue(probe["needs_python_dev_headers"])
        self.assertIn("swisseph", probe["missing"])
        self.assertTrue(probe["weights_present"])


if __name__ == "__main__":
    unittest.main()
