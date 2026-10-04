from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from config import (
    SUPPORTED_OBSERVATIONS,
    OBSERVATION_ALIASES,
    FEATURE_LOOKBACK_DAYS,
    SHORT_FEATURE_LOOKBACK_DAYS,
    MIN_HISTORY_POINTS_FOR_TREND,
)


# ============================================================
# FEATURE CONFIGURATION
# ============================================================

FEATURE_SUFFIXES = [
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


# ============================================================
# OBSERVATION NAME RESOLUTION
# ============================================================

def resolve_observation_name(description: Any) -> Optional[str]:

    if description is None:
        return None

    name = str(description).strip()

    if not name:
        return None

    if name in SUPPORTED_OBSERVATIONS:
        return name

    lowered = name.lower()

    for canonical_name, aliases in OBSERVATION_ALIASES.items():

        if lowered == canonical_name.lower():
            return canonical_name

        for alias in aliases:
            if lowered == str(alias).strip().lower():
                return canonical_name

    return None


# ============================================================
# NORMALIZE ONE OBSERVATION
# ============================================================

def normalize_single_observation(
    observation: Dict[str, Any],
) -> Optional[Dict[str, Any]]:

    if not isinstance(observation, dict):
        return None

    description = (
        observation.get("description")
        or observation.get("DESCRIPTION")
    )

    canonical_name = resolve_observation_name(
        description
    )

    if canonical_name is None:
        return None

    date = (
        observation.get("date")
        or observation.get("DATE")
    )

    value = (
        observation.get("value")
        if "value" in observation
        else observation.get("VALUE")
    )

    date = pd.to_datetime(
        date,
        errors="coerce",
    )

    value = pd.to_numeric(
        value,
        errors="coerce",
    )

    if pd.isna(date) or pd.isna(value):
        return None

    return {
        "date": pd.Timestamp(date).normalize(),
        "description": canonical_name,
        "value": float(value),
    }


# ============================================================
# NORMALIZE COMPLETE INPUT
# ============================================================

def normalize_observations(
    observations: List[Dict[str, Any]],
) -> pd.DataFrame:

    if not isinstance(observations, list):
        observations = []

    rows = []

    for observation in observations:

        normalized = normalize_single_observation(
            observation
        )

        if normalized is not None:
            rows.append(normalized)

    if not rows:
        return pd.DataFrame(
            columns=["date", "description", "value"]
        )

    df = pd.DataFrame(rows)

    # Same observation + same date:
    # median prevents duplicate records from overweighting
    # a single timestamp.
    df = (
        df.groupby(
            ["date", "description"],
            as_index=False,
        )["value"]
        .median()
    )

    return (
        df.sort_values(
            ["description", "date"]
        )
        .reset_index(drop=True)
    )


# ============================================================
# TREND HELPERS
# ============================================================

def calculate_linear_slope(
    dates: pd.Series,
    values: pd.Series,
) -> float:

    dates = pd.to_datetime(
        dates,
        errors="coerce",
    )

    values = pd.to_numeric(
        values,
        errors="coerce",
    )

    valid = dates.notna() & values.notna()

    dates = dates[valid].reset_index(drop=True)
    values = values[valid].reset_index(drop=True)

    if len(values) < MIN_HISTORY_POINTS_FOR_TREND:
        return np.nan

    x = (
        dates - dates.min()
    ).dt.total_seconds().to_numpy() / 86400.0

    y = values.to_numpy(dtype=float)

    if len(np.unique(x)) < 2:
        return np.nan

    return float(
        np.polyfit(x, y, 1)[0]
    )


def calculate_change(
    history: pd.DataFrame,
):

    if len(history) < 2:
        return np.nan, np.nan

    first_value = float(
        history.iloc[0]["value"]
    )

    latest_value = float(
        history.iloc[-1]["value"]
    )

    absolute_change = (
        latest_value - first_value
    )

    if abs(first_value) < 1e-12:
        relative_change = np.nan
    else:
        relative_change = (
            absolute_change / abs(first_value)
        )

    return absolute_change, relative_change


# ============================================================
# EMPTY FEATURE BLOCK
# ============================================================

def build_empty_feature_block(
    observation_name: str,
) -> Dict[str, float]:

    features = {}

    for suffix in FEATURE_SUFFIXES:

        column = (
            f"{observation_name}__{suffix}"
        )

        if suffix == "missing":
            features[column] = 1.0
        else:
            features[column] = np.nan

    return features


# ============================================================
# ONE OBSERVATION -> ONE FEATURE BLOCK
# ============================================================

def build_single_observation_features(
    observation_history: pd.DataFrame,
    reference_date: pd.Timestamp,
    observation_name: str,
) -> Dict[str, float]:

    if observation_history.empty:
        return build_empty_feature_block(
            observation_name
        )

    history = observation_history.copy()

    history["date"] = pd.to_datetime(
        history["date"],
        errors="coerce",
    )

    history["value"] = pd.to_numeric(
        history["value"],
        errors="coerce",
    )

    history = history.dropna(
        subset=["date", "value"]
    )

    if history.empty:
        return build_empty_feature_block(
            observation_name
        )

    reference_date = pd.to_datetime(
        reference_date,
        errors="coerce",
    )

    if pd.isna(reference_date):
        raise ValueError(
            "Invalid reference_date."
        )

    reference_date = pd.Timestamp(
        reference_date
    ).normalize()

    # Never use future observations.
    history = history[
        history["date"] <= reference_date
    ].copy()

    if history.empty:
        return build_empty_feature_block(
            observation_name
        )

    history = (
        history.sort_values("date")
        .reset_index(drop=True)
    )

    lookback_start = (
        reference_date
        - pd.Timedelta(days=int(FEATURE_LOOKBACK_DAYS))
    )

    short_lookback_start = (
        reference_date
        - pd.Timedelta(
            days=int(SHORT_FEATURE_LOOKBACK_DAYS)
        )
    )

    history_365 = history[
        history["date"] >= lookback_start
    ].copy()

    history_90 = history[
        history["date"] >= short_lookback_start
    ].copy()

    if history_365.empty:
        return build_empty_feature_block(
            observation_name
        )

    latest_row = history_365.iloc[-1]

    latest_value = float(
        latest_row["value"]
    )

    absolute_change, relative_change = (
        calculate_change(history_365)
    )

    slope_365 = calculate_linear_slope(
        history_365["date"],
        history_365["value"],
    )

    slope_90 = calculate_linear_slope(
        history_90["date"],
        history_90["value"],
    )

    days_since_latest = float(
        (
            reference_date
            - latest_row["date"]
        ).days
    )

    return {
        f"{observation_name}__latest":
            latest_value,

        f"{observation_name}__mean_365d":
            float(history_365["value"].mean()),

        f"{observation_name}__min_365d":
            float(history_365["value"].min()),

        f"{observation_name}__max_365d":
            float(history_365["value"].max()),

        f"{observation_name}__std_365d":
            (
                float(
                    history_365["value"].std(ddof=0)
                )
                if len(history_365) > 1
                else 0.0
            ),

        f"{observation_name}__mean_90d":
            (
                float(history_90["value"].mean())
                if not history_90.empty
                else np.nan
            ),

        f"{observation_name}__slope_365d":
            slope_365,

        f"{observation_name}__slope_90d":
            slope_90,

        f"{observation_name}__absolute_change_365d":
            absolute_change,

        f"{observation_name}__relative_change_365d":
            relative_change,

        f"{observation_name}__days_since_latest":
            days_since_latest,

        f"{observation_name}__missing":
            0.0,
    }


# ============================================================
# COMPLETE PATIENT FEATURE VECTOR
# INFERENCE
# ============================================================

def build_patient_features(
    observations: List[Dict[str, Any]],
    reference_date: Optional[Any] = None,
) -> Dict[str, float]:

    df = normalize_observations(observations)

    if reference_date is None:

        if df.empty:
            raise ValueError(
                "No valid supported observations were provided."
            )

        reference_date = df["date"].max()

    else:

        reference_date = pd.to_datetime(
            reference_date,
            errors="coerce",
        )

        if pd.isna(reference_date):
            raise ValueError(
                "Invalid reference_date."
            )

        reference_date = pd.Timestamp(
            reference_date
        ).normalize()

    features = {}

    # Every observation has a completely independent block.
    for observation_name in SUPPORTED_OBSERVATIONS:

        observation_history = df[
            df["description"] == observation_name
        ][["date", "value"]].copy()

        features.update(
            build_single_observation_features(
                observation_history=observation_history,
                reference_date=reference_date,
                observation_name=observation_name,
            )
        )

    return features


def build_patient_feature_dataframe(
    observations: List[Dict[str, Any]],
    reference_date: Optional[Any] = None,
) -> pd.DataFrame:

    return pd.DataFrame([
        build_patient_features(
            observations=observations,
            reference_date=reference_date,
        )
    ])


# ============================================================
# TRAINING DATA ADAPTER
# ============================================================

def build_features_from_observation_dataframe(
    patient_observations: pd.DataFrame,
    reference_date: Any,
) -> Dict[str, float]:

    required_columns = {
        "DATE",
        "DESCRIPTION",
        "VALUE",
    }

    missing_columns = (
        required_columns
        - set(patient_observations.columns)
    )

    if missing_columns:
        raise ValueError(
            f"Missing columns: "
            f"{sorted(missing_columns)}"
        )

    records = []

    for _, row in patient_observations.iterrows():

        records.append({
            "date": row["DATE"],
            "description": row["DESCRIPTION"],
            "value": row["VALUE"],
        })

    return build_patient_features(
        observations=records,
        reference_date=reference_date,
    )


# ============================================================
# TRAINING BATCH FEATURE BUILDER
#
# Uses the SAME build_single_observation_features() function
# as inference. Therefore training and inference feature
# definitions cannot drift apart.
# ============================================================

def build_training_feature_dataset(
    observations: pd.DataFrame,
    labeled_snapshots: pd.DataFrame,
    progress_every_patients: int = 100,
) -> pd.DataFrame:

    required_observation_columns = {
        "PATIENT",
        "DATE",
        "DESCRIPTION",
        "VALUE",
    }

    required_snapshot_columns = {
        "PATIENT",
        "SNAPSHOT_DATE",
        "LABEL",
    }

    missing_observation_columns = (
        required_observation_columns
        - set(observations.columns)
    )

    if missing_observation_columns:
        raise ValueError(
            "Observations missing columns: "
            f"{sorted(missing_observation_columns)}"
        )

    missing_snapshot_columns = (
        required_snapshot_columns
        - set(labeled_snapshots.columns)
    )

    if missing_snapshot_columns:
        raise ValueError(
            "Snapshots missing columns: "
            f"{sorted(missing_snapshot_columns)}"
        )

    # --------------------------------------------------------
    # CLEAN TRAINING OBSERVATIONS
    # --------------------------------------------------------

    obs = observations[
        [
            "PATIENT",
            "DATE",
            "DESCRIPTION",
            "VALUE",
        ]
    ].copy()

    obs["DATE"] = pd.to_datetime(
        obs["DATE"],
        errors="coerce",
    )

    # Remove timezone information consistently because the
    # inference engine uses normalized pandas timestamps.
    if getattr(
        obs["DATE"].dt,
        "tz",
        None
    ) is not None:
        obs["DATE"] = (
            obs["DATE"]
            .dt.tz_convert("UTC")
            .dt.tz_localize(None)
        )

    obs["VALUE"] = pd.to_numeric(
        obs["VALUE"],
        errors="coerce",
    )

    obs["DESCRIPTION"] = (
        obs["DESCRIPTION"]
        .apply(resolve_observation_name)
    )

    obs = obs.dropna(
        subset=[
            "PATIENT",
            "DATE",
            "DESCRIPTION",
            "VALUE",
        ]
    )

    # Same observation on same date -> median.
    # This exactly follows inference normalization.
    obs = (
        obs.groupby(
            ["PATIENT", "DATE", "DESCRIPTION"],
            as_index=False,
        )["VALUE"]
        .median()
    )

    obs = obs.sort_values(
        ["PATIENT", "DESCRIPTION", "DATE"]
    ).reset_index(drop=True)

    # --------------------------------------------------------
    # CLEAN SNAPSHOTS
    # --------------------------------------------------------

    snapshots = labeled_snapshots[
        [
            "PATIENT",
            "SNAPSHOT_DATE",
            "LABEL",
        ]
    ].copy()

    snapshots["SNAPSHOT_DATE"] = pd.to_datetime(
        snapshots["SNAPSHOT_DATE"],
        errors="coerce",
    )

    if getattr(
        snapshots["SNAPSHOT_DATE"].dt,
        "tz",
        None
    ) is not None:
        snapshots["SNAPSHOT_DATE"] = (
            snapshots["SNAPSHOT_DATE"]
            .dt.tz_convert("UTC")
            .dt.tz_localize(None)
        )

    snapshots["LABEL"] = pd.to_numeric(
        snapshots["LABEL"],
        errors="coerce",
    )

    snapshots = snapshots.dropna(
        subset=[
            "PATIENT",
            "SNAPSHOT_DATE",
            "LABEL",
        ]
    )

    snapshots["LABEL"] = (
        snapshots["LABEL"]
        .astype("int8")
    )

    snapshots = snapshots.sort_values(
        ["PATIENT", "SNAPSHOT_DATE"]
    ).reset_index(drop=True)

    # --------------------------------------------------------
    # PROCESS PATIENT BY PATIENT
    # --------------------------------------------------------

    snapshot_groups = {
        patient_id: group
        for patient_id, group in snapshots.groupby(
            "PATIENT",
            sort=False,
        )
    }

    observation_groups = {
        patient_id: group
        for patient_id, group in obs.groupby(
            "PATIENT",
            sort=False,
        )
    }

    patient_ids = list(
        snapshot_groups.keys()
    )

    total_patients = len(patient_ids)
    total_snapshots = len(snapshots)

    print("=" * 75)
    print("BUILDING TRAINING FEATURES")
    print("=" * 75)
    print(f"Patients: {total_patients:,}")
    print(f"Snapshots: {total_snapshots:,}")
    print(
        f"Expected features: "
        f"{len(get_feature_names())}"
    )
    print()

    rows = []

    for patient_number, patient_id in enumerate(
        patient_ids,
        start=1,
    ):

        patient_snapshots = snapshot_groups[
            patient_id
        ]

        patient_obs = observation_groups.get(
            patient_id
        )

        # Prepare observation histories once per patient.
        histories = {}

        if patient_obs is not None:

            for observation_name, group in (
                patient_obs.groupby(
                    "DESCRIPTION",
                    sort=False,
                )
            ):

                histories[observation_name] = (
                    group.rename(
                        columns={
                            "DATE": "date",
                            "VALUE": "value",
                        }
                    )[["date", "value"]]
                    .sort_values("date")
                    .reset_index(drop=True)
                )

        # Build every snapshot for this patient.
        for _, snapshot in patient_snapshots.iterrows():

            reference_date = (
                pd.Timestamp(
                    snapshot["SNAPSHOT_DATE"]
                ).normalize()
            )

            row = {
                "PATIENT": patient_id,
                "SNAPSHOT_DATE": reference_date,
                "LABEL": int(snapshot["LABEL"]),
            }

            for observation_name in (
                SUPPORTED_OBSERVATIONS
            ):

                observation_history = histories.get(
                    observation_name
                )

                if observation_history is None:

                    features = build_empty_feature_block(
                        observation_name
                    )

                else:

                    features = (
                        build_single_observation_features(
                            observation_history=
                                observation_history,
                            reference_date=
                                reference_date,
                            observation_name=
                                observation_name,
                        )
                    )

                row.update(features)

            rows.append(row)

        if (
            patient_number % progress_every_patients == 0
            or patient_number == total_patients
        ):
            print(
                f"Processed patients: "
                f"{patient_number:,}/{total_patients:,} | "
                f"Rows: {len(rows):,}"
            )

    # --------------------------------------------------------
    # FINAL DATAFRAME
    # --------------------------------------------------------

    feature_names = get_feature_names()

    result = pd.DataFrame(rows)

    expected_columns = (
        [
            "PATIENT",
            "SNAPSHOT_DATE",
            "LABEL",
        ]
        + feature_names
    )

    for column in expected_columns:

        if column not in result.columns:
            result[column] = np.nan

    result = result[
        expected_columns
    ]

    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    if len(result) != len(snapshots):
        raise RuntimeError(
            "Training feature row count mismatch. "
            f"Expected {len(snapshots):,}, "
            f"got {len(result):,}."
        )

    if len(feature_names) != (
        len(SUPPORTED_OBSERVATIONS)
        * len(FEATURE_SUFFIXES)
    ):
        raise RuntimeError(
            "Feature definition count mismatch."
        )

    if set(result["LABEL"].unique()) - {0, 1}:
        raise RuntimeError(
            "Invalid labels in result."
        )

    print()
    print("Training feature generation complete.")
    print(
        f"Final shape: {result.shape}"
    )
    print(
        f"Feature count: {len(feature_names)}"
    )

    return result


# ============================================================
# FEATURE ORDER
# ============================================================

def get_feature_names() -> List[str]:

    feature_names = []

    for observation_name in SUPPORTED_OBSERVATIONS:

        for suffix in FEATURE_SUFFIXES:

            feature_names.append(
                f"{observation_name}__{suffix}"
            )

    return feature_names


def align_feature_dataframe(
    feature_df: pd.DataFrame,
    feature_names: List[str],
) -> pd.DataFrame:

    aligned = feature_df.copy()

    for feature_name in feature_names:

        if feature_name not in aligned.columns:
            aligned[feature_name] = np.nan

    return aligned[feature_names]