import os
import json
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import GroupShuffleSplit
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)

from feature_engine import get_feature_names


# ============================================================
# PATHS
# ============================================================

DATASET_PATH = "data/processed/training_dataset.parquet"

MODEL_DIR = "models"

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "baseline_random_forest.pkl"
)

IMPUTER_PATH = os.path.join(
    MODEL_DIR,
    "feature_imputer.pkl"
)

FEATURE_NAMES_PATH = os.path.join(
    MODEL_DIR,
    "feature_names.json"
)

METRICS_PATH = os.path.join(
    MODEL_DIR,
    "baseline_metrics.json"
)

THRESHOLD_RESULTS_PATH = os.path.join(
    MODEL_DIR,
    "threshold_analysis.csv"
)

TEST_PREDICTIONS_PATH = os.path.join(
    MODEL_DIR,
    "baseline_test_predictions.parquet"
)


# ============================================================
# CONFIGURATION
# ============================================================

RANDOM_SEED = 42

TEST_SIZE = 0.20

N_ESTIMATORS = 300

MAX_DEPTH = 18

MIN_SAMPLES_LEAF = 5

N_JOBS = -1


# ============================================================
# THRESHOLDS TO TEST
# ============================================================

THRESHOLDS = [
    0.20,
    0.25,
    0.30,
    0.35,
    0.40,
    0.45,
    0.50,
    0.55,
    0.60,
    0.65,
    0.70,
    0.75,
    0.80,
]


# ============================================================
# HELPER: SAFE METRIC CALCULATION
# ============================================================

def calculate_threshold_metrics(
    y_true,
    probabilities,
    threshold,
):
    """
    Calculate classification metrics for one probability threshold.
    """

    predictions = (
        probabilities >= threshold
    ).astype(int)

    accuracy = accuracy_score(
        y_true,
        predictions,
    )

    precision = precision_score(
        y_true,
        predictions,
        zero_division=0,
    )

    recall = recall_score(
        y_true,
        predictions,
        zero_division=0,
    )

    f1 = f1_score(
        y_true,
        predictions,
        zero_division=0,
    )

    cm = confusion_matrix(
        y_true,
        predictions,
        labels=[0, 1],
    )

    tn, fp, fn, tp = cm.ravel()

    specificity = (
        tn / (tn + fp)
        if (tn + fp) > 0
        else 0.0
    )

    negative_predictive_value = (
        tn / (tn + fn)
        if (tn + fn) > 0
        else 0.0
    )

    positive_predictions = int(
        predictions.sum()
    )

    return {
        "threshold": float(threshold),
        "accuracy": float(accuracy),
        "precision": float(precision),
        "recall": float(recall),
        "f1_score": float(f1),
        "specificity": float(specificity),
        "negative_predictive_value": float(
            negative_predictive_value
        ),
        "true_negatives": int(tn),
        "false_positives": int(fp),
        "false_negatives": int(fn),
        "true_positives": int(tp),
        "positive_predictions": positive_predictions,
        "positive_prediction_rate": float(
            positive_predictions / len(predictions)
        ),
    }


# ============================================================
# HELPER: THRESHOLD ANALYSIS
# ============================================================

def analyze_thresholds(
    y_true,
    probabilities,
):
    """
    Evaluate the model across multiple thresholds.
    """

    results = []

    for threshold in THRESHOLDS:

        metrics = calculate_threshold_metrics(
            y_true=y_true,
            probabilities=probabilities,
            threshold=threshold,
        )

        results.append(metrics)

    results_df = pd.DataFrame(results)

    return results_df


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 75)
    print("MODULE 1 - BASELINE MODEL TRAINING")
    print("=" * 75)

    # --------------------------------------------------------
    # CHECK DATASET
    # --------------------------------------------------------

    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(
            f"Training dataset not found:\n{DATASET_PATH}"
        )

    # --------------------------------------------------------
    # CREATE MODEL DIRECTORY
    # --------------------------------------------------------

    os.makedirs(
        MODEL_DIR,
        exist_ok=True,
    )

    # --------------------------------------------------------
    # LOAD DATA
    # --------------------------------------------------------

    print()
    print("LOADING TRAINING DATASET")
    print("-" * 75)

    df = pd.read_parquet(
        DATASET_PATH
    )

    required_columns = [
        "PATIENT",
        "SNAPSHOT_DATE",
        "LABEL",
    ]

    missing_required = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing_required:
        raise RuntimeError(
            "Missing required columns:\n"
            + "\n".join(missing_required)
        )

    print(f"Rows: {len(df):,}")
    print(f"Columns: {len(df.columns)}")
    print(
        f"Patients: "
        f"{df['PATIENT'].nunique():,}"
    )

    print()
    print("Label distribution:")
    print(
        df["LABEL"]
        .value_counts()
        .sort_index()
    )

    print()
    print(
        f"Overall positive rate: "
        f"{df['LABEL'].mean() * 100:.2f}%"
    )

    # --------------------------------------------------------
    # GET FEATURES
    # --------------------------------------------------------

    print()
    print("=" * 75)
    print("VALIDATING FEATURES")
    print("=" * 75)

    feature_names = get_feature_names()

    missing_features = [
        feature
        for feature in feature_names
        if feature not in df.columns
    ]

    if missing_features:

        raise RuntimeError(
            "Missing feature columns:\n"
            + "\n".join(missing_features)
        )

    expected_feature_count = 348

    if len(feature_names) != expected_feature_count:

        raise RuntimeError(
            f"Expected "
            f"{expected_feature_count} features, "
            f"found {len(feature_names)}"
        )

    print(
        f"Features loaded: "
        f"{len(feature_names)}"
    )

    X = df[feature_names].copy()

    y = (
        df["LABEL"]
        .astype(int)
        .copy()
    )

    groups = (
        df["PATIENT"]
        .copy()
    )

    # Keep metadata for later analysis.
    snapshot_dates = pd.to_datetime(
        df["SNAPSHOT_DATE"],
        utc=True,
        errors="coerce",
    )

    # --------------------------------------------------------
    # CLEAN INVALID FEATURE VALUES
    # --------------------------------------------------------

    X = X.replace(
        [np.inf, -np.inf],
        np.nan,
    )

    total_missing_before = int(
        X.isna().sum().sum()
    )

    print()
    print(
        f"Total missing feature values "
        f"before imputation: "
        f"{total_missing_before:,}"
    )

    # --------------------------------------------------------
    # PATIENT-LEVEL TRAIN / TEST SPLIT
    # --------------------------------------------------------

    print()
    print("=" * 75)
    print("CREATING PATIENT-LEVEL TRAIN/TEST SPLIT")
    print("=" * 75)

    splitter = GroupShuffleSplit(
        n_splits=1,
        test_size=TEST_SIZE,
        random_state=RANDOM_SEED,
    )

    train_idx, test_idx = next(
        splitter.split(
            X,
            y,
            groups,
        )
    )

    X_train = (
        X.iloc[train_idx]
        .copy()
    )

    X_test = (
        X.iloc[test_idx]
        .copy()
    )

    y_train = (
        y.iloc[train_idx]
        .copy()
    )

    y_test = (
        y.iloc[test_idx]
        .copy()
    )

    train_groups = (
        groups.iloc[train_idx]
        .copy()
    )

    test_groups = (
        groups.iloc[test_idx]
        .copy()
    )

    train_patients = set(
        train_groups
    )

    test_patients = set(
        test_groups
    )

    overlap = (
        train_patients.intersection(
            test_patients
        )
    )

    if overlap:

        raise RuntimeError(
            "PATIENT LEAKAGE DETECTED: "
            "the same patient appears in "
            "both training and test data."
        )

    print(
        f"Training rows: "
        f"{len(X_train):,}"
    )

    print(
        f"Test rows:     "
        f"{len(X_test):,}"
    )

    print(
        f"Training patients: "
        f"{len(train_patients):,}"
    )

    print(
        f"Test patients:     "
        f"{len(test_patients):,}"
    )

    print(
        "Patient leakage check: PASSED"
    )

    print()

    print(
        f"Train positive rate: "
        f"{y_train.mean() * 100:.2f}%"
    )

    print(
        f"Test positive rate:  "
        f"{y_test.mean() * 100:.2f}%"
    )

    # --------------------------------------------------------
    # IMPUTE MISSING VALUES
    # --------------------------------------------------------

    print()
    print("=" * 75)
    print("HANDLING MISSING VALUES")
    print("=" * 75)

    # IMPORTANT:
    # Fit only on training data.
    # Test data must never influence preprocessing.

    imputer = SimpleImputer(
        strategy="median"
    )

    X_train_imputed = imputer.fit_transform(
        X_train
    )

    X_test_imputed = imputer.transform(
        X_test
    )

    remaining_train_missing = int(
        np.isnan(X_train_imputed).sum()
    )

    remaining_test_missing = int(
        np.isnan(X_test_imputed).sum()
    )

    print(
        "Missing-value imputation complete."
    )

    print(
        f"Remaining train missing values: "
        f"{remaining_train_missing:,}"
    )

    print(
        f"Remaining test missing values:  "
        f"{remaining_test_missing:,}"
    )

    # --------------------------------------------------------
    # TRAIN RANDOM FOREST
    # --------------------------------------------------------

    print()
    print("=" * 75)
    print("TRAINING RANDOM FOREST BASELINE")
    print("=" * 75)

    print(
        f"Estimators: {N_ESTIMATORS}"
    )

    print(
        f"Max depth: {MAX_DEPTH}"
    )

    print(
        f"Min samples leaf: "
        f"{MIN_SAMPLES_LEAF}"
    )

    print(
        "Class weight: balanced"
    )

    model = RandomForestClassifier(
        n_estimators=N_ESTIMATORS,
        max_depth=MAX_DEPTH,
        min_samples_leaf=MIN_SAMPLES_LEAF,
        class_weight="balanced",
        random_state=RANDOM_SEED,
        n_jobs=N_JOBS,
    )

    model.fit(
        X_train_imputed,
        y_train,
    )

    print()
    print(
        "Model training complete."
    )

    # --------------------------------------------------------
    # GET PROBABILITIES
    # --------------------------------------------------------

    print()
    print("=" * 75)
    print("GENERATING TEST PREDICTIONS")
    print("=" * 75)

    probabilities = model.predict_proba(
        X_test_imputed
    )[:, 1]

    print(
        f"Predictions generated: "
        f"{len(probabilities):,}"
    )

    print(
        f"Minimum probability: "
        f"{probabilities.min():.6f}"
    )

    print(
        f"Maximum probability: "
        f"{probabilities.max():.6f}"
    )

    print(
        f"Mean probability:    "
        f"{probabilities.mean():.6f}"
    )

    # --------------------------------------------------------
    # THRESHOLD-INDEPENDENT METRICS
    # --------------------------------------------------------

    print()
    print("=" * 75)
    print("THRESHOLD-INDEPENDENT MODEL PERFORMANCE")
    print("=" * 75)

    roc_auc = roc_auc_score(
        y_test,
        probabilities,
    )

    pr_auc = average_precision_score(
        y_test,
        probabilities,
    )

    print(
        f"ROC-AUC: {roc_auc:.4f}"
    )

    print(
        f"PR-AUC:  {pr_auc:.4f}"
    )

    # --------------------------------------------------------
    # DEFAULT THRESHOLD = 0.50
    # --------------------------------------------------------

    print()
    print("=" * 75)
    print("DEFAULT THRESHOLD PERFORMANCE (0.50)")
    print("=" * 75)

    default_metrics = (
        calculate_threshold_metrics(
            y_true=y_test,
            probabilities=probabilities,
            threshold=0.50,
        )
    )

    print(
        f"Accuracy:  "
        f"{default_metrics['accuracy']:.4f}"
    )

    print(
        f"Precision: "
        f"{default_metrics['precision']:.4f}"
    )

    print(
        f"Recall:    "
        f"{default_metrics['recall']:.4f}"
    )

    print(
        f"F1 Score:  "
        f"{default_metrics['f1_score']:.4f}"
    )

    print(
        f"Specificity: "
        f"{default_metrics['specificity']:.4f}"
    )

    print()

    print(
        "Confusion Matrix:"
    )

    print(
        [
            [
                default_metrics["true_negatives"],
                default_metrics["false_positives"],
            ],
            [
                default_metrics["false_negatives"],
                default_metrics["true_positives"],
            ],
        ]
    )

    default_predictions = (
        probabilities >= 0.50
    ).astype(int)

    print()
    print(
        "Classification Report:"
    )

    print(
        classification_report(
            y_test,
            default_predictions,
            digits=4,
            zero_division=0,
        )
    )

    # --------------------------------------------------------
    # MULTIPLE THRESHOLD ANALYSIS
    # --------------------------------------------------------

    print()
    print("=" * 75)
    print("THRESHOLD ANALYSIS")
    print("=" * 75)

    threshold_results = analyze_thresholds(
        y_true=y_test,
        probabilities=probabilities,
    )

    display_columns = [
        "threshold",
        "precision",
        "recall",
        "f1_score",
        "specificity",
        "positive_predictions",
    ]

    print()

    print(
        threshold_results[
            display_columns
        ].to_string(
            index=False,
            float_format=lambda x: (
                f"{x:.4f}"
            ),
        )
    )

    # --------------------------------------------------------
    # FIND BEST F1 THRESHOLD
    # --------------------------------------------------------

    best_f1_row = threshold_results.loc[
        threshold_results[
            "f1_score"
        ].idxmax()
    ]

    best_f1_threshold = float(
        best_f1_row["threshold"]
    )

    print()
    print("=" * 75)
    print("RECOMMENDED THRESHOLD")
    print("=" * 75)

    print(
        "Selection method: "
        "Highest F1 score among tested thresholds"
    )

    print()

    print(
        f"Recommended threshold: "
        f"{best_f1_threshold:.2f}"
    )

    print(
        f"Precision: "
        f"{best_f1_row['precision']:.4f}"
    )

    print(
        f"Recall: "
        f"{best_f1_row['recall']:.4f}"
    )

    print(
        f"F1 Score: "
        f"{best_f1_row['f1_score']:.4f}"
    )

    print(
        f"Specificity: "
        f"{best_f1_row['specificity']:.4f}"
    )

    # --------------------------------------------------------
    # FEATURE IMPORTANCE
    # --------------------------------------------------------

    print()
    print("=" * 75)
    print("TOP 20 IMPORTANT FEATURES")
    print("=" * 75)

    importance_df = pd.DataFrame(
        {
            "feature": feature_names,
            "importance": (
                model.feature_importances_
            ),
        }
    ).sort_values(
        "importance",
        ascending=False,
    )

    for _, row in (
        importance_df
        .head(20)
        .iterrows()
    ):

        print(
            f"{row['feature']}: "
            f"{row['importance']:.6f}"
        )

    # --------------------------------------------------------
    # BUILD TEST PREDICTIONS FILE
    # --------------------------------------------------------

    print()
    print("=" * 75)
    print("SAVING TEST PREDICTIONS")
    print("=" * 75)

    test_results = pd.DataFrame(
        {
            "PATIENT": (
                groups.iloc[test_idx]
                .values
            ),
            "SNAPSHOT_DATE": (
                snapshot_dates.iloc[test_idx]
                .values
            ),
            "LABEL": (
                y_test.values
            ),
            "RAW_PROBABILITY": (
                probabilities
            ),
            "PREDICTION_050": (
                default_predictions
            ),
            "PREDICTION_RECOMMENDED": (
                (
                    probabilities
                    >= best_f1_threshold
                ).astype(int)
            ),
        }
    )

    test_results.to_parquet(
        TEST_PREDICTIONS_PATH,
        index=False,
    )

    print(
        f"Saved: "
        f"{TEST_PREDICTIONS_PATH}"
    )

    # --------------------------------------------------------
    # SAVE THRESHOLD RESULTS
    # --------------------------------------------------------

    threshold_results.to_csv(
        THRESHOLD_RESULTS_PATH,
        index=False,
    )

    print(
        f"Saved: "
        f"{THRESHOLD_RESULTS_PATH}"
    )

    # --------------------------------------------------------
    # SAVE FEATURE IMPORTANCE
    # --------------------------------------------------------

    feature_importance_path = os.path.join(
        MODEL_DIR,
        "baseline_feature_importance.csv"
    )

    importance_df.to_csv(
        feature_importance_path,
        index=False,
    )

    print(
        f"Saved: "
        f"{feature_importance_path}"
    )

    # --------------------------------------------------------
    # SAVE MODEL
    # --------------------------------------------------------

    print()
    print("=" * 75)
    print("SAVING MODEL ARTIFACTS")
    print("=" * 75)

    joblib.dump(
        model,
        MODEL_PATH,
    )

    joblib.dump(
        imputer,
        IMPUTER_PATH,
    )

    with open(
        FEATURE_NAMES_PATH,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            feature_names,
            file,
            indent=2,
        )

    # --------------------------------------------------------
    # SAVE COMPLETE METRICS
    # --------------------------------------------------------

    metrics = {
        "model": "RandomForestClassifier",

        "roc_auc": float(
            roc_auc
        ),

        "pr_auc": float(
            pr_auc
        ),

        "training_rows": int(
            len(y_train)
        ),

        "test_rows": int(
            len(y_test)
        ),

        "training_patients": int(
            len(train_patients)
        ),

        "test_patients": int(
            len(test_patients)
        ),

        "training_positive_rate": float(
            y_train.mean()
        ),

        "test_positive_rate": float(
            y_test.mean()
        ),

        "default_threshold": 0.50,

        "default_threshold_metrics": (
            default_metrics
        ),

        "recommended_threshold": (
            best_f1_threshold
        ),

        "recommended_threshold_metrics": {
            key: (
                value.item()
                if isinstance(
                    value,
                    np.generic
                )
                else value
            )
            for key, value in (
                best_f1_row.to_dict()
            ).items()
        },

        "threshold_analysis": (
            threshold_results.to_dict(
                orient="records"
            )
        ),
    }

    with open(
        METRICS_PATH,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            metrics,
            file,
            indent=2,
        )

    print(
        f"Model saved: "
        f"{MODEL_PATH}"
    )

    print(
        f"Imputer saved: "
        f"{IMPUTER_PATH}"
    )

    print(
        f"Features saved: "
        f"{FEATURE_NAMES_PATH}"
    )

    print(
        f"Metrics saved: "
        f"{METRICS_PATH}"
    )

    # --------------------------------------------------------
    # FINAL SUMMARY
    # --------------------------------------------------------

    print()
    print("=" * 75)
    print("BASELINE TRAINING COMPLETE")
    print("=" * 75)

    print(
        f"ROC-AUC: {roc_auc:.4f}"
    )

    print(
        f"PR-AUC:  {pr_auc:.4f}"
    )

    print()

    print(
        "Default threshold (0.50):"
    )

    print(
        f"  Precision: "
        f"{default_metrics['precision']:.4f}"
    )

    print(
        f"  Recall:    "
        f"{default_metrics['recall']:.4f}"
    )

    print(
        f"  F1 Score:  "
        f"{default_metrics['f1_score']:.4f}"
    )

    print()

    print(
        f"Recommended threshold: "
        f"{best_f1_threshold:.2f}"
    )

    print(
        f"  Precision: "
        f"{best_f1_row['precision']:.4f}"
    )

    print(
        f"  Recall:    "
        f"{best_f1_row['recall']:.4f}"
    )

    print(
        f"  F1 Score:  "
        f"{best_f1_row['f1_score']:.4f}"
    )

    print()
    print(
        "IMPORTANT:"
    )
    print(
        "Recommended threshold is based on "
        "the sampled training/test prevalence."
    )
    print(
        "Probability calibration and sparse-history "
        "evaluation will be performed before deployment."
    )


if __name__ == "__main__":
    main()