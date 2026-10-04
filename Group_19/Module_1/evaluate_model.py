"""
MODULE 1 - COMPLETE XGBOOST MODEL EVALUATION

Evaluates the already-trained XGBoost model.

IMPORTANT:
- Does NOT rebuild the dataset.
- Does NOT regenerate 348 features.
- Does NOT retrain the model.
- Uses the XGBoost booster feature names as the final source of truth.
- Recreates the EXACT patient-level split used by train_xgboost.py.
- Tests multiple aspects in one run.

Tests performed:
1. Required-file validation
2. Dataset validation
3. Exact model feature compatibility
4. Exact training/test patient split recreation
5. Patient leakage check
6. ROC-AUC
7. PR-AUC
8. Accuracy
9. Precision
10. Recall
11. F1 score
12. Specificity
13. Threshold analysis
14. Sparse-history evaluation
15. Missing-data robustness
16. Calibration analysis
17. Probability distribution
18. Patient-level evaluation
19. Feature importance
20. Random subgroup analysis
21. Save all evaluation results
"""

import os
import json
import warnings
import re

import numpy as np
import pandas as pd

from xgboost import XGBClassifier

from sklearn.model_selection import train_test_split

from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    brier_score_loss,
)


warnings.filterwarnings("ignore")


# ============================================================
# CONFIGURATION
# ============================================================

RANDOM_STATE = 42
TEST_SIZE = 0.20

DATASET_PATH = "data/processed/training_dataset.parquet"

MODEL_PATH = "models/xgboost_model.json"
FEATURE_NAMES_PATH = "models/xgboost_feature_names.json"
FEATURE_MAPPING_PATH = "models/xgboost_feature_mapping.json"
METRICS_PATH = "models/xgboost_metrics.json"

OUTPUT_DIR = "evaluation_results"

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

METADATA_COLUMNS = {
    "PATIENT",
    "SNAPSHOT_DATE",
    "LABEL",
}

os.makedirs(
    OUTPUT_DIR,
    exist_ok=True,
)


# ============================================================
# PRINT HELPERS
# ============================================================

def section(title):

    print()
    print("=" * 75)
    print(title)
    print("=" * 75)


def subsection(title):

    print()
    print("-" * 75)
    print(title)
    print("-" * 75)


# ============================================================
# FEATURE NAME SANITIZATION
#
# MUST MATCH train_xgboost.py
# ============================================================

def sanitize_feature_name(name):

    name = str(name)

    safe_name = re.sub(
        r"[^A-Za-z0-9_]+",
        "_",
        name,
    )

    safe_name = re.sub(
        r"_+",
        "_",
        safe_name,
    )

    safe_name = safe_name.strip("_")

    if not safe_name:
        safe_name = "feature"

    return safe_name


def build_feature_mapping(feature_columns):

    mapping = {}

    used_names = set()

    for original_name in feature_columns:

        base_name = sanitize_feature_name(
            original_name
        )

        safe_name = base_name

        counter = 1

        while safe_name in used_names:

            safe_name = (
                f"{base_name}_{counter}"
            )

            counter += 1

        mapping[original_name] = safe_name

        used_names.add(
            safe_name
        )

    return mapping


# ============================================================
# REQUIRED FILE VALIDATION
# ============================================================

def validate_required_files():

    section(
        "VALIDATING REQUIRED FILES"
    )

    required_files = [
        DATASET_PATH,
        MODEL_PATH,
    ]

    missing = []

    for file_path in required_files:

        if os.path.exists(file_path):

            print(
                f"FOUND: {file_path}"
            )

        else:

            print(
                f"MISSING: {file_path}"
            )

            missing.append(
                file_path
            )

    if missing:

        raise FileNotFoundError(
            "\nRequired files are missing:\n"
            + "\n".join(missing)
        )

    print(
        "\nAll required files found."
    )


# ============================================================
# LOAD DATASET
# ============================================================

def load_dataset():

    section(
        "LOADING EXISTING TRAINING DATASET"
    )

    df = pd.read_parquet(
        DATASET_PATH
    )

    print(
        f"Rows: {len(df):,}"
    )

    print(
        f"Columns: {len(df.columns):,}"
    )

    required_columns = [
        "PATIENT",
        "SNAPSHOT_DATE",
        "LABEL",
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:

        raise ValueError(
            "Dataset is missing required columns:\n"
            + "\n".join(missing_columns)
        )

    if len(df) == 0:

        raise ValueError(
            "Training dataset is empty."
        )

    df["PATIENT"] = (
        df["PATIENT"]
        .astype(str)
    )

    df["SNAPSHOT_DATE"] = pd.to_datetime(
        df["SNAPSHOT_DATE"],
        utc=True,
        errors="coerce",
    )

    df["LABEL"] = (
        pd.to_numeric(
            df["LABEL"],
            errors="coerce",
        )
        .fillna(0)
        .astype(int)
    )

    invalid_labels = set(
        df["LABEL"].unique()
    ) - {0, 1}

    if invalid_labels:

        raise ValueError(
            f"Unexpected labels found: "
            f"{sorted(invalid_labels)}"
        )

    print(
        f"Patients: {df['PATIENT'].nunique():,}"
    )

    print()
    print(
        "Confirmed metadata columns:"
    )

    print(
        "Patient column: PATIENT"
    )

    print(
        "Snapshot column: SNAPSHOT_DATE"
    )

    print(
        "Label column: LABEL"
    )

    print()
    print(
        "Label distribution:"
    )

    print(
        df["LABEL"]
        .value_counts()
        .sort_index()
    )

    print(
        f"\nOverall positive rate: "
        f"{df['LABEL'].mean() * 100:.2f}%"
    )

    return df


# ============================================================
# LOAD MODEL
# ============================================================

def load_model():

    section(
        "LOADING TRAINED XGBOOST MODEL"
    )

    model = XGBClassifier()

    model.load_model(
        MODEL_PATH
    )

    booster = model.get_booster()

    model_features = booster.feature_names

    if model_features is None:

        raise ValueError(
            "The loaded XGBoost model does not contain "
            "feature names."
        )

    print(
        "Model loaded successfully."
    )

    print(
        f"Features stored in model: "
        f"{len(model_features):,}"
    )

    print(
        "\nFirst 10 EXACT model feature names:"
    )

    for feature in model_features[:10]:

        print(
            feature
        )

    return model


# ============================================================
# PREPARE FEATURES
#
# IMPORTANT:
# The MODEL itself is the source of truth.
#
# We recreate the exact deterministic sanitization used during
# training and then force the final order to match the booster.
# ============================================================

def prepare_features(
    df,
    model,
):

    section(
        "PREPARING EXACT MODEL FEATURES"
    )

    booster_features = (
        model.get_booster().feature_names
    )

    original_feature_columns = [
        column
        for column in df.columns
        if column not in METADATA_COLUMNS
    ]

    print(
        f"Original dataset features: "
        f"{len(original_feature_columns):,}"
    )

    print(
        f"Model expected features:    "
        f"{len(booster_features):,}"
    )

    if len(original_feature_columns) != 348:

        print(
            "\nWARNING:"
        )

        print(
            f"Dataset contains "
            f"{len(original_feature_columns)} features."
        )

    else:

        print(
            "Dataset feature count check: "
            "PASSED (348)"
        )

    if len(booster_features) != 348:

        print(
            "\nWARNING:"
        )

        print(
            f"Model contains "
            f"{len(booster_features)} features."
        )

    else:

        print(
            "Model feature count check: "
            "PASSED (348)"
        )

    # Recreate EXACT mapping from training
    recreated_mapping = (
        build_feature_mapping(
            original_feature_columns
        )
    )

    X = df[
        original_feature_columns
    ].copy()

    # Force all values numeric
    for column in X.columns:

        X[column] = pd.to_numeric(
            X[column],
            errors="coerce",
        )

    # XGBoost handles NaN.
    X = X.replace(
        [np.inf, -np.inf],
        np.nan,
    )

    # Apply EXACT sanitized names
    X.rename(
        columns=recreated_mapping,
        inplace=True,
    )

    if X.columns.duplicated().any():

        duplicates = (
            X.columns[
                X.columns.duplicated()
            ]
            .tolist()
        )

        raise ValueError(
            "Duplicate feature names after sanitization:\n"
            + "\n".join(
                duplicates[:20]
            )
        )

    recreated_features = (
        list(X.columns)
    )

    missing_in_dataset = [
        feature
        for feature in booster_features
        if feature not in recreated_features
    ]

    extra_in_dataset = [
        feature
        for feature in recreated_features
        if feature not in booster_features
    ]

    print()
    print(
        f"Features after sanitization: "
        f"{len(recreated_features):,}"
    )

    print(
        f"Missing model features: "
        f"{len(missing_in_dataset):,}"
    )

    print(
        f"Extra dataset features: "
        f"{len(extra_in_dataset):,}"
    )

    if missing_in_dataset:

        print(
            "\nFirst missing features:"
        )

        for feature in missing_in_dataset[:20]:

            print(
                feature
            )

        raise ValueError(
            "The dataset cannot be aligned "
            "with the trained model."
        )

    if extra_in_dataset:

        print(
            "\nFirst extra features:"
        )

        for feature in extra_in_dataset[:20]:

            print(
                feature
            )

        raise ValueError(
            "Feature mismatch: dataset contains "
            "unexpected features."
        )

    # Force EXACT booster order
    X = X[
        booster_features
    ].copy()

    # Final exact check
    if list(X.columns) != list(booster_features):

        raise RuntimeError(
            "Final feature order does not match "
            "the trained XGBoost model."
        )

    print()
    print(
        "EXACT FEATURE COMPATIBILITY: PASSED"
    )

    print(
        "Feature names and feature order exactly "
        "match the trained XGBoost booster."
    )

    print(
        f"Final features: {X.shape[1]:,}"
    )

    total_missing = int(
        X.isna().sum().sum()
    )

    print(
        f"Total NaN values: "
        f"{total_missing:,}"
    )

    print(
        "NaN values are passed directly to XGBoost."
    )

    return X


# ============================================================
# RECREATE EXACT TRAINING SPLIT
#
# This MUST match train_xgboost.py:
#
# unique_patients = sorted(...)
# patient label = max LABEL for patient
# train_test_split(... stratify=patient_labels)
# ============================================================

def recreate_training_split(df):

    section(
        "RECREATING EXACT TRAINING TEST SPLIT"
    )

    patients = (
        df["PATIENT"]
        .astype(str)
        .copy()
    )

    unique_patients = np.array(
        sorted(
            patients.unique()
        )
    )

    patient_labels = (
        df.groupby(
            "PATIENT"
        )["LABEL"]
        .max()
        .reindex(
            unique_patients
        )
        .values
    )

    (
        train_patients,
        test_patients,
    ) = train_test_split(
        unique_patients,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=patient_labels,
    )

    train_patient_set = set(
        train_patients
    )

    test_patient_set = set(
        test_patients
    )

    train_mask = (
        patients.isin(
            train_patient_set
        )
    )

    test_mask = (
        patients.isin(
            test_patient_set
        )
    )

    overlap = (
        train_patient_set
        &
        test_patient_set
    )

    if overlap:

        raise RuntimeError(
            f"PATIENT LEAKAGE DETECTED: "
            f"{len(overlap)} patients overlap."
        )

    print(
        f"Training rows: "
        f"{int(train_mask.sum()):,}"
    )

    print(
        f"Test rows:     "
        f"{int(test_mask.sum()):,}"
    )

    print(
        f"Training patients: "
        f"{len(train_patient_set):,}"
    )

    print(
        f"Test patients:     "
        f"{len(test_patient_set):,}"
    )

    print(
        "Patient leakage check: PASSED"
    )

    print(
        f"\nTrain positive rate: "
        f"{df.loc[train_mask, 'LABEL'].mean() * 100:.2f}%"
    )

    print(
        f"Test positive rate:  "
        f"{df.loc[test_mask, 'LABEL'].mean() * 100:.2f}%"
    )

    return (
        train_mask,
        test_mask,
    )


# ============================================================
# CALCULATE METRICS
# ============================================================

def calculate_metrics(
    y_true,
    probabilities,
    threshold,
):

    predictions = (
        probabilities >= threshold
    ).astype(int)

    tn, fp, fn, tp = confusion_matrix(
        y_true,
        predictions,
        labels=[0, 1],
    ).ravel()

    specificity = (
        tn / (tn + fp)
        if (tn + fp) > 0
        else np.nan
    )

    sensitivity = (
        tp / (tp + fn)
        if (tp + fn) > 0
        else np.nan
    )

    return {
        "threshold": float(threshold),

        "accuracy": float(
            accuracy_score(
                y_true,
                predictions,
            )
        ),

        "precision": float(
            precision_score(
                y_true,
                predictions,
                zero_division=0,
            )
        ),

        "recall": float(
            recall_score(
                y_true,
                predictions,
                zero_division=0,
            )
        ),

        "f1_score": float(
            f1_score(
                y_true,
                predictions,
                zero_division=0,
            )
        ),

        "specificity": float(
            specificity
        ),

        "sensitivity": float(
            sensitivity
        ),

        "true_negatives": int(tn),
        "false_positives": int(fp),
        "false_negatives": int(fn),
        "true_positives": int(tp),
    }


# ============================================================
# THRESHOLD ANALYSIS
# ============================================================

def evaluate_thresholds(
    y_true,
    probabilities,
):

    section(
        "THRESHOLD ANALYSIS"
    )

    rows = []

    for threshold in THRESHOLDS:

        metrics = calculate_metrics(
            y_true,
            probabilities,
            threshold,
        )

        metrics["positive_predictions"] = int(
            (
                probabilities >= threshold
            ).sum()
        )

        rows.append(
            metrics
        )

    threshold_df = pd.DataFrame(
        rows
    )

    print(
        threshold_df[
            [
                "threshold",
                "accuracy",
                "precision",
                "recall",
                "f1_score",
                "specificity",
                "positive_predictions",
            ]
        ].to_string(
            index=False
        )
    )

    best_row = (
        threshold_df
        .sort_values(
            [
                "f1_score",
                "recall",
            ],
            ascending=[
                False,
                False,
            ],
        )
        .iloc[0]
    )

    recommended_threshold = float(
        best_row["threshold"]
    )

    print()
    print(
        "Recommended threshold:"
    )

    print(
        f"{recommended_threshold:.2f}"
    )

    print(
        f"Precision: "
        f"{best_row['precision']:.4f}"
    )

    print(
        f"Recall: "
        f"{best_row['recall']:.4f}"
    )

    print(
        f"F1 Score: "
        f"{best_row['f1_score']:.4f}"
    )

    print(
        f"Specificity: "
        f"{best_row['specificity']:.4f}"
    )

    threshold_df.to_csv(
        os.path.join(
            OUTPUT_DIR,
            "threshold_analysis.csv",
        ),
        index=False,
    )

    return (
        threshold_df,
        best_row,
    )


# ============================================================
# SPARSE HISTORY EVALUATION
# ============================================================

def evaluate_sparse_history(
    test_df,
    probabilities,
    threshold,
):

    section(
        "SPARSE HISTORY EVALUATION"
    )

    results = test_df[
        [
            "PATIENT",
            "LABEL",
        ]
    ].copy()

    results["PROBABILITY"] = probabilities

    results["PREDICTION"] = (
        results["PROBABILITY"] >= threshold
    ).astype(int)

    patient_snapshot_counts = (
        results.groupby(
            "PATIENT"
        )
        .size()
        .rename(
            "SNAPSHOT_COUNT"
        )
    )

    results = results.join(
        patient_snapshot_counts,
        on="PATIENT",
    )

    groups = [
        (
            "1_snapshot",
            results["SNAPSHOT_COUNT"] == 1,
        ),
        (
            "2_to_3_snapshots",
            (
                results["SNAPSHOT_COUNT"] >= 2
            )
            &
            (
                results["SNAPSHOT_COUNT"] <= 3
            ),
        ),
        (
            "4_to_10_snapshots",
            (
                results["SNAPSHOT_COUNT"] >= 4
            )
            &
            (
                results["SNAPSHOT_COUNT"] <= 10
            ),
        ),
        (
            "more_than_10_snapshots",
            results["SNAPSHOT_COUNT"] > 10,
        ),
    ]

    rows = []

    for group_name, mask in groups:

        subset = results.loc[
            mask
        ]

        if len(subset) == 0:

            rows.append(
                {
                    "group": group_name,
                    "rows": 0,
                    "patients": 0,
                    "accuracy": np.nan,
                    "precision": np.nan,
                    "recall": np.nan,
                    "f1_score": np.nan,
                }
            )

            continue

        y_true = subset["LABEL"].values

        y_prob = subset[
            "PROBABILITY"
        ].values

        metrics = calculate_metrics(
            y_true,
            y_prob,
            threshold,
        )

        rows.append(
            {
                "group": group_name,
                "rows": int(len(subset)),
                "patients": int(
                    subset["PATIENT"].nunique()
                ),
                "accuracy": metrics["accuracy"],
                "precision": metrics["precision"],
                "recall": metrics["recall"],
                "f1_score": metrics["f1_score"],
                "specificity": metrics["specificity"],
            }
        )

    sparse_df = pd.DataFrame(
        rows
    )

    print(
        sparse_df.to_string(
            index=False
        )
    )

    sparse_df.to_csv(
        os.path.join(
            OUTPUT_DIR,
            "sparse_history_results.csv",
        ),
        index=False,
    )

    return sparse_df


# ============================================================
# MISSING DATA ROBUSTNESS
# ============================================================

def evaluate_missingness(
    X_test,
    y_test,
    model,
    threshold,
):

    section(
        "MISSING DATA ROBUSTNESS"
    )

    original_missing_rate = float(
        X_test.isna().mean().mean()
    )

    print(
        f"Original missing-value rate: "
        f"{original_missing_rate * 100:.2f}%"
    )

    scenarios = [
        (
            "original",
            0.0,
        ),
        (
            "additional_5_percent",
            0.05,
        ),
        (
            "additional_10_percent",
            0.10,
        ),
        (
            "additional_20_percent",
            0.20,
        ),
    ]

    rng = np.random.default_rng(
        RANDOM_STATE
    )

    rows = []

    for scenario_name, extra_missing_rate in scenarios:

        subsection(
            scenario_name
        )

        if extra_missing_rate == 0:

            X_scenario = X_test

        else:

            X_scenario = X_test.copy()

            random_mask = (
                rng.random(
                    X_scenario.shape
                )
                < extra_missing_rate
            )

            values = X_scenario.to_numpy(
                copy=True
            )

            values[random_mask] = np.nan

            X_scenario = pd.DataFrame(
                values,
                columns=X_test.columns,
                index=X_test.index,
            )

        probabilities = model.predict_proba(
            X_scenario
        )[:, 1]

        metrics = calculate_metrics(
            y_test,
            probabilities,
            threshold,
        )

        row = {
            "scenario": scenario_name,
            "additional_missing_rate": extra_missing_rate,
            "accuracy": metrics["accuracy"],
            "precision": metrics["precision"],
            "recall": metrics["recall"],
            "f1_score": metrics["f1_score"],
            "specificity": metrics["specificity"],
            "roc_auc": float(
                roc_auc_score(
                    y_test,
                    probabilities,
                )
            ),
            "pr_auc": float(
                average_precision_score(
                    y_test,
                    probabilities,
                )
            ),
        }

        rows.append(
            row
        )

        print(
            f"Accuracy: {row['accuracy']:.4f}"
        )

        print(
            f"Recall: {row['recall']:.4f}"
        )

        print(
            f"ROC-AUC: {row['roc_auc']:.4f}"
        )

    robustness_df = pd.DataFrame(
        rows
    )

    robustness_df.to_csv(
        os.path.join(
            OUTPUT_DIR,
            "missing_data_robustness.csv",
        ),
        index=False,
    )

    return robustness_df


# ============================================================
# CALIBRATION
# ============================================================

def evaluate_calibration(
    y_true,
    probabilities,
):

    section(
        "CALIBRATION ANALYSIS"
    )

    calibration_df = pd.DataFrame(
        {
            "LABEL": y_true,
            "PROBABILITY": probabilities,
        }
    )

    calibration_df["BIN"] = pd.qcut(
        calibration_df["PROBABILITY"],
        q=10,
        duplicates="drop",
    )

    grouped = (
        calibration_df
        .groupby(
            "BIN",
            observed=False,
        )
        .agg(
            rows=(
                "LABEL",
                "size",
            ),
            mean_predicted_probability=(
                "PROBABILITY",
                "mean",
            ),
            observed_positive_rate=(
                "LABEL",
                "mean",
            ),
        )
        .reset_index()
    )

    grouped["calibration_gap"] = (
        grouped[
            "mean_predicted_probability"
        ]
        -
        grouped[
            "observed_positive_rate"
        ]
    )

    brier = brier_score_loss(
        y_true,
        probabilities,
    )

    print(
        f"Brier score: {brier:.6f}"
    )

    print()

    print(
        grouped.to_string(
            index=False
        )
    )

    grouped.to_csv(
        os.path.join(
            OUTPUT_DIR,
            "calibration_analysis.csv",
        ),
        index=False,
    )

    return (
        grouped,
        brier,
    )


# ============================================================
# PROBABILITY DISTRIBUTION
# ============================================================

def evaluate_probability_distribution(
    y_true,
    probabilities,
):

    section(
        "PROBABILITY DISTRIBUTION"
    )

    probability_df = pd.DataFrame(
        {
            "LABEL": y_true,
            "PROBABILITY": probabilities,
        }
    )

    summary = (
        probability_df
        .groupby(
            "LABEL"
        )["PROBABILITY"]
        .describe()
    )

    print(
        summary
    )

    summary.to_csv(
        os.path.join(
            OUTPUT_DIR,
            "probability_distribution.csv",
        )
    )

    return summary


# ============================================================
# PATIENT LEVEL EVALUATION
# ============================================================

def evaluate_patient_level(
    test_df,
    probabilities,
    threshold,
):

    section(
        "PATIENT-LEVEL EVALUATION"
    )

    results = test_df[
        [
            "PATIENT",
            "LABEL",
        ]
    ].copy()

    results["PROBABILITY"] = probabilities

    results["PREDICTION"] = (
        results["PROBABILITY"] >= threshold
    ).astype(int)

    patient_results = (
        results.groupby(
            "PATIENT"
        )
        .agg(
            snapshots=(
                "LABEL",
                "size",
            ),
            actual_event_rate=(
                "LABEL",
                "mean",
            ),
            predicted_event_rate=(
                "PREDICTION",
                "mean",
            ),
            mean_probability=(
                "PROBABILITY",
                "mean",
            ),
            max_probability=(
                "PROBABILITY",
                "max",
            ),
        )
        .reset_index()
    )

    print(
        f"Patients evaluated: "
        f"{len(patient_results):,}"
    )

    print(
        f"Average snapshots per patient: "
        f"{patient_results['snapshots'].mean():.2f}"
    )

    print(
        f"Mean patient probability: "
        f"{patient_results['mean_probability'].mean():.4f}"
    )

    print(
        f"Mean maximum patient probability: "
        f"{patient_results['max_probability'].mean():.4f}"
    )

    patient_results.to_csv(
        os.path.join(
            OUTPUT_DIR,
            "patient_level_results.csv",
        ),
        index=False,
    )

    return patient_results


# ============================================================
# RANDOM SUBGROUP ANALYSIS
# ============================================================

def evaluate_random_subgroups(
    y_true,
    probabilities,
    threshold,
):

    section(
        "RANDOM SUBGROUP ANALYSIS"
    )

    rng = np.random.default_rng(
        RANDOM_STATE
    )

    subgroup_size = min(
        5000,
        len(y_true),
    )

    subgroup_count = 5

    rows = []

    for subgroup_number in range(
        1,
        subgroup_count + 1,
    ):

        indices = rng.choice(
            len(y_true),
            size=subgroup_size,
            replace=False,
        )

        subgroup_y = np.asarray(
            y_true
        )[indices]

        subgroup_probabilities = np.asarray(
            probabilities
        )[indices]

        metrics = calculate_metrics(
            subgroup_y,
            subgroup_probabilities,
            threshold,
        )

        row = {
            "subgroup": subgroup_number,
            "rows": int(
                subgroup_size
            ),
            "positive_rate": float(
                subgroup_y.mean()
            ),
            "accuracy": metrics["accuracy"],
            "precision": metrics["precision"],
            "recall": metrics["recall"],
            "f1_score": metrics["f1_score"],
            "roc_auc": float(
                roc_auc_score(
                    subgroup_y,
                    subgroup_probabilities,
                )
            ),
            "pr_auc": float(
                average_precision_score(
                    subgroup_y,
                    subgroup_probabilities,
                )
            ),
        }

        rows.append(
            row
        )

    subgroup_df = pd.DataFrame(
        rows
    )

    print(
        subgroup_df.to_string(
            index=False
        )
    )

    subgroup_df.to_csv(
        os.path.join(
            OUTPUT_DIR,
            "random_subgroup_results.csv",
        ),
        index=False,
    )

    return subgroup_df


# ============================================================
# FEATURE IMPORTANCE
# ============================================================

def evaluate_feature_importance(
    model,
):

    section(
        "FEATURE IMPORTANCE"
    )

    booster = model.get_booster()

    importance_dict = booster.get_score(
        importance_type="gain"
    )

    importance_df = pd.DataFrame(
        list(
            importance_dict.items()
        ),
        columns=[
            "feature",
            "importance",
        ],
    )

    importance_df = (
        importance_df
        .sort_values(
            "importance",
            ascending=False,
        )
        .reset_index(
            drop=True
        )
    )

    print(
        importance_df
        .head(30)
        .to_string(
            index=False
        )
    )

    importance_df.to_csv(
        os.path.join(
            OUTPUT_DIR,
            "evaluation_feature_importance.csv",
        ),
        index=False,
    )

    return importance_df


# ============================================================
# MAIN
# ============================================================

def main():

    section(
        "MODULE 1 - COMPLETE XGBOOST MODEL EVALUATION"
    )

    print(
        "Using existing trained model and existing "
        "training_dataset.parquet."
    )

    print(
        "No raw-data processing will be repeated."
    )

    print(
        "No feature generation will be repeated."
    )

    print(
        "No model training will be repeated."
    )

    # --------------------------------------------------------
    # 1. Validate files
    # --------------------------------------------------------

    validate_required_files()

    # --------------------------------------------------------
    # 2. Load dataset
    # --------------------------------------------------------

    df = load_dataset()

    # --------------------------------------------------------
    # 3. Load model FIRST
    #
    # The booster feature names are the absolute source of truth.
    # --------------------------------------------------------

    model = load_model()

    # --------------------------------------------------------
    # 4. Prepare exact model features
    # --------------------------------------------------------

    X = prepare_features(
        df,
        model,
    )

    # --------------------------------------------------------
    # 5. Recreate EXACT training split
    # --------------------------------------------------------

    (
        train_mask,
        test_mask,
    ) = recreate_training_split(
        df
    )

    # --------------------------------------------------------
    # 6. Build exact test data
    # --------------------------------------------------------

    X_test = (
        X.loc[test_mask]
        .copy()
    )

    y_test = (
        df.loc[
            test_mask,
            "LABEL"
        ]
        .astype(int)
        .values
    )

    test_df = (
        df.loc[test_mask]
        .copy()
    )

    # --------------------------------------------------------
    # 7. Final feature compatibility check
    # --------------------------------------------------------

    section(
        "FINAL MODEL FEATURE COMPATIBILITY CHECK"
    )

    model_features = (
        model.get_booster().feature_names
    )

    evaluation_features = (
        list(X_test.columns)
    )

    if model_features != evaluation_features:

        print(
            "Model and evaluation features do not match."
        )

        print(
            f"Model feature count: "
            f"{len(model_features)}"
        )

        print(
            f"Evaluation feature count: "
            f"{len(evaluation_features)}"
        )

        mismatches = []

        for index, (
            model_feature,
            evaluation_feature,
        ) in enumerate(
            zip(
                model_features,
                evaluation_features,
            )
        ):

            if model_feature != evaluation_feature:

                mismatches.append(
                    (
                        index,
                        model_feature,
                        evaluation_feature,
                    )
                )

        print(
            f"Mismatches found: "
            f"{len(mismatches)}"
        )

        for mismatch in mismatches[:20]:

            print(
                f"Index {mismatch[0]}:"
            )

            print(
                f"  Model:      "
                f"{mismatch[1]}"
            )

            print(
                f"  Evaluation: "
                f"{mismatch[2]}"
            )

        raise ValueError(
            "Feature mismatch remains."
        )

    print(
        "EXACT FEATURE MATCH: PASSED"
    )

    print(
        f"Features: "
        f"{len(model_features)}"
    )

    # --------------------------------------------------------
    # 8. Generate predictions
    # --------------------------------------------------------

    section(
        "GENERATING MODEL PREDICTIONS"
    )

    probabilities = model.predict_proba(
        X_test
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
        f"Mean probability: "
        f"{probabilities.mean():.6f}"
    )

    # --------------------------------------------------------
    # 9. Threshold-independent metrics
    # --------------------------------------------------------

    section(
        "THRESHOLD-INDEPENDENT PERFORMANCE"
    )

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
    # 10. Threshold analysis
    # --------------------------------------------------------

    (
        threshold_results,
        best_row,
    ) = evaluate_thresholds(
        y_test,
        probabilities,
    )

    recommended_threshold = float(
        best_row["threshold"]
    )

    # --------------------------------------------------------
    # 11. Default threshold
    # --------------------------------------------------------

    default_metrics = calculate_metrics(
        y_test,
        probabilities,
        0.50,
    )

    section(
        "DEFAULT THRESHOLD PERFORMANCE (0.50)"
    )

    for key, value in default_metrics.items():

        if isinstance(
            value,
            float,
        ):

            print(
                f"{key}: {value:.4f}"
            )

        else:

            print(
                f"{key}: {value}"
            )

    # --------------------------------------------------------
    # 12. Recommended threshold
    # --------------------------------------------------------

    recommended_metrics = calculate_metrics(
        y_test,
        probabilities,
        recommended_threshold,
    )

    section(
        "RECOMMENDED THRESHOLD PERFORMANCE"
    )

    for key, value in recommended_metrics.items():

        if isinstance(
            value,
            float,
        ):

            print(
                f"{key}: {value:.4f}"
            )

        else:

            print(
                f"{key}: {value}"
            )

    # --------------------------------------------------------
    # 13. Sparse history
    # --------------------------------------------------------

    sparse_results = evaluate_sparse_history(
        test_df,
        probabilities,
        recommended_threshold,
    )

    # --------------------------------------------------------
    # 14. Missing-data robustness
    # --------------------------------------------------------

    missingness_results = evaluate_missingness(
        X_test,
        y_test,
        model,
        recommended_threshold,
    )

    # --------------------------------------------------------
    # 15. Calibration
    # --------------------------------------------------------

    (
        calibration_results,
        brier_score,
    ) = evaluate_calibration(
        y_test,
        probabilities,
    )

    # --------------------------------------------------------
    # 16. Probability distribution
    # --------------------------------------------------------

    probability_summary = (
        evaluate_probability_distribution(
            y_test,
            probabilities,
        )
    )

    # --------------------------------------------------------
    # 17. Patient-level evaluation
    # --------------------------------------------------------

    patient_results = evaluate_patient_level(
        test_df,
        probabilities,
        recommended_threshold,
    )

    # --------------------------------------------------------
    # 18. Random subgroup analysis
    # --------------------------------------------------------

    subgroup_results = (
        evaluate_random_subgroups(
            y_test,
            probabilities,
            recommended_threshold,
        )
    )

    # --------------------------------------------------------
    # 19. Feature importance
    # --------------------------------------------------------

    importance_results = (
        evaluate_feature_importance(
            model
        )
    )

    # --------------------------------------------------------
    # 20. Save predictions
    # --------------------------------------------------------

    section(
        "SAVING EVALUATION PREDICTIONS"
    )

    prediction_results = test_df[
        [
            "PATIENT",
            "SNAPSHOT_DATE",
            "LABEL",
        ]
    ].copy()

    prediction_results[
        "PROBABILITY"
    ] = probabilities

    prediction_results[
        "PREDICTION_0_50"
    ] = (
        probabilities >= 0.50
    ).astype(int)

    prediction_results[
        "PREDICTION_RECOMMENDED"
    ] = (
        probabilities
        >=
        recommended_threshold
    ).astype(int)

    prediction_path = os.path.join(
        OUTPUT_DIR,
        "complete_evaluation_predictions.parquet",
    )

    prediction_results.to_parquet(
        prediction_path,
        index=False,
    )

    print(
        f"Saved: {prediction_path}"
    )

    # --------------------------------------------------------
    # 21. Save summary
    # --------------------------------------------------------

    section(
        "SAVING FINAL EVALUATION SUMMARY"
    )

    summary = {
        "test_rows": int(
            len(y_test)
        ),

        "test_patients": int(
            test_df["PATIENT"].nunique()
        ),

        "test_positive_rate": float(
            np.mean(y_test)
        ),

        "roc_auc": float(
            roc_auc
        ),

        "pr_auc": float(
            pr_auc
        ),

        "brier_score": float(
            brier_score
        ),

        "recommended_threshold": float(
            recommended_threshold
        ),

        "default_threshold_metrics":
            default_metrics,

        "recommended_threshold_metrics":
            recommended_metrics,
    }

    summary_path = os.path.join(
        OUTPUT_DIR,
        "complete_evaluation_summary.json",
    )

    with open(
        summary_path,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            summary,
            file,
            indent=4,
        )

    print(
        f"Saved: {summary_path}"
    )

    # --------------------------------------------------------
    # Final summary
    # --------------------------------------------------------

    section(
        "COMPLETE EVALUATION FINISHED"
    )

    print(
        f"Test rows: "
        f"{len(y_test):,}"
    )

    print(
        f"Test patients: "
        f"{test_df['PATIENT'].nunique():,}"
    )

    print()
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

    print()
    print(
        f"Recommended threshold: "
        f"{recommended_threshold:.2f}"
    )

    print(
        f"Accuracy:  "
        f"{recommended_metrics['accuracy']:.4f}"
    )

    print(
        f"Precision: "
        f"{recommended_metrics['precision']:.4f}"
    )

    print(
        f"Recall:    "
        f"{recommended_metrics['recall']:.4f}"
    )

    print(
        f"F1 Score:  "
        f"{recommended_metrics['f1_score']:.4f}"
    )

    print()
    print(
        "All evaluation outputs were saved to:"
    )

    print(
        OUTPUT_DIR
    )

    print()
    print(
        "IMPORTANT:"
    )

    print(
        "This evaluation did NOT rebuild your "
        "training dataset."
    )

    print(
        "This evaluation did NOT regenerate "
        "the 348 features."
    )

    print(
        "This evaluation did NOT retrain "
        "the XGBoost model."
    )


if __name__ == "__main__":

    main()