# AI-Powered Network Intrusion Detection System for Defense Cybersecurity

**ML Bubble 2026 — Machine Learning Awareness & Skill Building Challenge**
**Track:** TE/BE — Design & Solve (Advanced)
**Domain:** Defense & National Security — India

---

## 📌 Problem Statement

Military, government, and critical-infrastructure networks in India face constant and evolving
cyberattacks — denial-of-service floods, network probing/reconnaissance, unauthorized remote access,
and privilege-escalation exploits. Traditional signature-based intrusion detection systems (IDS) rely
on known attack fingerprints and struggle to catch novel or modified attack variants, leaving a
detection gap that adversaries can exploit.

**Why Machine Learning:** Network traffic has measurable statistical patterns (connection duration,
byte counts, error rates, service types, etc.) that differ between normal and malicious activity. A
supervised ML model can learn these patterns from historical traffic and generalize to flag suspicious
connections in real time — including variants of attacks it has never explicitly seen — which static
signature rules cannot do.

---

## 🎯 Objective

Build, train, and evaluate a machine learning system that:
1. Classifies network connections as **normal** or **attack** (binary classification)
2. Identifies the **specific attack category** — DoS, Probe, R2L, or U2R (multi-class classification)
3. Is evaluated with realistic, rigorous metrics (not inflated by data leakage)
4. Includes explainability and deployment considerations suitable for a real defense environment

---

## 📊 Dataset

**NSL-KDD** — an improved, de-duplicated version of the classic KDD Cup 1999 intrusion detection
benchmark. It is a standard academic dataset for cybersecurity ML research.

| | Train Set | Test Set |
|---|---|---|
| Records | 125,973 | 22,544 |
| Features | 41 | 41 |
| Source | [NSL-KDD official (UNB CIC)](https://www.unb.ca/cic/datasets/nsl.html) | via public GitHub mirror |

**Key design choice:** the notebook uses the **official train/test split**, not a random split of a
single file. The official test set intentionally includes attack sub-types that never appear in
training — this simulates a real-world scenario where a deployed model must detect novel attack
variants, and it produces a more honest (and lower) accuracy than a naive random split would.

**Features** include connection duration, protocol type, service, flag, source/destination byte
counts, login attempt counts, error rates, and 30+ statistical traffic features aggregated over recent
connections.

**Attack categories** (mapped from 20+ raw attack labels):
| Category | Description | Example attacks |
|---|---|---|
| DoS | Denial of Service | neptune, smurf, back, teardrop |
| Probe | Surveillance/scanning | ipsweep, nmap, portsweep, satan |
| R2L | Remote-to-Local unauthorized access | guess_passwd, ftp_write, warezclient |
| U2R | User-to-Root privilege escalation | buffer_overflow, rootkit, loadmodule |

---

## 🧠 Approach / Methodology

1. **Exploratory Data Analysis (EDA)** — class distribution, attack category breakdown, correlation
   heatmap of high-variance features
2. **Preprocessing**
   - Label-encoded categorical features (`protocol_type`, `service`, `flag`), fit jointly on
     train+test to avoid unseen-category errors
   - Standardized numeric features (`StandardScaler`)
   - Saved all preprocessing objects alongside the model to prevent train/serve skew at deployment
3. **Model training** — three algorithms trained and compared:
   - Logistic Regression (linear baseline)
   - Random Forest (bagged ensemble of decision trees)
   - XGBoost (gradient-boosted decision trees)
4. **Evaluation** — Accuracy, Precision, Recall, F1-score, ROC-AUC, confusion matrices, ROC curves
5. **Explainability** — feature importance ranking (XGBoost) to identify which traffic features drive
   predictions
6. **Multi-class extension** — retrained best model to classify attack *category*, not just
   binary normal/attack
7. **Deployment packaging** — model + scaler + encoders persisted with `joblib`

---

## 📈 Results

| Model | Accuracy | Precision | Recall | F1-Score | ROC-AUC |
|---|---|---|---|---|---|
| Logistic Regression | 0.754 | 0.649 | 0.934 | 0.766 | ~0.83 |
| Random Forest | 0.773 | 0.661 | 0.971 | 0.787 | ~0.86 |
| **XGBoost** | **0.807** | **0.699** | **0.970** | **0.812** | **~0.88** |

**XGBoost was selected as the best-performing model** based on F1-score and ROC-AUC.

> Note: these numbers are intentionally lower than the 95%+ figures common in tutorials that use a
> random train/test split of a single file. The gap reflects the model encountering genuinely unseen
> attack variants in the test set — a much more realistic proxy for real-world deployment than an
> inflated same-distribution split.

---

## 🗂️ Repository Structure

```
├── ML_Bubble_2026_Defense_IDS.ipynb   # Main notebook — full pipeline, EDA to deployment
├── README.md                          # This file
├── ids_xgboost_model.joblib           # Trained XGBoost model (generated on run)
├── ids_scaler.joblib                  # Fitted StandardScaler (generated on run)
├── ids_categorical_encoders.joblib    # Fitted LabelEncoders for categorical features
└── ids_target_encoder.joblib          # Fitted LabelEncoder for the target label
```

---

## ⚙️ How to Run

### 1. Requirements
```bash
pip install pandas numpy matplotlib seaborn scikit-learn xgboost joblib
```

### 2. Run the notebook
Open `ML_Bubble_2026_Defense_IDS.ipynb` in Jupyter or Google Colab and run all cells top to bottom.
The notebook automatically downloads the NSL-KDD train and test CSVs from a public GitHub mirror —
no manual dataset download needed.

### 3. Use the saved model for inference
```python
import joblib
import pandas as pd

model = joblib.load("ids_xgboost_model.joblib")
scaler = joblib.load("ids_scaler.joblib")
encoders = joblib.load("ids_categorical_encoders.joblib")
target_encoder = joblib.load("ids_target_encoder.joblib")

# preprocess new_data the same way as training (encode categoricals, then scale)
# prediction = model.predict(scaler.transform(new_data))
```

---

## 🔍 Key Design Decisions & Why They Matter

- **Official train/test split over random split** — avoids the common mistake of reporting inflated
  accuracy from data leakage; better reflects generalization to unseen attacks.
- **Three algorithm families compared, not just one** — demonstrates the trade-off between
  interpretability (Logistic Regression) and predictive power (XGBoost).
- **Precision/Recall over accuracy alone** — in a defense SOC, false positives cause alert fatigue and
  false negatives mean missed attacks; both are more informative than raw accuracy on this kind of
  problem.
- **Feature importance included** — a black-box "attack/no attack" flag is not actionable for a security
  analyst without knowing *why* it fired.
- **Multi-class extension** — binary detection alone doesn't tell an analyst how to respond; knowing
  the attack category (DoS vs. R2L, for example) changes the response playbook.

---

## 🚀 Deployment Considerations

- **Where it fits:** inline or tap-based classifier on network sensors/SIEM pipelines, scoring flow
  records near-real-time and raising SOC alerts.
- **Latency:** XGBoost inference on tabular features is sub-millisecond per record on CPU; scales well
  with batching for high-throughput traffic.
- **Model drift:** attacker techniques evolve continuously — production deployment needs scheduled
  retraining (e.g., monthly) and drift monitoring on false-positive/false-negative rates over time.
- **Alert fatigue:** in defense settings, high false-positive rates overwhelm analysts. Deployment
  threshold tuning should favor precision on the `attack` class, with a human-in-the-loop triage step
  for medium-confidence predictions.
- **Explainability & auditability:** each alert should be paired with feature-importance / SHAP-style
  explanations so analysts can validate flags quickly — important for accountability in national-security
  contexts.
- **Data sensitivity:** a real deployment would use classified/sensitive internal network telemetry,
  not a public dataset. NSL-KDD is used here as an ethically shareable, academically valid proxy to
  demonstrate the pipeline; production data would need to remain on secured, accredited infrastructure.
- **Adversarial robustness:** ML classifiers can be evaded by adversarially crafted traffic. In
  production this system should complement — not replace — signature-based rules as a second line of
  defense.

---

## 🛠️ Tech Stack

- **Language:** Python 3
- **Data handling:** pandas, NumPy
- **Visualization:** matplotlib, seaborn
- **Machine Learning:** scikit-learn (Logistic Regression, Random Forest, preprocessing, metrics),
  XGBoost
- **Model persistence:** joblib

---

## 📚 Dataset Citation

M. Tavallaee, E. Bagheri, W. Lu, and A. Ghorbani, "A Detailed Analysis of the KDD CUP 99 Data Set,"
Submitted to Second IEEE Symposium on Computational Intelligence for Security and Defense Applications
(CISDA), 2009. Dataset: [NSL-KDD, UNB CIC](https://www.unb.ca/cic/datasets/nsl.html)

---

## ⚠️ Limitations & Future Work

- NSL-KDD reflects late-1990s network traffic patterns and feature engineering; a production system
  would need retraining on modern traffic (e.g., CIC-IDS2017/2018 or live telemetry).
- Current features are hand-engineered/aggregated; deep learning approaches (LSTM/Transformer on raw
  packet sequences) could capture temporal attack patterns not visible in flow-level aggregates.
- No adversarial-robustness testing was performed in this version — a natural next step given the
  defense context.
- Threshold tuning for the precision/recall trade-off was not optimized against a specific
  operational cost function (e.g., cost of a missed attack vs. cost of an analyst false alarm).

---

## 👤 Author  

Submitted for **ML Bubble 2026** — Defense & National Security (India) track.
