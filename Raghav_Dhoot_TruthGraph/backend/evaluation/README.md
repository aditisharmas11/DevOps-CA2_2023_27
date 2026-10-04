# TruthGraph evaluation

This folder contains a small fixed benchmark for measuring end-to-end verdict accuracy.

The current benchmark contains stable true/false factual claims. It intentionally avoids current events so a later run can be compared with an earlier run.

## Run

From the `backend` directory with the virtual environment active, Neo4j running, and the normal TruthGraph API keys configured:

```bash
python evaluation/evaluate.py
```

For a quick smoke test:

```bash
python evaluation/evaluate.py --limit 4
```

The script writes detailed results to `evaluation/results.json`.

The headline metric is **end-to-end benchmark accuracy**:

```
correct benchmark verdicts / all benchmark cases
```

Operational errors are therefore counted as unsuccessful cases rather than silently excluded. The script also reports accuracy among completed cases separately.

This benchmark currently measures binary true/false verdict accuracy. It should not be described as a complete measure of TruthGraph's misleading or unverifiable classifications.
