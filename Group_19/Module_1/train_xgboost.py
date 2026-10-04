import os
import json
import re
import warnings

import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
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

from xgboost import XGBClassifier


# ============================================================
# CONFIGURATION
# ============================================================

DATASET_PATH = "data/processed/training_dataset.parquet"

MODEL_DIR = "models"

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "xgboost_model.json",
)

FEATURE_NAMES_PATH = os.path.join(
    MODEL_DIR,
    "xgboost_feature_names.json",
)

FEATURE_MAPPING_PATH = os.path.join(
    MODEL_DIR,
    "xgboost_feature_mapping.json",
)

METRICS_PATH = os.path.join(
    MODEL_DIR,
    "xgboost_metrics.json",
)

TEST_PREDICTIONS_PATH = os.path.join(
    MODEL_DIR,
    "xgboost_test_predictions.parquet",
)

THRESHOLD_ANALYSIS_PATH = os.path.join(
    MODEL_DIR,
    "xgboost_threshold_analysis.csv",
)

FEATURE_IMPORTANCE_PATH = os.path.join(
    MODEL_DIR,
    "xgboost_feature_importance.csv",
)


PATIENT_COLUMN = "PATIENT"
SNAPSHOT_COLUMN = "SNAPSHOT_DATE"
LABEL_COLUMN = "LABEL"

TEST_SIZE = 0.20
RANDOM_STATE = 42


# ============================================================
# WARNING CONTROL
# ============================================================

warnings.filterwarnings(
    "ignore",
    category=FutureWarning,
)

warnings.filterwarnings(
    "ignore",
    category=UserWarning,
)


# ============================================================
# FEATURE NAME SANITIZATION
# ============================================================

def sanitize_feature_name(name: str) -> str:
    """
    XGBoost feature names cannot contain:
        [
        ]
        <
    and some special characters can cause problems.

    Convert every original feature name into a safe,
    deterministic XGBoost-compatible name.
    """

    name = str(name)

    # Replace all non-alphanumeric characters with underscore
    safe_name = re.sub(
        r"[^A-Za-z0-9_]+",
        "_",
        name,
    )

    # Remove repeated underscores
    safe_name = re.sub(
        r"_+",
        "_",
        safe_name,
    )

    # Remove underscores from beginning/end
    safe_name = safe_name.strip("_")

    # Ensure name is not empty
    if not safe_name:
        safe_name = "feature"

    return safe_name


def build_feature_mapping(feature_columns):
    """
    Creates:

    original feature name
        ->
    safe XGBoost feature name

    Also guarantees uniqueness after sanitization.
    """

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
        used_names.add(safe_name)

    return mapping


# ============================================================
# DATASET VALIDATION
# ============================================================

def validate_dataset(df):
    """
    Validate the actual schema of your existing dataset.

    Expected metadata columns:

        PATIENT
        SNAPSHOT_DATE
        LABEL

    Everything else is a model feature.
    """

    required_columns = [
        PATIENT_COLUMN,
        SNAPSHOT_COLUMN,
        LABEL_COLUMN,
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:

        raise ValueError(
            "\nDataset is missing required columns:\n"
            + "\n".join(
                f"- {column}"
                for column in missing_columns
            )
            + "\n\nActual first columns found:\n"
            + "\n".join(
                f"- {column}"
                for column in df.columns[:20]
            )
        )

    if len(df) == 0:

        raise ValueError(
            "Training dataset is empty."
        )

    unique_labels = set(
        pd.Series(
            df[LABEL_COLUMN]
        )
        .dropna()
        .astype(int)
        .unique()
    )

    if not unique_labels.issubset(
        {0, 1}
    ):

        raise ValueError(
            f"Unexpected labels found: "
            f"{sorted(unique_labels)}"
        )

    if len(unique_labels) < 2:

        raise ValueError(
            "Training dataset contains only one class."
        )

    return True


# ============================================================
# FEATURE PREPARATION
# ============================================================

def prepare_features(df):
    """
    Extract exactly the model features.

    IMPORTANT:
    PATIENT:
        Used only for grouped splitting.
        Never given to the model.

    SNAPSHOT_DATE:
        Metadata only.
        Never given to the model.

    LABEL:
        Prediction target.
        Never given to the model.
    """

    metadata_columns = {
        PATIENT_COLUMN,
        SNAPSHOT_COLUMN,
        LABEL_COLUMN,
    }

    feature_columns = [
        column
        for column in df.columns
        if column not in metadata_columns
    ]

    if len(feature_columns) == 0:

        raise ValueError(
            "No model features found."
        )

    print(
        f"\nFeatures detected: "
        f"{len(feature_columns):,}"
    )

    X = df[
        feature_columns
    ].copy()

    # Force every feature to numeric.
    #
    # Invalid values become NaN.
    # XGBoost handles NaN natively.
    for column in X.columns:

        X[column] = pd.to_numeric(
            X[column],
            errors="coerce",
        )

    # Replace infinities with NaN.
    X = X.replace(
        [np.inf, -np.inf],
        np.nan,
    )

    # Build XGBoost-safe feature names.
    feature_mapping = build_feature_mapping(
        feature_columns
    )

    safe_feature_columns = [
        feature_mapping[column]
        for column in feature_columns
    ]

    # Rename columns safely.
    X.columns = safe_feature_columns

    # Final safety check.
    if X.columns.duplicated().any():

        duplicates = X.columns[
            X.columns.duplicated()
        ].tolist()

        raise ValueError(
            f"Duplicate safe feature names found: "
            f"{duplicates[:10]}"
        )

    return (
        X,
        feature_columns,
        safe_feature_columns,
        feature_mapping,
    )


# ============================================================
# THRESHOLD ANALYSIS
# ============================================================

def analyze_thresholds(
    y_true,
    probabilities,
):
    """
    Evaluate several decision thresholds.

    This does NOT change ROC-AUC or PR-AUC.
    It only changes the final positive/negative decision.
    """

    thresholds = [
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

    rows = []

    for threshold in thresholds:

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
            else 0.0
        )

        rows.append(
            {
                "threshold": threshold,

                "precision": precision_score(
                    y_true,
                    predictions,
                    zero_division=0,
                ),

                "recall": recall_score(
                    y_true,
                    predictions,
                    zero_division=0,
                ),

                "f1_score": f1_score(
                    y_true,
                    predictions,
                    zero_division=0,
                ),

                "specificity": specificity,

                "positive_predictions": int(
                    predictions.sum()
                ),
            }
        )

    threshold_df = pd.DataFrame(
        rows
    )

    return threshold_df


# ============================================================
# MAIN
# ============================================================

def main():

    print(
        "\n"
        + "=" * 75
    )

    print(
        "MODULE 1 - XGBOOST MODEL TRAINING"
    )

    print(
        "=" * 75
    )


    # ========================================================
    # LOAD DATASET
    # ========================================================

    print(
        "\n"
        + "=" * 75
    )

    print(
        "LOADING EXISTING TRAINING DATASET"
    )

    print(
        "=" * 75
    )

    if not os.path.exists(
        DATASET_PATH
    ):

        raise FileNotFoundError(
            f"Dataset not found:\n"
            f"{DATASET_PATH}"
        )

    df = pd.read_parquet(
        DATASET_PATH
    )

    print(
        f"Rows: "
        f"{len(df):,}"
    )

    print(
        f"Columns: "
        f"{len(df.columns):,}"
    )

    validate_dataset(
        df
    )

    print(
        f"Patients: "
        f"{df[PATIENT_COLUMN].nunique():,}"
    )

    print(
        "\nConfirmed metadata columns:"
    )

    print(
        f"Patient column: "
        f"{PATIENT_COLUMN}"
    )

    print(
        f"Snapshot column: "
        f"{SNAPSHOT_COLUMN}"
    )

    print(
        f"Label column: "
        f"{LABEL_COLUMN}"
    )


    # ========================================================
    # LABEL SUMMARY
    # ========================================================

    print(
        "\nLabel distribution:"
    )

    print(
        df[
            LABEL_COLUMN
        ]
        .value_counts()
        .sort_index()
    )

    positive_rate = (
        df[LABEL_COLUMN].mean()
        * 100
    )

    print(
        f"\nOverall positive rate: "
        f"{positive_rate:.2f}%"
    )


    # ========================================================
    # PREPARE FEATURES
    # ========================================================

    print(
        "\n"
        + "=" * 75
    )

    print(
        "VALIDATING AND PREPARING FEATURES"
    )

    print(
        "=" * 75
    )

    (
        X,
        original_feature_columns,
        safe_feature_columns,
        feature_mapping,
    ) = prepare_features(
        df
    )

    y = (
        df[
            LABEL_COLUMN
        ]
        .astype(int)
        .copy()
    )

    patients = (
        df[
            PATIENT_COLUMN
        ]
        .astype(str)
        .copy()
    )

    print(
        f"Feature count: "
        f"{X.shape[1]:,}"
    )

    if X.shape[1] != 348:

        print(
            "\nWARNING:"
        )

        print(
            f"Expected from your current pipeline: 348"
        )

        print(
            f"Actually found: {X.shape[1]}"
        )

    else:

        print(
            "Feature count check: PASSED "
            "(348 features)"
        )

    missing_values = int(
        X.isna().sum().sum()
    )

    print(
        f"\nTotal missing feature values: "
        f"{missing_values:,}"
    )

    print(
        "Missing values will be handled "
        "natively by XGBoost."
    )


    # ========================================================
    # PATIENT-LEVEL TRAIN/TEST SPLIT
    # ========================================================

    print(
        "\n"
        + "=" * 75
    )

    print(
        "CREATING PATIENT-LEVEL TRAIN/TEST SPLIT"
    )

    print(
        "=" * 75
    )

    unique_patients = np.array(
        sorted(
            patients.unique()
        )
    )

    patient_labels = (
        df.groupby(
            PATIENT_COLUMN
        )[LABEL_COLUMN]
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

    train_mask = patients.isin(
        train_patient_set
    )

    test_mask = patients.isin(
        test_patient_set
    )

    X_train = X.loc[
        train_mask
    ].copy()

    X_test = X.loc[
        test_mask
    ].copy()

    y_train = y.loc[
        train_mask
    ].copy()

    y_test = y.loc[
        test_mask
    ].copy()

    train_patients_actual = set(
        patients.loc[
            train_mask
        ]
        .unique()
    )

    test_patients_actual = set(
        patients.loc[
            test_mask
        ]
        .unique()
    )

    overlap = (
        train_patients_actual
        &
        test_patients_actual
    )

    if overlap:

        raise RuntimeError(
            "PATIENT LEAKAGE DETECTED."
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
        f"{len(train_patients_actual):,}"
    )

    print(
        f"Test patients:     "
        f"{len(test_patients_actual):,}"
    )

    print(
        "Patient leakage check: PASSED"
    )

    print(
        f"\nTrain positive rate: "
        f"{y_train.mean() * 100:.2f}%"
    )

    print(
        f"Test positive rate:  "
        f"{y_test.mean() * 100:.2f}%"
    )


    # ========================================================
    # CLASS BALANCE
    # ========================================================

    print(
        "\n"
        + "=" * 75
    )

    print(
        "CLASS BALANCE"
    )

    print(
        "=" * 75
    )

    train_negative_count = int(
        (y_train == 0).sum()
    )

    train_positive_count = int(
        (y_train == 1).sum()
    )

    scale_pos_weight = (
        train_negative_count
        /
        max(
            train_positive_count,
            1
        )
    )

    print(
        f"Training negatives: "
        f"{train_negative_count:,}"
    )

    print(
        f"Training positives: "
        f"{train_positive_count:,}"
    )

    print(
        f"scale_pos_weight: "
        f"{scale_pos_weight:.4f}"
    )


    # ========================================================
    # TRAIN XGBOOST
    # ========================================================

    print(
        "\n"
        + "=" * 75
    )

    print(
        "TRAINING XGBOOST"
    )

    print(
        "=" * 75
    )

    print(
        "Missing values: "
        "handled natively by XGBoost"
    )

    model = XGBClassifier(

        objective="binary:logistic",

        eval_metric="logloss",

        n_estimators=800,

        learning_rate=0.03,

        max_depth=6,

        min_child_weight=5,

        subsample=0.85,

        colsample_bytree=0.85,

        gamma=0.1,

        reg_alpha=0.1,

        reg_lambda=1.0,

        scale_pos_weight=scale_pos_weight,

        random_state=RANDOM_STATE,

        n_jobs=-1,

        tree_method="hist",
    )

    model.fit(
        X_train,
        y_train,
        verbose=False,
    )

    print(
        "Model training complete."
    )


    # ========================================================
    # TEST PREDICTIONS
    # ========================================================

    print(
        "\n"
        + "=" * 75
    )

    print(
        "GENERATING TEST PREDICTIONS"
    )

    print(
        "=" * 75
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
        f"Mean probability:    "
        f"{probabilities.mean():.6f}"
    )


    # ========================================================
    # THRESHOLD-INDEPENDENT METRICS
    # ========================================================

    print(
        "\n"
        + "=" * 75
    )

    print(
        "THRESHOLD-INDEPENDENT MODEL PERFORMANCE"
    )

    print(
        "=" * 75
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
        f"ROC-AUC: "
        f"{roc_auc:.4f}"
    )

    print(
        f"PR-AUC:  "
        f"{pr_auc:.4f}"
    )


    # ========================================================
    # DEFAULT THRESHOLD
    # ========================================================

    print(
        "\n"
        + "=" * 75
    )

    print(
        "DEFAULT THRESHOLD PERFORMANCE (0.50)"
    )

    print(
        "=" * 75
    )

    default_predictions = (
        probabilities >= 0.50
    ).astype(int)

    accuracy = accuracy_score(
        y_test,
        default_predictions,
    )

    precision = precision_score(
        y_test,
        default_predictions,
        zero_division=0,
    )

    recall = recall_score(
        y_test,
        default_predictions,
        zero_division=0,
    )

    f1 = f1_score(
        y_test,
        default_predictions,
        zero_division=0,
    )

    tn, fp, fn, tp = confusion_matrix(
        y_test,
        default_predictions,
        labels=[0, 1],
    ).ravel()

    specificity = (
        tn / (tn + fp)
        if (tn + fp) > 0
        else 0.0
    )

    print(
        f"Accuracy:    {accuracy:.4f}"
    )

    print(
        f"Precision:   {precision:.4f}"
    )

    print(
        f"Recall:      {recall:.4f}"
    )

    print(
        f"F1 Score:    {f1:.4f}"
    )

    print(
        f"Specificity: {specificity:.4f}"
    )

    print(
        "\nConfusion Matrix:"
    )

    print(
        [
            [
                int(tn),
                int(fp),
            ],
            [
                int(fn),
                int(tp),
            ],
        ]
    )

    print(
        "\nClassification Report:"
    )

    print(
        classification_report(
            y_test,
            default_predictions,
            digits=4,
            zero_division=0,
        )
    )


    # ========================================================
    # THRESHOLD ANALYSIS
    # ========================================================

    print(
        "\n"
        + "=" * 75
    )

    print(
        "THRESHOLD ANALYSIS"
    )

    print(
        "=" * 75
    )

    threshold_df = analyze_thresholds(
        y_test,
        probabilities,
    )

    print(
        threshold_df.to_string(
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
        best_row[
            "threshold"
        ]
    )

    print(
        "\n"
        + "=" * 75
    )

    print(
        "RECOMMENDED THRESHOLD"
    )

    print(
        "=" * 75
    )

    print(
        "Selection method: "
        "Highest F1 score among tested thresholds"
    )

    print(
        f"\nRecommended threshold: "
        f"{recommended_threshold:.2f}"
    )

    print(
        f"Precision: "
        f"{best_row['precision']:.4f}"
    )

    print(
        f"Recall:    "
        f"{best_row['recall']:.4f}"
    )

    print(
        f"F1 Score:  "
        f"{best_row['f1_score']:.4f}"
    )

    print(
        f"Specificity: "
        f"{best_row['specificity']:.4f}"
    )


    # ========================================================
    # FEATURE IMPORTANCE
    # ========================================================

    print(
        "\n"
        + "=" * 75
    )

    print(
        "TOP 20 IMPORTANT FEATURES"
    )

    print(
        "=" * 75
    )

    importance_values = model.feature_importances_

    reverse_mapping = {
        safe_name: original_name
        for original_name, safe_name
        in feature_mapping.items()
    }

    importance_df = pd.DataFrame(
        {
            "safe_feature_name":
                safe_feature_columns,

            "original_feature_name":
                [
                    reverse_mapping[
                        safe_name
                    ]
                    for safe_name
                    in safe_feature_columns
                ],

            "importance":
                importance_values,
        }
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
        importance_df[
            [
                "original_feature_name",
                "importance",
            ]
        ]
        .head(20)
        .to_string(
            index=False
        )
    )


    # ========================================================
    # SAVE OUTPUTS
    # ========================================================

    print(
        "\n"
        + "=" * 75
    )

    print(
        "SAVING MODEL ARTIFACTS"
    )

    print(
        "=" * 75
    )

    os.makedirs(
        MODEL_DIR,
        exist_ok=True,
    )

    # Save XGBoost model
    model.save_model(
        MODEL_PATH
    )

    # Save original feature order.
    #
    # IMPORTANT:
    # This is what inference should use
    # before converting to safe names.
    with open(
        FEATURE_NAMES_PATH,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            original_feature_columns,
            file,
            indent=2,
        )

    # Save exact original -> safe mapping.
    with open(
        FEATURE_MAPPING_PATH,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            feature_mapping,
            file,
            indent=2,
        )

    metrics = {

        "dataset_rows":
            int(len(df)),

        "dataset_columns":
            int(len(df.columns)),

        "feature_count":
            int(X.shape[1]),

        "patient_count":
            int(
                df[
                    PATIENT_COLUMN
                ].nunique()
            ),

        "train_rows":
            int(
                len(X_train)
            ),

        "test_rows":
            int(
                len(X_test)
            ),

        "train_patients":
            int(
                len(train_patients_actual)
            ),

        "test_patients":
            int(
                len(test_patients_actual)
            ),

        "roc_auc":
            float(roc_auc),

        "pr_auc":
            float(pr_auc),

        "accuracy_threshold_0_50":
            float(accuracy),

        "precision_threshold_0_50":
            float(precision),

        "recall_threshold_0_50":
            float(recall),

        "f1_threshold_0_50":
            float(f1),

        "specificity_threshold_0_50":
            float(specificity),

        "recommended_threshold":
            float(
                recommended_threshold
            ),

        "recommended_precision":
            float(
                best_row[
                    "precision"
                ]
            ),

        "recommended_recall":
            float(
                best_row[
                    "recall"
                ]
            ),

        "recommended_f1":
            float(
                best_row[
                    "f1_score"
                ]
            ),

        "recommended_specificity":
            float(
                best_row[
                    "specificity"
                ]
            ),

        "scale_pos_weight":
            float(
                scale_pos_weight
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

    threshold_df.to_csv(
        THRESHOLD_ANALYSIS_PATH,
        index=False,
    )

    importance_df.to_csv(
        FEATURE_IMPORTANCE_PATH,
        index=False,
    )

    test_predictions_df = pd.DataFrame(
        {
            PATIENT_COLUMN:
                patients.loc[
                    test_mask
                ].values,

            SNAPSHOT_COLUMN:
                df.loc[
                    test_mask,
                    SNAPSHOT_COLUMN
                ].values,

            "true_label":
                y_test.values,

            "predicted_probability":
                probabilities,

            "prediction_0_50":
                default_predictions,
        }
    )

    test_predictions_df.to_parquet(
        TEST_PREDICTIONS_PATH,
        index=False,
    )

    print(
        f"Model saved: "
        f"{MODEL_PATH}"
    )

    print(
        f"Feature names saved: "
        f"{FEATURE_NAMES_PATH}"
    )

    print(
        f"Feature mapping saved: "
        f"{FEATURE_MAPPING_PATH}"
    )

    print(
        f"Metrics saved: "
        f"{METRICS_PATH}"
    )

    print(
        f"Test predictions saved: "
        f"{TEST_PREDICTIONS_PATH}"
    )

    print(
        f"Threshold analysis saved: "
        f"{THRESHOLD_ANALYSIS_PATH}"
    )

    print(
        f"Feature importance saved: "
        f"{FEATURE_IMPORTANCE_PATH}"
    )


    # ========================================================
    # FINAL SUMMARY
    # ========================================================

    print(
        "\n"
        + "=" * 75
    )

    print(
        "XGBOOST TRAINING COMPLETE"
    )

    print(
        "=" * 75
    )

    print(
        f"ROC-AUC: "
        f"{roc_auc:.4f}"
    )

    print(
        f"PR-AUC:  "
        f"{pr_auc:.4f}"
    )

    print(
        "\nDefault threshold (0.50):"
    )

    print(
        f"  Accuracy:  "
        f"{accuracy:.4f}"
    )

    print(
        f"  Precision: "
        f"{precision:.4f}"
    )

    print(
        f"  Recall:    "
        f"{recall:.4f}"
    )

    print(
        f"  F1 Score:  "
        f"{f1:.4f}"
    )

    print(
        "\nRecommended threshold:"
    )

    print(
        f"  {recommended_threshold:.2f}"
    )

    print(
        f"  Precision: "
        f"{best_row['precision']:.4f}"
    )

    print(
        f"  Recall:    "
        f"{best_row['recall']:.4f}"
    )

    print(
        f"  F1 Score:  "
        f"{best_row['f1_score']:.4f}"
    )

    print(
        "\nIMPORTANT:"
    )

    print(
        "This training uses your existing "
        "training_dataset.parquet."
    )

    print(
        "No raw data processing or feature "
        "generation was repeated."
    )


if __name__ == "__main__":

    main()