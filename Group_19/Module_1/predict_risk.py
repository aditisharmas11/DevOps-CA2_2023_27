import os
import sys
import json
import math
import re
from datetime import datetime

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from xgboost import XGBClassifier, DMatrix

from feature_engine import (
    get_feature_names,
    align_feature_dataframe,
)


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")

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

PREDICTION_HORIZON_DAYS = 90
DEFAULT_THRESHOLD = 0.45

LINE = "=" * 75


# ============================================================
# DISPLAY
# ============================================================

def section(title):

    print()
    print(LINE)
    print(title)
    print(LINE)


def subsection(title):

    print()
    print("-" * 75)
    print(title)
    print("-" * 75)


# ============================================================
# SAFE JSON CONVERSION
# ============================================================

def json_safe(value):

    if isinstance(value, dict):

        return {
            str(key): json_safe(item)
            for key, item in value.items()
        }

    if isinstance(value, list):

        return [
            json_safe(item)
            for item in value
        ]

    if isinstance(value, tuple):

        return [
            json_safe(item)
            for item in value
        ]

    if isinstance(value, pd.Timestamp):

        if pd.isna(value):
            return None

        return value.isoformat()

    if isinstance(value, np.integer):

        return int(value)

    if isinstance(value, np.floating):

        if np.isnan(value):
            return None

        if np.isinf(value):
            return None

        return float(value)

    if isinstance(value, np.ndarray):

        return [
            json_safe(item)
            for item in value.tolist()
        ]

    if isinstance(value, float):

        if math.isnan(value):
            return None

        if math.isinf(value):
            return None

        return value

    return value


# ============================================================
# FILE UTILITIES
# ============================================================

def load_json(path):

    if not os.path.exists(path):

        raise FileNotFoundError(
            f"Required file not found:\n{path}"
        )

    with open(
        path,
        "r",
        encoding="utf-8",
    ) as file:

        return json.load(file)


def save_json(data, path):

    with open(
        path,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            json_safe(data),
            file,
            indent=2,
            ensure_ascii=False,
        )


def sanitize_folder_name(value):

    value = str(value)

    value = re.sub(
        r'[<>:"/\\|?*]',
        "_",
        value,
    )

    value = value.strip()

    if not value:
        value = "patient"

    return value


# ============================================================
# MODEL LOADING
# ============================================================

def load_model():

    if not os.path.exists(MODEL_PATH):

        raise FileNotFoundError(
            f"XGBoost model not found:\n{MODEL_PATH}"
        )

    model = XGBClassifier()

    model.load_model(
        MODEL_PATH
    )

    return model


# ============================================================
# ARTIFACT VALIDATION
# ============================================================

def validate_artifacts(
    original_feature_names,
    feature_mapping,
):

    if not isinstance(
        original_feature_names,
        list,
    ):

        raise RuntimeError(
            "xgboost_feature_names.json "
            "must contain a JSON list."
        )

    if not isinstance(
        feature_mapping,
        dict,
    ):

        raise RuntimeError(
            "xgboost_feature_mapping.json "
            "must contain a JSON object."
        )

    if len(original_feature_names) != 348:

        raise RuntimeError(
            "Unexpected feature count in "
            "xgboost_feature_names.json.\n"
            f"Expected: 348\n"
            f"Found: {len(original_feature_names)}"
        )

    if len(feature_mapping) != 348:

        raise RuntimeError(
            "Unexpected feature count in "
            "xgboost_feature_mapping.json.\n"
            f"Expected: 348\n"
            f"Found: {len(feature_mapping)}"
        )

    if len(set(original_feature_names)) != len(
        original_feature_names
    ):

        raise RuntimeError(
            "Duplicate original feature names found."
        )

    missing_mapping = [
        feature
        for feature in original_feature_names
        if feature not in feature_mapping
    ]

    if missing_mapping:

        raise RuntimeError(
            "Some original features do not have mappings.\n"
            f"First missing feature: "
            f"{missing_mapping[0]}"
        )

    safe_feature_names = [
        feature_mapping[feature]
        for feature in original_feature_names
    ]

    if len(set(safe_feature_names)) != len(
        safe_feature_names
    ):

        raise RuntimeError(
            "Duplicate safe XGBoost feature names found."
        )

    return safe_feature_names


# ============================================================
# FEATURE ENGINE CONTRACT VALIDATION
# ============================================================

def validate_feature_engine_contract(
    saved_original_features,
):

    engine_features = get_feature_names()

    print(
        f"Feature engine features: "
        f"{len(engine_features)}"
    )

    print(
        f"Saved original features: "
        f"{len(saved_original_features)}"
    )

    if len(engine_features) != 348:

        raise RuntimeError(
            "Current feature engine does not "
            "produce 348 features."
        )

    if engine_features != saved_original_features:

        mismatch_index = None

        for index, (
            engine_name,
            saved_name,
        ) in enumerate(
            zip(
                engine_features,
                saved_original_features,
            )
        ):

            if engine_name != saved_name:

                mismatch_index = index
                break

        message = (
            "FEATURE ENGINE CONTRACT MISMATCH.\n"
            "The current feature_engine.py does not match "
            "the feature order used during XGBoost training."
        )

        if mismatch_index is not None:

            message += (
                f"\nFirst mismatch index: "
                f"{mismatch_index}"
                f"\nFeature engine: "
                f"{engine_features[mismatch_index]}"
                f"\nTraining artifact: "
                f"{saved_original_features[mismatch_index]}"
            )

        raise RuntimeError(message)

    print(
        "Original feature order: PASSED"
    )


# ============================================================
# XGBOOST BOOSTER CONTRACT
# ============================================================

def validate_model_feature_contract(
    model,
    expected_safe_features,
):

    booster = model.get_booster()

    model_feature_names = booster.feature_names

    print(
        f"Expected safe features: "
        f"{len(expected_safe_features)}"
    )

    if model_feature_names is None:

        print(
            "Booster does not expose feature names."
        )

        print(
            "Using artifact mapping as the exact "
            "inference contract."
        )

        return expected_safe_features

    print(
        f"Booster feature names: "
        f"{len(model_feature_names)}"
    )

    if len(model_feature_names) != len(
        expected_safe_features
    ):

        raise RuntimeError(
            "Model feature count mismatch.\n"
            f"Expected: {len(expected_safe_features)}\n"
            f"Model: {len(model_feature_names)}"
        )

    if model_feature_names != expected_safe_features:

        mismatch_index = None

        for index, (
            expected_name,
            model_name,
        ) in enumerate(
            zip(
                expected_safe_features,
                model_feature_names,
            )
        ):

            if expected_name != model_name:

                mismatch_index = index
                break

        message = (
            "XGBOOST BOOSTER FEATURE CONTRACT MISMATCH."
        )

        if mismatch_index is not None:

            message += (
                f"\nFirst mismatch index: "
                f"{mismatch_index}"
                f"\nExpected safe feature: "
                f"{expected_safe_features[mismatch_index]}"
                f"\nModel feature: "
                f"{model_feature_names[mismatch_index]}"
            )

        raise RuntimeError(message)

    print(
        "Exact XGBoost booster feature contract: PASSED"
    )

    return model_feature_names


# ============================================================
# PATIENT INPUT
# ============================================================

def load_patient_file(path):

    if not os.path.exists(path):

        raise FileNotFoundError(
            f"Patient input file not found:\n{path}"
        )

    data = load_json(path)

    if not isinstance(data, dict):

        raise ValueError(
            "Patient JSON must contain one JSON object."
        )

    return data


def parse_date(value):

    if value is None:
        return None

    timestamp = pd.to_datetime(
        value,
        errors="coerce",
        utc=True,
    )

    if pd.isna(timestamp):
        return None

    return timestamp


def get_patient_id(
    patient_data,
    fallback="sample_patient",
):

    possible_keys = [
        "patient_id",
        "PATIENT_ID",
        "patient",
        "PATIENT",
        "id",
        "ID",
    ]

    for key in possible_keys:

        value = patient_data.get(key)

        if value is not None:

            value = str(value).strip()

            if value:
                return value

    return fallback


# ============================================================
# EXTRACT OBSERVATIONS
# ============================================================

def extract_observations(
    patient_data,
):

    observations = patient_data.get(
        "observations",
        None,
    )

    if observations is None:

        raise ValueError(
            "Patient JSON must contain an "
            "'observations' field."
        )

    if not isinstance(
        observations,
        list,
    ):

        raise ValueError(
            "'observations' must be a list."
        )

    rows = []

    for index, observation in enumerate(
        observations
    ):

        if not isinstance(
            observation,
            dict,
        ):

            raise ValueError(
                f"Observation {index} is not an object."
            )

        name = observation.get(
            "name",
            observation.get(
                "observation",
                observation.get(
                    "type",
                    None,
                ),
            ),
        )

        value = observation.get(
            "value",
            None,
        )

        date = observation.get(
            "date",
            observation.get(
                "timestamp",
                observation.get(
                    "time",
                    None,
                ),
            ),
        )

        if name is None:

            raise ValueError(
                f"Observation {index} has no name."
            )

        if value is None:

            raise ValueError(
                f"Observation {index} has no value."
            )

        parsed_date = parse_date(date)

        if parsed_date is None:

            raise ValueError(
                f"Observation {index} has an invalid "
                f"date: {date}"
            )

        try:

            numeric_value = float(value)

        except (
            TypeError,
            ValueError,
        ):

            raise ValueError(
                f"Observation {index} has a "
                f"non-numeric value: {value}"
            )

        if not np.isfinite(numeric_value):

            raise ValueError(
                f"Observation {index} has an "
                f"invalid numeric value."
            )

        rows.append(
            {
                "OBSERVATION": str(name).strip(),
                "DATE": parsed_date,
                "VALUE": numeric_value,
            }
        )

    if not rows:

        raise ValueError(
            "No observations were provided."
        )

    result = pd.DataFrame(rows)

    result = result.sort_values(
        [
            "OBSERVATION",
            "DATE",
        ]
    ).reset_index(
        drop=True
    )

    return result


# ============================================================
# TREND / SLOPE
# ============================================================

def linear_slope(
    dates,
    values,
):

    if len(values) < 2:
        return np.nan

    try:

        date_values = pd.to_datetime(
            dates,
            utc=True,
        )

        x = (
            date_values
            - date_values.min()
        ).dt.total_seconds().to_numpy() / 86400.0

        y = np.asarray(
            values,
            dtype=float,
        )

        if len(np.unique(x)) < 2:

            return np.nan

        slope = np.polyfit(
            x,
            y,
            1,
        )[0]

        return float(slope)

    except Exception:

        return np.nan


def classify_trend(
    first_value,
    latest_value,
):

    if (
        first_value is None
        or latest_value is None
    ):

        return "UNKNOWN"

    if not np.isfinite(first_value):
        return "UNKNOWN"

    if not np.isfinite(latest_value):
        return "UNKNOWN"

    difference = latest_value - first_value

    scale = max(
        abs(first_value),
        abs(latest_value),
        1.0,
    )

    relative_difference = (
        abs(difference) / scale
    )

    if relative_difference < 0.02:

        return "STABLE"

    if difference > 0:

        return "INCREASING"

    return "DECREASING"


# ============================================================
# BUILD ONE FEATURE BLOCK
# ============================================================

def build_feature_block(
    observation_name,
    history,
    reference_date,
):

    suffixes = [
        "latest",
        "mean_365d",
        "min_365d",
        "max_365d",
        "std_365d",
        "mean_90d",
        "slope_365d",
        "slope_90d",
        "absolute_change_365d",
        "relative_change_365d",
        "days_since_latest",
        "missing",
    ]

    result = {
        f"{observation_name}__{suffix}": np.nan
        for suffix in suffixes
    }

    result[
        f"{observation_name}__missing"
    ] = 1.0

    if history is None or len(history) == 0:

        return result

    history = history.copy()

    history["DATE"] = pd.to_datetime(
        history["DATE"],
        utc=True,
        errors="coerce",
    )

    history["VALUE"] = pd.to_numeric(
        history["VALUE"],
        errors="coerce",
    )

    history = history.dropna(
        subset=[
            "DATE",
            "VALUE",
        ]
    )

    history = history[
        history["DATE"] <= reference_date
    ]

    if len(history) == 0:

        return result

    history = history.sort_values(
        "DATE"
    )

    latest_row = history.iloc[-1]

    latest_value = float(
        latest_row["VALUE"]
    )

    latest_date = latest_row["DATE"]

    history_365 = history[
        history["DATE"]
        >= reference_date
        - pd.Timedelta(days=365)
    ]

    history_90 = history[
        history["DATE"]
        >= reference_date
        - pd.Timedelta(days=90)
    ]

    result[
        f"{observation_name}__latest"
    ] = latest_value

    if len(history_365) > 0:

        values_365 = (
            history_365["VALUE"]
            .astype(float)
        )

        result[
            f"{observation_name}__mean_365d"
        ] = float(
            values_365.mean()
        )

        result[
            f"{observation_name}__min_365d"
        ] = float(
            values_365.min()
        )

        result[
            f"{observation_name}__max_365d"
        ] = float(
            values_365.max()
        )

        if len(values_365) >= 2:

            result[
                f"{observation_name}__std_365d"
            ] = float(
                values_365.std()
            )

        result[
            f"{observation_name}__slope_365d"
        ] = linear_slope(
            history_365["DATE"],
            history_365["VALUE"],
        )

        first_365 = float(
            values_365.iloc[0]
        )

        result[
            f"{observation_name}__absolute_change_365d"
        ] = (
            latest_value - first_365
        )

        if abs(first_365) > 1e-12:

            result[
                f"{observation_name}__relative_change_365d"
            ] = (
                latest_value - first_365
            ) / abs(first_365)

    if len(history_90) > 0:

        values_90 = (
            history_90["VALUE"]
            .astype(float)
        )

        result[
            f"{observation_name}__mean_90d"
        ] = float(
            values_90.mean()
        )

        result[
            f"{observation_name}__slope_90d"
        ] = linear_slope(
            history_90["DATE"],
            history_90["VALUE"],
        )

    days_since_latest = (
        reference_date - latest_date
    ).total_seconds() / 86400.0

    result[
        f"{observation_name}__days_since_latest"
    ] = float(
        max(
            0.0,
            days_since_latest,
        )
    )

    result[
        f"{observation_name}__missing"
    ] = 0.0

    return result


# ============================================================
# BUILD FEATURES AT ANY REFERENCE DATE
# ============================================================

def build_patient_features_at_date(
    observations,
    original_feature_names,
    reference_date,
):

    observations = observations[
        observations["DATE"] <= reference_date
    ].copy()

    if len(observations) == 0:

        raise ValueError(
            "No observations available before "
            "the requested reference date."
        )

    row = {}

    base_observation_names = []

    for feature_name in original_feature_names:

        observation_name = feature_name.rsplit(
            "__",
            1,
        )[0]

        if observation_name not in base_observation_names:

            base_observation_names.append(
                observation_name
            )

    for observation_name in base_observation_names:

        history = observations[
            observations["OBSERVATION"]
            == observation_name
        ]

        features = build_feature_block(
            observation_name,
            history,
            reference_date,
        )

        row.update(features)

    feature_df = pd.DataFrame([row])

    feature_df = align_feature_dataframe(
        feature_df,
        original_feature_names,
    )

    feature_df = feature_df[
        original_feature_names
    ]

    return feature_df


def build_patient_features(
    observations,
    original_feature_names,
):

    reference_date = observations[
        "DATE"
    ].max()

    feature_df = build_patient_features_at_date(
        observations,
        original_feature_names,
        reference_date,
    )

    return (
        feature_df,
        reference_date,
    )


# ============================================================
# EXACT ORIGINAL -> MODEL FEATURE CONVERSION
# ============================================================

def convert_to_model_features(
    original_feature_df,
    original_feature_names,
    feature_mapping,
    model_feature_names,
):

    if list(
        original_feature_df.columns
    ) != original_feature_names:

        raise RuntimeError(
            "Original inference feature order does not "
            "match xgboost_feature_names.json."
        )

    safe_feature_df = original_feature_df.rename(
        columns=feature_mapping
    )

    expected_safe_features = [
        feature_mapping[name]
        for name in original_feature_names
    ]

    if list(
        safe_feature_df.columns
    ) != expected_safe_features:

        raise RuntimeError(
            "Original -> safe feature conversion "
            "produced an unexpected feature order."
        )

    missing_model_features = [
        name
        for name in model_feature_names
        if name not in safe_feature_df.columns
    ]

    if missing_model_features:

        raise RuntimeError(
            "Missing model features after mapping.\n"
            f"First missing feature: "
            f"{missing_model_features[0]}"
        )

    safe_feature_df = safe_feature_df[
        model_feature_names
    ]

    if list(
        safe_feature_df.columns
    ) != list(model_feature_names):

        raise RuntimeError(
            "Final XGBoost feature order mismatch."
        )

    return safe_feature_df


# ============================================================
# RISK CATEGORY
# ============================================================

def get_risk_category(probability):

    if probability < 0.20:
        return "LOW"

    if probability < 0.45:
        return "MODERATE"

    if probability < 0.70:
        return "HIGH"

    return "VERY HIGH"


def get_risk_description(category):

    descriptions = {
        "LOW":
            (
                "The model estimates a relatively low "
                "90-day acute-event probability."
            ),

        "MODERATE":
            (
                "The model estimates a moderate future risk. "
                "The probability is below the trained "
                "positive-risk threshold but should be "
                "interpreted with the available history."
            ),

        "HIGH":
            (
                "The model probability exceeds the selected "
                "operating threshold and indicates elevated "
                "predicted future risk."
            ),

        "VERY HIGH":
            (
                "The model estimates a substantially elevated "
                "future risk within the prediction horizon."
            ),
    }

    return descriptions.get(
        category,
        "Risk category unavailable.",
    )


# ============================================================
# HISTORY SUMMARY
# ============================================================

def calculate_history_summary(
    observations,
    reference_date,
):

    observation_types = int(
        observations["OBSERVATION"].nunique()
    )

    total_records = int(
        len(observations)
    )

    first_date = observations[
        "DATE"
    ].min()

    history_days = (
        reference_date - first_date
    ).total_seconds() / 86400.0

    unique_dates = int(
        observations["DATE"]
        .dt.normalize()
        .nunique()
    )

    return {
        "total_records": total_records,
        "observation_types": observation_types,
        "unique_dates": unique_dates,
        "history_days": float(history_days),
        "first_record_date": first_date,
        "latest_record_date": reference_date,
    }


# ============================================================
# DATA QUALITY / CONFIDENCE
# ============================================================

def calculate_data_confidence(
    history_summary,
    original_feature_df,
):

    records = history_summary["total_records"]
    types = history_summary["observation_types"]
    dates = history_summary["unique_dates"]
    history_days = history_summary["history_days"]

    coverage = (
        original_feature_df
        .notna()
        .mean()
        .iloc[0]
    )

    record_score = min(
        records / 30.0,
        1.0,
    )

    type_score = min(
        types / 10.0,
        1.0,
    )

    date_score = min(
        dates / 5.0,
        1.0,
    )

    history_score = min(
        history_days / 365.0,
        1.0,
    )

    score = (
        0.20 * record_score
        + 0.20 * type_score
        + 0.25 * date_score
        + 0.20 * history_score
        + 0.15 * coverage
    )

    score = float(
        max(
            0.0,
            min(score, 1.0),
        )
    )

    if score >= 0.80:
        category = "HIGH"

    elif score >= 0.55:
        category = "MODERATE"

    else:
        category = "LIMITED"

    explanation = {
        "HIGH": (
            "The prediction has relatively strong historical "
            "coverage for this input."
        ),

        "MODERATE": (
            "The prediction is based on usable but incomplete "
            "historical coverage."
        ),

        "LIMITED": (
            "The prediction is based on sparse history. "
            "The model can still produce a result, but less "
            "patient history is available for feature estimation."
        ),
    }[category]

    return {
        "score": score,
        "percent": score * 100.0,
        "category": category,
        "feature_coverage_percent": float(
            coverage * 100.0
        ),
        "explanation": explanation,
    }


# ============================================================
# OBSERVATION PROGRESSION
# ============================================================

def analyze_observation_progression(
    observations,
    reference_date,
):

    rows = []

    for observation_name, group in observations.groupby(
        "OBSERVATION"
    ):

        group = group.sort_values("DATE")

        first_row = group.iloc[0]
        latest_row = group.iloc[-1]

        first_value = float(first_row["VALUE"])
        latest_value = float(latest_row["VALUE"])

        absolute_change = (
            latest_value - first_value
        )

        if abs(first_value) > 1e-12:

            percent_change = (
                absolute_change
                / abs(first_value)
            ) * 100.0

        else:

            percent_change = np.nan

        slope = linear_slope(
            group["DATE"],
            group["VALUE"],
        )

        history_days = (
            latest_row["DATE"]
            - first_row["DATE"]
        ).total_seconds() / 86400.0

        days_since_latest = (
            reference_date
            - latest_row["DATE"]
        ).total_seconds() / 86400.0

        recent_90 = group[
            group["DATE"]
            >= reference_date
            - pd.Timedelta(days=90)
        ]

        recent_365 = group[
            group["DATE"]
            >= reference_date
            - pd.Timedelta(days=365)
        ]

        trend = classify_trend(
            first_value,
            latest_value,
        )

        rows.append(
            {
                "observation": observation_name,
                "records": int(len(group)),
                "first_date": first_row["DATE"],
                "latest_date": latest_row["DATE"],
                "first_value": first_value,
                "latest_value": latest_value,
                "minimum": float(group["VALUE"].min()),
                "maximum": float(group["VALUE"].max()),
                "mean": float(group["VALUE"].mean()),
                "std": (
                    float(group["VALUE"].std())
                    if len(group) >= 2
                    else np.nan
                ),
                "absolute_change": absolute_change,
                "percent_change": percent_change,
                "slope_per_day": slope,
                "trend": trend,
                "history_days": history_days,
                "days_since_latest": max(
                    0.0,
                    days_since_latest,
                ),
                "records_last_90_days": int(
                    len(recent_90)
                ),
                "records_last_365_days": int(
                    len(recent_365)
                ),
            }
        )

    progression = pd.DataFrame(rows)

    if len(progression) > 0:

        progression = progression.sort_values(
            "observation"
        ).reset_index(drop=True)

    return progression


# ============================================================
# XGBOOST FEATURE CONTRIBUTIONS
# ============================================================

def get_feature_contributions(
    model,
    model_feature_df,
    original_feature_names,
    feature_mapping,
):

    booster = model.get_booster()

    try:

        matrix = DMatrix(
            model_feature_df,
            feature_names=list(
                model_feature_df.columns
            ),
            missing=np.nan,
        )

        contributions = booster.predict(
            matrix,
            pred_contribs=True,
            validate_features=True,
        )

        contributions = contributions[0]

        safe_names = list(
            model_feature_df.columns
        )

        if len(contributions) != len(safe_names) + 1:

            return pd.DataFrame()

        reverse_mapping = {
            safe_name: original_name
            for original_name, safe_name
            in feature_mapping.items()
        }

        rows = []

        for index, safe_name in enumerate(
            safe_names
        ):

            original_name = reverse_mapping.get(
                safe_name,
                safe_name,
            )

            feature_value = model_feature_df.iloc[
                0,
                index,
            ]

            rows.append(
                {
                    "original_feature": original_name,
                    "safe_feature": safe_name,
                    "feature_value": feature_value,
                    "contribution": float(
                        contributions[index]
                    ),
                    "absolute_contribution": abs(
                        float(contributions[index])
                    ),
                    "direction": (
                        "INCREASES_RISK"
                        if contributions[index] > 0
                        else (
                            "REDUCES_RISK"
                            if contributions[index] < 0
                            else "NEUTRAL"
                        )
                    ),
                }
            )

        contribution_df = pd.DataFrame(rows)

        contribution_df = contribution_df.sort_values(
            "absolute_contribution",
            ascending=False,
        ).reset_index(drop=True)

        return contribution_df

    except Exception as error:

        print()
        print(
            "Warning: Detailed XGBoost contribution "
            "calculation could not be completed."
        )

        print(
            f"Reason: {error}"
        )

        return pd.DataFrame()


# ============================================================
# FEATURE COVERAGE
# ============================================================

def analyze_feature_coverage(
    original_feature_df,
):

    total_features = int(
        original_feature_df.shape[1]
    )

    available = int(
        original_feature_df.notna().sum(axis=1).iloc[0]
    )

    missing = total_features - available

    missing_percent = (
        missing / total_features
    ) * 100.0

    available_percent = (
        available / total_features
    ) * 100.0

    return {
        "total_features": total_features,
        "available_features": available,
        "missing_features": missing,
        "available_percent": available_percent,
        "missing_percent": missing_percent,
    }


# ============================================================
# PREDICT ONE SNAPSHOT
# ============================================================

def predict_at_reference_date(
    model,
    observations,
    original_feature_names,
    feature_mapping,
    model_feature_names,
    reference_date,
):

    original_df = build_patient_features_at_date(
        observations,
        original_feature_names,
        reference_date,
    )

    model_df = convert_to_model_features(
        original_feature_df=original_df,
        original_feature_names=original_feature_names,
        feature_mapping=feature_mapping,
        model_feature_names=model_feature_names,
    )

    probability = float(
        model.predict_proba(
            model_df
        )[0, 1]
    )

    return probability


# ============================================================
# HISTORICAL RISK PROGRESSION
# ============================================================

def calculate_risk_progression(
    model,
    observations,
    original_feature_names,
    feature_mapping,
    model_feature_names,
):

    unique_dates = sorted(
        observations["DATE"].unique()
    )

    rows = []

    for reference_date in unique_dates:

        available = observations[
            observations["DATE"] <= reference_date
        ]

        if len(available) == 0:
            continue

        try:

            probability = predict_at_reference_date(
                model=model,
                observations=available,
                original_feature_names=original_feature_names,
                feature_mapping=feature_mapping,
                model_feature_names=model_feature_names,
                reference_date=reference_date,
            )

            rows.append(
                {
                    "reference_date": reference_date,
                    "records_available": int(
                        len(available)
                    ),
                    "observation_types_available": int(
                        available[
                            "OBSERVATION"
                        ].nunique()
                    ),
                    "risk_probability": probability,
                    "risk_percent": probability * 100.0,
                    "risk_category": get_risk_category(
                        probability
                    ),
                }
            )

        except Exception as error:

            print(
                f"Risk progression skipped for "
                f"{reference_date}: {error}"
            )

    progression = pd.DataFrame(rows)

    return progression


# ============================================================
# CHART: RISK GAUGE
# ============================================================

def create_risk_chart(
    probability,
    threshold,
    output_path,
):

    fig = plt.figure(
        figsize=(10, 5)
    )

    ax = fig.add_subplot(111)

    categories = [
        "Low",
        "Moderate",
        "High",
        "Very High",
    ]

    boundaries = [
        0.00,
        0.20,
        0.45,
        0.70,
        1.00,
    ]

    centers = [
        0.10,
        0.325,
        0.575,
        0.85,
    ]

    for index in range(4):

        ax.barh(
            0,
            boundaries[index + 1]
            - boundaries[index],
            left=boundaries[index],
            height=0.35,
        )

        ax.text(
            centers[index],
            -0.30,
            categories[index],
            ha="center",
            va="center",
            fontsize=10,
        )

    ax.axvline(
        probability,
        linewidth=3,
    )

    ax.axvline(
        threshold,
        linestyle="--",
        linewidth=2,
    )

    ax.text(
        probability,
        0.30,
        f"{probability * 100:.2f}%",
        ha="center",
        va="bottom",
        fontsize=14,
        fontweight="bold",
    )

    ax.text(
        threshold,
        0.55,
        f"Threshold {threshold:.2f}",
        ha="center",
        va="bottom",
        fontsize=10,
    )

    ax.set_xlim(0, 1)
    ax.set_ylim(-0.6, 0.8)
    ax.set_yticks([])

    ax.set_xlabel(
        "Predicted 90-Day Acute Event Probability"
    )

    ax.set_title(
        "Current Future Risk Prediction"
    )

    plt.tight_layout()

    plt.savefig(
        output_path,
        dpi=150,
        bbox_inches="tight",
    )

    plt.close()


# ============================================================
# CHART: RISK PROGRESSION
# ============================================================

def create_risk_progression_chart(
    risk_progression,
    threshold,
    output_path,
):

    if len(risk_progression) == 0:
        return

    fig = plt.figure(
        figsize=(11, 6)
    )

    ax = fig.add_subplot(111)

    dates = pd.to_datetime(
        risk_progression["reference_date"],
        utc=True,
    )

    values = risk_progression[
        "risk_percent"
    ]

    ax.plot(
        dates,
        values,
        marker="o",
        linewidth=2,
    )

    ax.axhline(
        threshold * 100.0,
        linestyle="--",
        linewidth=2,
        label=(
            f"Decision Threshold "
            f"({threshold * 100:.0f}%)"
        ),
    )

    ax.set_title(
        "Predicted Risk Progression Across Available History"
    )

    ax.set_xlabel(
        "Patient Measurement Date"
    )

    ax.set_ylabel(
        "Predicted 90-Day Risk (%)"
    )

    ax.legend()

    ax.grid(
        True,
        alpha=0.3,
    )

    plt.xticks(
        rotation=30
    )

    plt.tight_layout()

    plt.savefig(
        output_path,
        dpi=150,
        bbox_inches="tight",
    )

    plt.close()


# ============================================================
# CHART: OBSERVATION PROGRESSION
# ============================================================

def create_observation_progression_chart(
    observations,
    output_path,
    max_observations=12,
):

    observation_counts = (
        observations[
            "OBSERVATION"
        ]
        .value_counts()
        .head(max_observations)
        .index
        .tolist()
    )

    if not observation_counts:
        return

    fig = plt.figure(
        figsize=(12, 7)
    )

    ax = fig.add_subplot(111)

    for observation_name in observation_counts:

        group = observations[
            observations["OBSERVATION"]
            == observation_name
        ].sort_values("DATE")

        values = group["VALUE"].astype(float)

        if len(values) == 0:
            continue

        # Normalize for multi-observation comparison.
        minimum = values.min()
        maximum = values.max()

        if maximum - minimum > 1e-12:

            normalized = (
                (values - minimum)
                / (maximum - minimum)
            )

        else:

            normalized = pd.Series(
                np.full(
                    len(values),
                    0.5,
                ),
                index=values.index,
            )

        ax.plot(
            group["DATE"],
            normalized,
            marker="o",
            linewidth=1.5,
            label=observation_name,
        )

    ax.set_title(
        "Normalized Progression of Most Frequently Available Observations"
    )

    ax.set_xlabel(
        "Date"
    )

    ax.set_ylabel(
        "Normalized Value (0 to 1)"
    )

    ax.legend(
        fontsize=8,
        loc="best",
    )

    ax.grid(
        True,
        alpha=0.3,
    )

    plt.xticks(
        rotation=30
    )

    plt.tight_layout()

    plt.savefig(
        output_path,
        dpi=150,
        bbox_inches="tight",
    )

    plt.close()


# ============================================================
# CHART: DATA COVERAGE
# ============================================================

def create_coverage_chart(
    coverage,
    history_summary,
    output_path,
):

    fig = plt.figure(
        figsize=(10, 6)
    )

    ax = fig.add_subplot(111)

    labels = [
        "Available Features",
        "Missing Features",
    ]

    values = [
        coverage["available_features"],
        coverage["missing_features"],
    ]

    ax.bar(
        labels,
        values,
    )

    ax.set_title(
        "Model Feature Coverage"
    )

    ax.set_ylabel(
        "Number of Features"
    )

    for index, value in enumerate(values):

        ax.text(
            index,
            value,
            str(value),
            ha="center",
            va="bottom",
            fontsize=12,
        )

    summary_text = (
        f"Records: {history_summary['total_records']}\n"
        f"Observation Types: "
        f"{history_summary['observation_types']}\n"
        f"Measurement Dates: "
        f"{history_summary['unique_dates']}\n"
        f"History Span: "
        f"{history_summary['history_days']:.1f} days\n"
        f"Feature Coverage: "
        f"{coverage['available_percent']:.1f}%"
    )

    ax.text(
        1.02,
        0.5,
        summary_text,
        transform=ax.transAxes,
        va="center",
        fontsize=11,
    )

    plt.tight_layout()

    plt.savefig(
        output_path,
        dpi=150,
        bbox_inches="tight",
    )

    plt.close()


# ============================================================
# CHART: FEATURE CONTRIBUTIONS
# ============================================================

def create_contribution_chart(
    contribution_df,
    output_path,
    top_n=12,
):

    if contribution_df is None:
        return

    if len(contribution_df) == 0:
        return

    top = contribution_df.head(top_n).copy()

    top = top.iloc[::-1]

    fig = plt.figure(
        figsize=(12, 7)
    )

    ax = fig.add_subplot(111)

    ax.barh(
        top["original_feature"],
        top["contribution"],
    )

    ax.axvline(
        0,
        linewidth=1,
    )

    ax.set_title(
        "Top XGBoost Prediction Contributions"
    )

    ax.set_xlabel(
        "Contribution to Model Prediction"
    )

    ax.set_ylabel(
        "Feature"
    )

    plt.tight_layout()

    plt.savefig(
        output_path,
        dpi=150,
        bbox_inches="tight",
    )

    plt.close()


# ============================================================
# PRINT DETAILED PROGRESSION
# ============================================================

def print_progression_summary(
    progression,
):

    if len(progression) == 0:

        print(
            "No progression information available."
        )

        return

    display_columns = [
        "observation",
        "records",
        "first_value",
        "latest_value",
        "absolute_change",
        "percent_change",
        "trend",
        "days_since_latest",
    ]

    display = progression[
        display_columns
    ].copy()

    display["first_value"] = (
        display["first_value"].round(4)
    )

    display["latest_value"] = (
        display["latest_value"].round(4)
    )

    display["absolute_change"] = (
        display["absolute_change"].round(4)
    )

    display["percent_change"] = (
        display["percent_change"].round(2)
    )

    display["days_since_latest"] = (
        display["days_since_latest"].round(1)
    )

    print(
        display.to_string(
            index=False
        )
    )


# ============================================================
# MAIN
# ============================================================

def main():

    if len(sys.argv) != 2:

        print(
            "Usage:"
        )

        print(
            "py predict_risk.py sample_patient.json"
        )

        sys.exit(1)

    patient_path = sys.argv[1]

    section(
        "MODULE 1 - FUTURE RISK PREDICTION"
    )

    print(
        "Using existing trained XGBoost artifacts."
    )

    print(
        "No model retraining will be performed."
    )

    print(
        "No dataset rebuilding will be performed."
    )


    # ========================================================
    # VALIDATE FILES
    # ========================================================

    section(
        "VALIDATING MODEL ARTIFACTS"
    )

    required_files = [
        MODEL_PATH,
        FEATURE_NAMES_PATH,
        FEATURE_MAPPING_PATH,
    ]

    for path in required_files:

        if not os.path.exists(path):

            raise FileNotFoundError(
                f"Missing required artifact:\n{path}"
            )

        print(
            f"FOUND: {os.path.basename(path)}"
        )

    print()
    print(
        "All required model artifacts found."
    )


    # ========================================================
    # LOAD MODEL
    # ========================================================

    section(
        "LOADING MODEL AND FEATURE CONTRACT"
    )

    model = load_model()

    print(
        "Loaded model: xgboost_model.json"
    )

    original_feature_names = load_json(
        FEATURE_NAMES_PATH
    )

    feature_mapping = load_json(
        FEATURE_MAPPING_PATH
    )

    safe_feature_names = validate_artifacts(
        original_feature_names,
        feature_mapping,
    )

    print(
        f"Saved original feature names: "
        f"{len(original_feature_names)}"
    )

    print(
        f"Saved safe feature mappings: "
        f"{len(feature_mapping)}"
    )

    print(
        "Artifact validation: PASSED"
    )


    # ========================================================
    # VALIDATE FEATURE ENGINE
    # ========================================================

    section(
        "VALIDATING FEATURE ENGINE CONTRACT"
    )

    validate_feature_engine_contract(
        original_feature_names
    )


    # ========================================================
    # VALIDATE XGBOOST
    # ========================================================

    section(
        "VALIDATING XGBOOST FEATURE CONTRACT"
    )

    model_feature_names = (
        validate_model_feature_contract(
            model,
            safe_feature_names,
        )
    )


    # ========================================================
    # LOAD PATIENT
    # ========================================================

    section(
        "LOADING PATIENT DATA"
    )

    patient_data = load_patient_file(
        patient_path
    )

    patient_id = get_patient_id(
        patient_data,
        os.path.splitext(
            os.path.basename(patient_path)
        )[0],
    )

    observations = extract_observations(
        patient_data
    )

    print(
        f"Patient ID: {patient_id}"
    )

    print(
        f"Observations loaded: "
        f"{len(observations)}"
    )

    print(
        f"Observation types: "
        f"{observations['OBSERVATION'].nunique()}"
    )

    print(
        f"Date range: "
        f"{observations['DATE'].min()} "
        f"to "
        f"{observations['DATE'].max()}"
    )


    # ========================================================
    # CREATE OUTPUT DIRECTORY
    # ========================================================

    patient_folder = sanitize_folder_name(
        patient_id
    )

    patient_output_dir = os.path.join(
        OUTPUT_DIR,
        patient_folder,
    )

    os.makedirs(
        patient_output_dir,
        exist_ok=True,
    )


    # ========================================================
    # BUILD CURRENT FEATURES
    # ========================================================

    section(
        "GENERATING PATIENT FEATURES"
    )

    original_feature_df, reference_date = (
        build_patient_features(
            observations,
            original_feature_names,
        )
    )

    print(
        f"Reference date: {reference_date}"
    )

    print(
        f"Original features generated: "
        f"{original_feature_df.shape[1]}"
    )

    if original_feature_df.shape[1] != 348:

        raise RuntimeError(
            "Expected exactly 348 original features."
        )

    print(
        "Original feature generation: PASSED"
    )


    # ========================================================
    # ALIGN TO MODEL
    # ========================================================

    section(
        "ALIGNING FEATURES TO TRAINED XGBOOST MODEL"
    )

    model_feature_df = (
        convert_to_model_features(
            original_feature_df=
                original_feature_df,
            original_feature_names=
                original_feature_names,
            feature_mapping=
                feature_mapping,
            model_feature_names=
                model_feature_names,
        )
    )

    print(
        f"Final model features: "
        f"{model_feature_df.shape[1]}"
    )

    print(
        "Exact feature names and order: PASSED"
    )

    missing_feature_values = int(
        model_feature_df.isna().sum().sum()
    )

    print(
        f"Missing values passed to XGBoost: "
        f"{missing_feature_values}"
    )


    # ========================================================
    # GENERATE PREDICTION
    # ========================================================

    section(
        "GENERATING FUTURE RISK PREDICTION"
    )

    probability = float(
        model.predict_proba(
            model_feature_df
        )[0, 1]
    )

    threshold = DEFAULT_THRESHOLD

    metrics = {}

    if os.path.exists(METRICS_PATH):

        try:

            metrics = load_json(
                METRICS_PATH
            )

            threshold = float(
                metrics.get(
                    "recommended_threshold",
                    threshold,
                )
            )

        except Exception:

            print(
                "Could not read recommended threshold "
                "from metrics. Using default 0.45."
            )

    predicted_event = (
        probability >= threshold
    )

    risk_category = get_risk_category(
        probability
    )

    print(
        f"90-day acute event probability: "
        f"{probability * 100:.2f}%"
    )

    print(
        f"Decision threshold: "
        f"{threshold:.2f}"
    )

    print(
        f"Predicted risk flag: "
        f"{'POSITIVE' if predicted_event else 'NEGATIVE'}"
    )

    print(
        f"Risk category: "
        f"{risk_category}"
    )


    # ========================================================
    # HISTORY ANALYSIS
    # ========================================================

    section(
        "PATIENT HISTORY ANALYSIS"
    )

    history_summary = calculate_history_summary(
        observations,
        reference_date,
    )

    for key, value in history_summary.items():

        if isinstance(
            value,
            float,
        ):

            print(
                f"{key}: {value:.2f}"
            )

        else:

            print(
                f"{key}: {value}"
            )


    # ========================================================
    # FEATURE COVERAGE
    # ========================================================

    section(
        "MODEL FEATURE COVERAGE"
    )

    coverage = analyze_feature_coverage(
        original_feature_df
    )

    print(
        f"Total model features: "
        f"{coverage['total_features']}"
    )

    print(
        f"Available feature values: "
        f"{coverage['available_features']}"
    )

    print(
        f"Missing feature values: "
        f"{coverage['missing_features']}"
    )

    print(
        f"Feature coverage: "
        f"{coverage['available_percent']:.2f}%"
    )


    # ========================================================
    # DATA CONFIDENCE
    # ========================================================

    section(
        "INPUT DATA CONFIDENCE"
    )

    data_confidence = calculate_data_confidence(
        history_summary,
        original_feature_df,
    )

    print(
        f"Confidence score: "
        f"{data_confidence['percent']:.2f}%"
    )

    print(
        f"Confidence category: "
        f"{data_confidence['category']}"
    )

    print(
        data_confidence["explanation"]
    )


    # ========================================================
    # OBSERVATION PROGRESSION
    # ========================================================

    section(
        "OBSERVATION-BY-OBSERVATION PROGRESSION"
    )

    observation_progression = (
        analyze_observation_progression(
            observations,
            reference_date,
        )
    )

    print_progression_summary(
        observation_progression
    )


    # ========================================================
    # MODEL EXPLANATION
    # ========================================================

    section(
        "MODEL PREDICTION EXPLANATION"
    )

    contribution_df = get_feature_contributions(
        model=model,
        model_feature_df=model_feature_df,
        original_feature_names=original_feature_names,
        feature_mapping=feature_mapping,
    )

    if len(contribution_df) > 0:

        print(
            "Top features by prediction contribution:"
        )

        print()

        display_contributions = contribution_df.head(
            15
        )[
            [
                "original_feature",
                "feature_value",
                "contribution",
                "direction",
            ]
        ].copy()

        display_contributions[
            "feature_value"
        ] = display_contributions[
            "feature_value"
        ].round(4)

        display_contributions[
            "contribution"
        ] = display_contributions[
            "contribution"
        ].round(5)

        print(
            display_contributions.to_string(
                index=False
            )
        )

    else:

        print(
            "Feature contribution details were unavailable."
        )


    # ========================================================
    # RISK PROGRESSION
    # ========================================================

    section(
        "CALCULATING HISTORICAL RISK PROGRESSION"
    )

    print(
        "Calculating prediction at each available "
        "patient measurement date..."
    )

    risk_progression = (
        calculate_risk_progression(
            model=model,
            observations=observations,
            original_feature_names=original_feature_names,
            feature_mapping=feature_mapping,
            model_feature_names=model_feature_names,
        )
    )

    print(
        f"Risk progression points generated: "
        f"{len(risk_progression)}"
    )

    if len(risk_progression) > 0:

        print()

        display_risk = risk_progression.copy()

        display_risk[
            "risk_percent"
        ] = display_risk[
            "risk_percent"
        ].round(2)

        print(
            display_risk.to_string(
                index=False
            )
        )


    # ========================================================
    # GENERATE CHARTS
    # ========================================================

    section(
        "GENERATING VISUAL REPORTS"
    )

    risk_chart_path = os.path.join(
        patient_output_dir,
        "current_risk.png",
    )

    risk_progression_chart_path = os.path.join(
        patient_output_dir,
        "risk_progression.png",
    )

    observation_chart_path = os.path.join(
        patient_output_dir,
        "observation_progression.png",
    )

    coverage_chart_path = os.path.join(
        patient_output_dir,
        "data_coverage.png",
    )

    contribution_chart_path = os.path.join(
        patient_output_dir,
        "feature_contributions.png",
    )

    create_risk_chart(
        probability,
        threshold,
        risk_chart_path,
    )

    print(
        f"Saved: {risk_chart_path}"
    )

    create_risk_progression_chart(
        risk_progression,
        threshold,
        risk_progression_chart_path,
    )

    print(
        f"Saved: {risk_progression_chart_path}"
    )

    create_observation_progression_chart(
        observations,
        observation_chart_path,
    )

    print(
        f"Saved: {observation_chart_path}"
    )

    create_coverage_chart(
        coverage,
        history_summary,
        coverage_chart_path,
    )

    print(
        f"Saved: {coverage_chart_path}"
    )

    if len(contribution_df) > 0:

        create_contribution_chart(
            contribution_df,
            contribution_chart_path,
        )

        print(
            f"Saved: {contribution_chart_path}"
        )


    # ========================================================
    # SAVE CSV FILES
    # ========================================================

    section(
        "SAVING DETAILED REPORTS"
    )

    observation_progression_path = os.path.join(
        patient_output_dir,
        "observation_progression.csv",
    )

    observation_progression.to_csv(
        observation_progression_path,
        index=False,
    )

    print(
        f"Saved: {observation_progression_path}"
    )

    risk_progression_path = os.path.join(
        patient_output_dir,
        "risk_progression.csv",
    )

    risk_progression.to_csv(
        risk_progression_path,
        index=False,
    )

    print(
        f"Saved: {risk_progression_path}"
    )

    if len(contribution_df) > 0:

        contribution_csv_path = os.path.join(
            patient_output_dir,
            "model_feature_contributions.csv",
        )

        contribution_df.to_csv(
            contribution_csv_path,
            index=False,
        )

        print(
            f"Saved: {contribution_csv_path}"
        )


    # ========================================================
    # BUILD DETAILED FINAL RESULT
    # ========================================================

    top_risk_increasing = []

    top_risk_reducing = []

    if len(contribution_df) > 0:

        increasing = contribution_df[
            contribution_df["contribution"] > 0
        ].sort_values(
            "contribution",
            ascending=False,
        )

        reducing = contribution_df[
            contribution_df["contribution"] < 0
        ].sort_values(
            "contribution",
            ascending=True,
        )

        top_risk_increasing = (
            increasing.head(10)
            .to_dict(
                orient="records"
            )
        )

        top_risk_reducing = (
            reducing.head(10)
            .to_dict(
                orient="records"
            )
        )

    result = {
        "module":
            "Module 1 - Future Risk Prediction",

        "patient_id":
            patient_id,

        "generated_at":
            pd.Timestamp.now(
                tz="UTC"
            ),

        "prediction_horizon_days":
            PREDICTION_HORIZON_DAYS,

        "reference_date":
            reference_date,

        "prediction": {

            "acute_event_probability":
                probability,

            "acute_event_probability_percent":
                probability * 100.0,

            "recommended_threshold":
                threshold,

            "predicted_positive":
                bool(predicted_event),

            "risk_category":
                risk_category,

            "interpretation":
                get_risk_description(
                    risk_category
                ),
        },

        "history_summary":
            history_summary,

        "data_confidence":
            data_confidence,

        "feature_coverage":
            coverage,

        "feature_contract": {

            "original_feature_count":
                len(original_feature_names),

            "safe_model_feature_count":
                len(model_feature_names),

            "feature_order_validated":
                True,

            "feature_engine_validated":
                True,

            "xgboost_contract_validated":
                True,
        },

        "observation_progression":
            observation_progression.to_dict(
                orient="records"
            ),

        "risk_progression":
            risk_progression.to_dict(
                orient="records"
            ),

        "top_risk_increasing_factors":
            top_risk_increasing,

        "top_risk_reducing_factors":
            top_risk_reducing,

        "output_files": {
            "current_risk_chart":
                risk_chart_path,

            "risk_progression_chart":
                risk_progression_chart_path,

            "observation_progression_chart":
                observation_chart_path,

            "data_coverage_chart":
                coverage_chart_path,

            "feature_contribution_chart":
                (
                    contribution_chart_path
                    if len(contribution_df) > 0
                    else None
                ),

            "observation_progression_csv":
                observation_progression_path,

            "risk_progression_csv":
                risk_progression_path,
        },
    }

    result_path = os.path.join(
        patient_output_dir,
        "prediction_report.json",
    )

    save_json(
        result,
        result_path,
    )

    print(
        f"Saved: {result_path}"
    )


    # ========================================================
    # FINAL TERMINAL SUMMARY
    # ========================================================

    section(
        "FINAL CLINICAL DECISION-SUPPORT SUMMARY"
    )

    print(
        f"Patient: {patient_id}"
    )

    print(
        f"Prediction horizon: "
        f"{PREDICTION_HORIZON_DAYS} days"
    )

    print(
        f"Predicted probability: "
        f"{probability * 100:.2f}%"
    )

    print(
        f"Risk category: "
        f"{risk_category}"
    )

    print(
        f"Threshold decision: "
        f"{'POSITIVE / ELEVATED RISK FLAG' if predicted_event else 'NEGATIVE / BELOW SELECTED THRESHOLD'}"
    )

    print(
        f"Data confidence: "
        f"{data_confidence['category']} "
        f"({data_confidence['percent']:.1f}%)"
    )

    print()

    print(
        "Interpretation:"
    )

    print(
        get_risk_description(
            risk_category
        )
    )

    print()

    print(
        "This output is intended as AI-based "
        "clinical decision support and does not "
        "replace professional medical diagnosis."
    )


    section(
        "MODULE 1 PREDICTION COMPLETE"
    )

    print(
        f"All outputs saved in:"
    )

    print(
        patient_output_dir
    )


if __name__ == "__main__":
    main()