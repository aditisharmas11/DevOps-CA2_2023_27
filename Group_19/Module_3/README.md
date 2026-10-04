# MediTwin — Module 3: Personalized Treatment Decision Support

Module 3 combines **Module 1** (longitudinal clinical history → 90-day
acute-event risk, via XGBoost) and **Module 2** (symptom text → 49-way
differential diagnosis, via a transformer) into one personalized,
explainable, rule-based clinical decision-support report. It does not
train any new model — everything here is adapters + a documented,
transparent rule engine + two optional external drug-information APIs.

## Architecture

```
Module 1 JSON  ──▶ parse_module1_output() ──┐
                                              ├──▶ build_patient_context()
Module 2 JSON  ──▶ parse_module2_output() ──┘              │
                                                             ▼
                                          extract_clinical_signals()
                                          assess_data_sufficiency()
                                                             │
                                                             ▼
                                      build_recommendations()  (per disease)
                                          ├─ run_safety_checks()
                                          ├─ transparent additive scoring
                                          └─ why_prioritized / why_lower_confidence
                                                             │
                                          assess_urgency()  ──┘
                                                             │
                                                             ▼
                                   drug_api_client (RxNorm + openFDA, cached)
                                                             │
                                                             ▼
                                report_generator ──▶ report.json / report.txt / charts
```

Both adapters (`parse_module1_output`, `parse_module2_output`) read
fields defensively — they were built directly against the **real**
output of this project's Module 1 (`module_1/outputs/*/prediction_report.json`)
and Module 2 (`Module_2/inference/inference_pipeline.py`'s
`predict_from_evidence()` / `conversation_engine.py`'s `process()`
prediction payload), not an assumed format. If either module's output
JSON changes shape later, update the adapter functions — nothing else
in the pipeline needs to change.

## Why this design

- **No new ML dataset/model.** Module 3 is 100% rule-based reasoning
  over Module 1/2 outputs plus a local knowledge base plus two free
  public APIs.
- **Transparent scoring, not a black box.** Every recommendation's
  score is an explicit weighted sum (`config.SCORE_WEIGHTS`), and the
  report shows the breakdown term-by-term.
- **Confidence-gated treatment guidance.** LOW-confidence Module 2
  predictions never get specific treatment text — only "seek
  clinical confirmation."
- **Safety checks are honestly scoped.** The report always states
  what *was* checked (from available Module 1 labs) vs. what
  *could not* be checked (allergies, current medications, pregnancy —
  none of which are structured inputs to this system).
- **API failures never crash the app** — `drug_api_client.py` returns
  a clear `unavailable`/`not_found` status and the report says so
  explicitly rather than silently omitting the section.

## Files

| File | Purpose |
|---|---|
| `app.py` | CLI entry point — orchestrates the whole pipeline |
| `module3_engine.py` | Adapters, patient-context builder, clinical signal extraction, data sufficiency, safety engine, urgency engine, recommendation scoring |
| `report_generator.py` | Builds the JSON report, the human-readable text report, and the matplotlib charts |
| `drug_api_client.py` | RxNorm + openFDA client with disk caching and graceful fallback |
| `config.py` | Paths, API settings, scoring weights, confidence bands, urgency rules |
| `clinical_thresholds.json` | General adult reference ranges for all 29 Module 1 observations (documented, not hidden in code) |
| `treatment_knowledge.json` | Treatment profiles for all 49 Module 2 disease classes (category, first-line approach, medication classes, examples, monitoring, red flags, relevant Module 1 observations) |
| `sample_inputs/module1_output.json` | Real Module 1 sample output (copied from `module_1/outputs/SAMPLE_PATIENT_001/prediction_report.json`) |
| `sample_inputs/module2_output.json` | Realistic Module 2 output matching the real `predict_from_evidence()` schema |
| `outputs/<patient_id>/` | Generated `report.json`, `report.txt`, and PNG charts per run |
| `cache/drug_information_cache.json` | Disk cache for external drug lookups |

## Usage

```bash
pip install -r requirements.txt

# Demo mode — runs on the bundled real sample outputs
python app.py

# Real run — both modules
python app.py path/to/module1_output.json path/to/module2_output.json

# Only Module 1 available (still reports future risk; no disease-specific treatment)
python app.py --module1-only path/to/module1_output.json

# Only Module 2 available (disease predictions + generic treatment; no personalization from history)
python app.py --module2-only path/to/module2_output.json
```

## APIs used (both free, no key required for this project's call volume)

| API | Purpose | Auth | Rate limit | Fallback |
|---|---|---|---|---|
| [RxNorm](https://lhncbc.nlm.nih.gov/RxNav/APIs/RxNormAPIs.html) | Normalize a medicine-class example to a standardized RxCUI | None | No published hard limit for light use | Marked `unavailable`; local KB used |
| [openFDA Drug Label](https://open.fda.gov/apis/drug/label/) | Real label sections (indications/warnings/contraindications) | None (optional key raises limit) | 240/min, 1000/day without a key | Marked `unavailable`; local KB used |

Both are called through `drug_api_client.get_drug_information()`, which
always returns a structured result — `found`, `not_found`, or
`unavailable` — and never raises. Results are cached to
`cache/drug_information_cache.json` so repeated runs don't repeat
network calls for the same drug name. Set `config.OFFLINE_MODE = True`
to skip network calls entirely (useful for an offline demo).

## Honest limitations

- **This is decision support, not a diagnosis or prescription.** Every
  report ends with an explicit disclaimer, and LOW-confidence disease
  predictions never receive specific treatment guidance.
- **Safety checks are limited to what Module 1 actually tracks**
  (renal/hepatic/BP markers). Allergies, current medications, and
  pregnancy status are not inputs to this system and are always
  disclosed as "not checked."
- **`treatment_knowledge.json` covers general medication classes and
  well-established first-line approaches**, not exact drugs/doses for
  a named patient — by design, per the project requirements.
- **Trend charts plot first → mean → latest**, not a full per-date
  time series, because that's what Module 1's `observation_progression`
  output actually provides.
- **External API results depend on network access.** In a sandboxed
  or offline environment, drug lookups will show `unavailable` and the
  report will say so — this is the intended fallback behavior, not a
  bug.
