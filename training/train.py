"""Train the airline-satisfaction model and save it for the API.

Reproduces the final model from `main copy.ipynb`: the same leak-free
preprocessing pipeline + XGBoost with the tuned hyperparameters.

Usage:
    python training/train.py --data airline_dataset.csv --out models/model.joblib
    python training/train.py --sample 3000            # quick run for tests
    python training/train.py --min-roc-auc 0.98       # fail (exit 1) below this score
"""
import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
import xgboost as xgb
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer, OneHotEncoder, StandardScaler

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.features import (CATEGORICAL_COLS, DROPPED_COLS, FEATURE_COLS, ID_COLS, LOG_COLS,  # noqa: E402
                          PLAIN_COLS, RATING_COLS, TARGET_COL, XGB_BEST_PARAMS)

RANDOM_STATE = 42


def to_binary(target):
    # 'satisfied' -> 1, 'neutral or dissatisfied' -> 0 (also accepts 0/1 labels)
    if target.dtype == object:
        return (target.str.strip().str.lower() == 'satisfied').astype(int)
    return target.astype(int)


def build_preprocessor():
    log_pipeline = Pipeline([
        ('impute', SimpleImputer(strategy='median', add_indicator=True)),
        ('log', FunctionTransformer(np.log1p, feature_names_out='one-to-one')),
        ('scale', StandardScaler()),
    ])
    plain_pipeline = Pipeline([
        ('impute', SimpleImputer(strategy='median', add_indicator=True)),
        ('scale', StandardScaler()),
    ])
    rating_pipeline = Pipeline([
        ('impute', SimpleImputer(strategy='most_frequent', add_indicator=True)),
        ('scale', StandardScaler()),
    ])
    return ColumnTransformer([
        ('log', log_pipeline, LOG_COLS),
        ('plain', plain_pipeline, PLAIN_COLS),
        ('ratings', rating_pipeline, RATING_COLS),
        ('cat', OneHotEncoder(drop='if_binary', handle_unknown='ignore', sparse_output=False), CATEGORICAL_COLS),
    ], verbose_feature_names_out=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--data', default='airline_dataset.csv')
    parser.add_argument('--out', default='models/model.joblib')
    parser.add_argument('--sample', type=int, default=None, help='train on a stratified sample of N rows')
    parser.add_argument('--min-roc-auc', type=float, default=None, help='quality gate on the hold-out ROC-AUC')
    args = parser.parse_args()

    started = time.time()
    df = pd.read_csv(args.data)
    df = df.drop(columns=[c for c in ID_COLS + DROPPED_COLS if c in df.columns])
    y = to_binary(df.pop(TARGET_COL))
    X = df[FEATURE_COLS]

    if args.sample and args.sample < len(X):
        X, _, y, _ = train_test_split(X, y, train_size=args.sample, stratify=y, random_state=RANDOM_STATE)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE)

    pos_weight = (y_train == 0).sum() / (y_train == 1).sum()
    model = Pipeline([
        ('prep', build_preprocessor()),
        ('model', xgb.XGBClassifier(**XGB_BEST_PARAMS, scale_pos_weight=pos_weight, eval_metric='logloss',
                                    random_state=RANDOM_STATE, n_jobs=-1)),
    ])
    model.fit(X_train, y_train)

    proba = model.predict_proba(X_test)[:, 1]
    preds = (proba >= 0.5).astype(int)
    metrics = {
        'accuracy': round(accuracy_score(y_test, preds), 4),
        'f1': round(f1_score(y_test, preds), 4),
        'roc_auc': round(roc_auc_score(y_test, proba), 4),
        'train_rows': int(len(X_train)),
        'test_rows': int(len(X_test)),
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, out_path)
    metadata = {
        'model': 'XGBoost (tuned, from main copy.ipynb)',
        'trained_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'features': FEATURE_COLS,
        'params': XGB_BEST_PARAMS,
        'metrics': metrics,
        'versions': {'sklearn': sklearn.__version__, 'xgboost': xgb.__version__},
        'train_seconds': round(time.time() - started, 1),
    }
    out_path.with_suffix('.json').write_text(json.dumps(metadata, indent=2))
    print(json.dumps(metadata['metrics'], indent=2))
    print(f'Model saved to {out_path} ({metadata["train_seconds"]}s)')

    if args.min_roc_auc is not None and metrics['roc_auc'] < args.min_roc_auc:
        print(f'QUALITY GATE FAILED: ROC-AUC {metrics["roc_auc"]} < {args.min_roc_auc}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
