import os
import pandas as pd

from config import OBSERVATION_CONFIG


# ============================================================
# PATHS
# ============================================================

OBSERVATIONS_FILE = "data/raw/observations.csv"
ENCOUNTERS_FILE = "data/raw/encounters.csv"

PROCESSED_DIR = "data/processed"

CLEANED_OBSERVATIONS_FILE = (
    f"{PROCESSED_DIR}/observations_cleaned.parquet"
)

SNAPSHOTS_FILE = (
    f"{PROCESSED_DIR}/snapshots.parquet"
)


# ============================================================
# SETTINGS
# ============================================================

LABEL_HORIZON_DAYS = 90
SNAPSHOT_INTERVAL_DAYS = 90

MIN_HISTORY_DAYS = 90


# ============================================================
# CONFIGURATION
# ============================================================

SUPPORTED_OBSERVATIONS = list(OBSERVATION_CONFIG.keys())


# ============================================================
# HELPERS
# ============================================================

def print_section(title):
    print("\n" + "=" * 75)
    print(title)
    print("=" * 75)


def ensure_directories():
    os.makedirs(PROCESSED_DIR, exist_ok=True)


# ============================================================
# FIND SAFE LABEL CUTOFF
# ============================================================

def get_safe_snapshot_cutoff():
    """
    Finds the latest snapshot date for which we have a complete
    future LABEL_HORIZON_DAYS follow-up window.
    """

    print_section("FINDING SAFE SNAPSHOT CUTOFF")

    encounters = pd.read_csv(
        ENCOUNTERS_FILE,
        usecols=["START"],
        low_memory=False,
    )

    encounters["START"] = pd.to_datetime(
        encounters["START"],
        errors="coerce",
        utc=True,
    )

    encounters = encounters.dropna(subset=["START"])

    last_encounter_date = encounters["START"].max()

    safe_cutoff = (
        last_encounter_date
        - pd.Timedelta(days=LABEL_HORIZON_DAYS)
    )

    print("Last encounter date:", last_encounter_date)
    print("Label horizon:", LABEL_HORIZON_DAYS, "days")
    print("Latest safe snapshot date:", safe_cutoff)

    return safe_cutoff


# ============================================================
# LOAD ONLY THE REQUIRED OBSERVATIONS
# ============================================================

def load_supported_observations():
    """
    Loads only columns needed by Module 1 and keeps only the
    29 supported observations.
    """

    print_section("LOADING SUPPORTED OBSERVATIONS")

    usecols = [
        "DATE",
        "PATIENT",
        "DESCRIPTION",
        "VALUE",
        "UNITS",
    ]

    observations = pd.read_csv(
        OBSERVATIONS_FILE,
        usecols=usecols,
        low_memory=False,
    )

    print("Raw rows loaded:", len(observations))

    observations = observations[
        observations["DESCRIPTION"].isin(SUPPORTED_OBSERVATIONS)
    ].copy()

    print("Rows after selecting supported observations:", len(observations))
    print("Patients:", observations["PATIENT"].nunique())
    print("Observation types:", observations["DESCRIPTION"].nunique())

    return observations


# ============================================================
# CLEAN OBSERVATIONS
# ============================================================

def clean_observations(observations):
    """
    Creates the reusable cleaned longitudinal observation dataset.

    Rules:
    1. Invalid dates are removed.
    2. Non-numeric values are removed.
    3. Exact duplicate rows are removed.
    4. Multiple values for the same patient, timestamp and
       observation are aggregated using their mean.
    """

    print_section("CLEANING OBSERVATIONS")

    starting_rows = len(observations)

    # -----------------------------
    # Parse dates
    # -----------------------------

    observations["DATE"] = pd.to_datetime(
        observations["DATE"],
        errors="coerce",
        utc=True,
    )

    invalid_dates = observations["DATE"].isna().sum()

    observations = observations.dropna(
        subset=["DATE", "PATIENT", "DESCRIPTION"]
    ).copy()

    print("Invalid dates removed:", invalid_dates)

    # -----------------------------
    # Convert values
    # -----------------------------

    observations["VALUE"] = pd.to_numeric(
        observations["VALUE"],
        errors="coerce",
    )

    invalid_values = observations["VALUE"].isna().sum()

    observations = observations.dropna(
        subset=["VALUE"]
    ).copy()

    print("Invalid numeric values removed:", invalid_values)

    # -----------------------------
    # Remove exact duplicates
    # -----------------------------

    before_exact_dedup = len(observations)

    observations = observations.drop_duplicates(
        subset=[
            "PATIENT",
            "DATE",
            "DESCRIPTION",
            "VALUE",
            "UNITS",
        ]
    ).copy()

    exact_duplicates_removed = (
        before_exact_dedup - len(observations)
    )

    print(
        "Exact duplicates removed:",
        exact_duplicates_removed
    )

    # -----------------------------
    # Normalize unit representation
    # -----------------------------

    observations["UNITS"] = (
        observations["UNITS"]
        .fillna("")
        .astype(str)
        .str.strip()
    )

    # -----------------------------
    # Aggregate same timestamp
    # -----------------------------
    #
    # We use the mean when multiple measurements exist for the
    # exact same patient + timestamp + observation + unit.
    #
    # This prevents duplicate records from giving one timestamp
    # disproportionate influence.
    # -----------------------------

    before_timestamp_aggregation = len(observations)

    cleaned = (
        observations
        .groupby(
            [
                "PATIENT",
                "DATE",
                "DESCRIPTION",
                "UNITS",
            ],
            as_index=False,
        )
        .agg(
            VALUE=("VALUE", "mean")
        )
    )

    rows_collapsed = (
        before_timestamp_aggregation - len(cleaned)
    )

    print(
        "Rows collapsed at identical timestamps:",
        rows_collapsed
    )

    # -----------------------------
    # Final sorting
    # -----------------------------

    cleaned = cleaned.sort_values(
        [
            "PATIENT",
            "DATE",
            "DESCRIPTION",
        ]
    ).reset_index(drop=True)

    print("\nCleaning summary")
    print("Starting rows:", starting_rows)
    print("Final rows:", len(cleaned))
    print("Rows removed/collapsed:", starting_rows - len(cleaned))
    print("Final patients:", cleaned["PATIENT"].nunique())
    print(
        "Final observation types:",
        cleaned["DESCRIPTION"].nunique()
    )

    return cleaned


# ============================================================
# GENERATE SNAPSHOTS
# ============================================================

def generate_snapshots(cleaned, safe_cutoff):
    """
    Generates controlled patient-level snapshots.

    Snapshot rules:
    - Start after MIN_HISTORY_DAYS of available history.
    - One snapshot every SNAPSHOT_INTERVAL_DAYS.
    - Never go beyond safe_cutoff.
    - Snapshot dates are based on each patient's actual timeline.
    - Sparse observations are fully supported.
    """

    print_section("GENERATING SNAPSHOTS")

    patient_ranges = (
        cleaned
        .groupby("PATIENT")
        .agg(
            first_date=("DATE", "min"),
            last_observation_date=("DATE", "max"),
            observation_rows=("DESCRIPTION", "size"),
            unique_observations=("DESCRIPTION", "nunique"),
        )
        .reset_index()
    )

    snapshot_rows = []

    total_patients = len(patient_ranges)

    for index, row in patient_ranges.iterrows():

        patient_id = row["PATIENT"]
        first_date = row["first_date"]

        # We cannot create a snapshot after either:
        # 1. the patient's final available observation
        # 2. the global safe label cutoff
        last_possible_date = min(
            row["last_observation_date"],
            safe_cutoff,
        )

        first_snapshot_date = (
            first_date
            + pd.Timedelta(days=MIN_HISTORY_DAYS)
        )

        if first_snapshot_date > last_possible_date:
            continue

        snapshot_dates = pd.date_range(
            start=first_snapshot_date,
            end=last_possible_date,
            freq=f"{SNAPSHOT_INTERVAL_DAYS}D",
        )

        for snapshot_date in snapshot_dates:

            snapshot_rows.append({
                "PATIENT": patient_id,
                "SNAPSHOT_DATE": snapshot_date,
                "FIRST_OBSERVATION_DATE": first_date,
                "LAST_AVAILABLE_OBSERVATION_DATE": (
                    row["last_observation_date"]
                ),
                "UNIQUE_OBSERVATIONS_AVAILABLE": (
                    row["unique_observations"]
                ),
                "TOTAL_OBSERVATION_ROWS": (
                    row["observation_rows"]
                ),
            })

        if (index + 1) % 1000 == 0:
            print(
                f"Processed {index + 1:,}/{total_patients:,} patients"
            )

    snapshots = pd.DataFrame(snapshot_rows)

    if snapshots.empty:
        raise RuntimeError(
            "No snapshots were generated. "
            "Check the date ranges and history settings."
        )

    snapshots = snapshots.sort_values(
        ["PATIENT", "SNAPSHOT_DATE"]
    ).reset_index(drop=True)

    snapshots["HISTORY_DAYS_AT_SNAPSHOT"] = (
        snapshots["SNAPSHOT_DATE"]
        - snapshots["FIRST_OBSERVATION_DATE"]
    ).dt.total_seconds() / 86400.0

    print("Total snapshots:", len(snapshots))
    print("Patients with snapshots:", snapshots["PATIENT"].nunique())
    print(
        "Snapshots per patient:"
    )
    print(
        snapshots
        .groupby("PATIENT")
        .size()
        .describe()
    )

    print(
        "\nSnapshot date range:",
        snapshots["SNAPSHOT_DATE"].min(),
        "to",
        snapshots["SNAPSHOT_DATE"].max(),
    )

    return snapshots


# ============================================================
# SAVE OUTPUTS
# ============================================================

def save_outputs(cleaned, snapshots):
    print_section("SAVING PROCESSED DATA")

    cleaned.to_parquet(
        CLEANED_OBSERVATIONS_FILE,
        index=False,
    )

    snapshots.to_parquet(
        SNAPSHOTS_FILE,
        index=False,
    )

    print("Saved:")
    print("-", CLEANED_OBSERVATIONS_FILE)
    print("-", SNAPSHOTS_FILE)


# ============================================================
# MAIN
# ============================================================

def main():

    ensure_directories()

    safe_cutoff = get_safe_snapshot_cutoff()

    observations = load_supported_observations()

    cleaned = clean_observations(observations)

    snapshots = generate_snapshots(
        cleaned,
        safe_cutoff,
    )

    save_outputs(
        cleaned,
        snapshots,
    )

    print_section("PREPARATION COMPLETE")

    print(
        "Module 1 cleaned longitudinal data and snapshot "
        "candidates are ready."
    )


if __name__ == "__main__":
    main()