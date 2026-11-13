# Klein relationship layer

A relationship layer on top of Cynthia-Klein-Original-Trained, so her Klein
tools can call each other. The language model is not given addresses or the
state space. Addressing and birth time stay on hold.

The tools themselves are copies of her files in `vendor/`. Glue is in
`relationship_layer.py` and `relationship-layer.mjs`.

Run the tests (nothing is installed, and Python development headers are not
required for these tests):

```
python3 -m unittest discover -s computer/modules/klein-relationship-layer/tests -v
node --test computer/tests/klein-relationship-layer.test.mjs
```

See PROVENANCE.md for the Drive files and the Resolver decision.
