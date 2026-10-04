from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from config import (
    OBSERVATION_CONFIG,
    SUPPORTED_OBSERVATIONS,
    TRAJECTORY_LOOKBACK_DAYS,
    MIN_HISTORY_POINTS_FOR_TREND,
    TRAJECTORY_RELATIVE_CHANGE_THRESHOLD,
    TRAJECTORY_MIN_SUPPORTED_SIGNALS,
)

from feature_engine import normalize_observations


# ============================================================
# HELPERS
# ============================================================

def calculate_relative_change(
    first_value: float,
    latest_value: float,
) -> float:

    if abs(first_value) < 1e-12:
        return np.nan

    return float(
        (latest_value - first_value)
        / abs(first_value)
    )


def calculate_slope(
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

    return float(np.polyfit(x, y, 1)[0])


# ============================================================
# SINGLE OBSERVATION ANALYSIS
# ============================================================

def analyze_single_observation(
    observation_history: pd.DataFrame,
    observation_name: str,
    reference_date: pd.Timestamp,
) -> Dict[str, Any]:

    config = OBSERVATION_CONFIG[observation_name]

    result = {
        "observation": observation_name,
        "label": config["label"],
        "status": "NOT_AVAILABLE",
        "direction_of_concern":
            config["direction_of_concern"],
        "first_value": None,
        "latest_value": None,
        "absolute_change": None,
        "relative_change": None,
        "slope_per_day": None,
        "days_covered": 0,
        "data_points": 0,
        "confidence": "NONE",
        "trajectory_score": 0.0,
    }

    if observation_history.empty:
        return result

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
        return result

    reference_date = pd.Timestamp(
        reference_date
    ).normalize()

    start_date = (
        reference_date
        - pd.Timedelta(
            days=TRAJECTORY_LOOKBACK_DAYS
        )
    )

    history = history[
        (history["date"] >= start_date)
        & (history["date"] <= reference_date)
    ].copy()

    if history.empty:
        return result

    history = (
        history
        .sort_values("date")
        .reset_index(drop=True)
    )

    data_points = len(history)

    first_row = history.iloc[0]
    latest_row = history.iloc[-1]

    first_value = float(first_row["value"])
    latest_value = float(latest_row["value"])

    absolute_change = latest_value - first_value

    relative_change = calculate_relative_change(
        first_value,
        latest_value,
    )

    days_covered = int(
        (latest_row["date"] - first_row["date"]).days
    )

    slope = calculate_slope(
        history["date"],
        history["value"],
    )

    result.update({
        "first_value": first_value,
        "latest_value": latest_value,
        "absolute_change": absolute_change,
        "relative_change": (
            float(relative_change)
            if np.isfinite(relative_change)
            else None
        ),
        "slope_per_day": (
            float(slope)
            if np.isfinite(slope)
            else None
        ),
        "days_covered": days_covered,
        "data_points": data_points,
    })

    # ========================================================
    # INSUFFICIENT HISTORY
    # ========================================================

    if (
        data_points < MIN_HISTORY_POINTS_FOR_TREND
        or days_covered <= 0
    ):
        result["status"] = "INSUFFICIENT_HISTORY"
        result["confidence"] = "LOW"

        return result

    # ========================================================
    # CONFIDENCE
    # ========================================================

    if data_points >= 3 and days_covered >= 90:
        result["confidence"] = "HIGH"

    elif data_points >= 2 and days_covered >= 30:
        result["confidence"] = "MEDIUM"

    else:
        result["confidence"] = "LOW"

    # ========================================================
    # MEANINGFUL CHANGE
    # ========================================================

    min_absolute_change = (
        config["min_absolute_change"]
    )

    absolute_change_meaningful = (
        abs(absolute_change)
        >= min_absolute_change
    )

    relative_change_meaningful = (
        np.isfinite(relative_change)
        and abs(relative_change)
        >= TRAJECTORY_RELATIVE_CHANGE_THRESHOLD
    )

    meaningful_change = (
        absolute_change_meaningful
        and relative_change_meaningful
    )

    # ========================================================
    # STABLE
    # ========================================================

    if not meaningful_change:

        result["status"] = "STABLE"
        result["trajectory_score"] = 0.0

        return result

    direction = config["direction_of_concern"]

    # ========================================================
    # HIGHER VALUE = MORE CONCERNING
    # ========================================================

    if direction == "higher_worse":

        if absolute_change > 0:
            result["status"] = "WORSENING"
            result["trajectory_score"] = 1.0
        else:
            result["status"] = "IMPROVING"
            result["trajectory_score"] = -1.0

        return result

    # ========================================================
    # LOWER VALUE = MORE CONCERNING
    # ========================================================

    if direction == "lower_worse":

        if absolute_change < 0:
            result["status"] = "WORSENING"
            result["trajectory_score"] = 1.0
        else:
            result["status"] = "IMPROVING"
            result["trajectory_score"] = -1.0

        return result

    # ========================================================
    # NEUTRAL
    # ========================================================

    result["status"] = "CHANGING_NEUTRAL"
    result["trajectory_score"] = 0.0

    return result


# ============================================================
# ALL OBSERVATIONS
# ============================================================

def analyze_all_observations(
    observations: List[Dict[str, Any]],
    reference_date: Optional[Any] = None,
) -> Dict[str, Any]:

    normalized_df = normalize_observations(
        observations
    )

    if normalized_df.empty:
        return {
            "reference_date": None,
            "observation_results": [],
        }

    if reference_date is None:

        reference_date = normalized_df["date"].max()

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

    results = []

    for observation_name in SUPPORTED_OBSERVATIONS:

        history = normalized_df[
            normalized_df["description"]
            == observation_name
        ][["date", "value"]].copy()

        result = analyze_single_observation(
            observation_history=history,
            observation_name=observation_name,
            reference_date=reference_date,
        )

        results.append(result)

    return {
        "reference_date": str(
            pd.Timestamp(reference_date).date()
        ),
        "observation_results": results,
    }


# ============================================================
# OVERALL TRAJECTORY
# ============================================================

def calculate_overall_trajectory(
    observation_results: List[Dict[str, Any]]
) -> Dict[str, Any]:

    usable = [
        result
        for result in observation_results
        if result["status"] in {
            "WORSENING",
            "IMPROVING",
            "STABLE",
        }
    ]

    if len(usable) < TRAJECTORY_MIN_SUPPORTED_SIGNALS:

        return {
            "status": "INSUFFICIENT_DATA",
            "confidence": "LOW",
            "directional_signals_used": len(usable),
            "worsening_count": 0,
            "improving_count": 0,
            "stable_count": 0,
            "neutral_changing_count": 0,
            "score": None,
            "summary": (
                "Not enough observation history "
                "to determine overall trajectory."
            ),
        }

    confidence_weights = {
        "HIGH": 1.0,
        "MEDIUM": 0.7,
        "LOW": 0.4,
    }

    weighted_score = 0.0
    total_weight = 0.0

    worsening_count = 0
    improving_count = 0
    stable_count = 0

    for result in usable:

        status = result["status"]

        if status == "WORSENING":
            worsening_count += 1
        elif status == "IMPROVING":
            improving_count += 1
        elif status == "STABLE":
            stable_count += 1

        weight = confidence_weights.get(
            result["confidence"],
            0.4,
        )

        weighted_score += (
            result["trajectory_score"] * weight
        )

        total_weight += weight

    normalized_score = (
        weighted_score / total_weight
        if total_weight > 0
        else 0.0
    )

    if normalized_score >= 0.25:
        overall_status = "WORSENING"
    elif normalized_score <= -0.25:
        overall_status = "IMPROVING"
    else:
        overall_status = "STABLE"

    high_count = sum(
        1
        for result in usable
        if result["confidence"] == "HIGH"
    )

    if len(usable) >= 5 and high_count >= 3:
        overall_confidence = "HIGH"
    elif len(usable) >= 3:
        overall_confidence = "MEDIUM"
    else:
        overall_confidence = "LOW"

    neutral_changing_count = sum(
        1
        for result in observation_results
        if result["status"] == "CHANGING_NEUTRAL"
    )

    return {
        "status": overall_status,
        "confidence": overall_confidence,
        "directional_signals_used": len(usable),
        "worsening_count": worsening_count,
        "improving_count": improving_count,
        "stable_count": stable_count,
        "neutral_changing_count":
            neutral_changing_count,
        "score": round(float(normalized_score), 3),
        "summary": (
            f"{worsening_count} worsening, "
            f"{improving_count} improving, "
            f"{stable_count} stable directional signals."
        ),
    }


# ============================================================
# PUBLIC FUNCTION
# ============================================================

def analyze_patient_trajectory(
    observations: List[Dict[str, Any]],
    reference_date: Optional[Any] = None,
) -> Dict[str, Any]:

    analysis = analyze_all_observations(
        observations=observations,
        reference_date=reference_date,
    )

    observation_results = (
        analysis["observation_results"]
    )

    overall = calculate_overall_trajectory(
        observation_results
    )

    return {
        "reference_date": analysis["reference_date"],
        "overall": overall,
        "observations": observation_results,
    }