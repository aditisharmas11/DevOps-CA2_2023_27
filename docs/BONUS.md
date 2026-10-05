# Step 6 (Bonus) – External challenge: Kaggle Playground Series S6E10

`main copy.ipynb` is already written to run inside the Kaggle competition
[Playground Series – Season 6, Episode 10](https://www.kaggle.com/competitions/playground-series-s6e10)
(binary classification of airline passenger satisfaction, scored on **ROC-AUC**).

When the notebook finds `train.csv`, `test.csv` and `sample_submission.csv` under `/kaggle/input` it switches to
*competition mode*: it trains on the competition data, refits the best model on all labelled rows and writes
`submission.csv` with predicted probabilities. Locally it falls back to `airline_dataset.csv` and writes nothing.

## How to submit

1. Open the competition page → **Join Competition** (accept the rules).
2. **Code → New Notebook → File → Import Notebook** → upload `main copy.ipynb`.
3. In the right-hand panel: **Add Input** → the competition dataset is attached automatically
   (check that `/kaggle/input/playground-series-s6e10/` exists).
4. **Save Version → Save & Run All (Commit)**. The first cell should print `Competition mode | train: ...`.
5. When the run finishes, open the version → **Output** → `submission.csv` → **Submit**.

## Proof to attach

Save these to `docs/screenshots/` and link them in the report:

- [ ] `kaggle-submission.png` – the **My Submissions** tab showing the public score
- [ ] `kaggle-leaderboard.png` – your row on the leaderboard
- [ ] Link to the public Kaggle notebook version

The CI badge at the top of the README (`ci-cd.yml` passing) can be shown as the "GitHub badge" proof once
the repo has run on GitHub.
