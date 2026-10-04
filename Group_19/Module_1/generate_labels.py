import os
import pandas as pd


# ============================================================
# PATHS
# ============================================================

SNAPSHOTS_FILE = "data/processed/snapshots.parquet"
ENCOUNTERS_FILE = "data/raw/encounters.csv"

PROCESSED_DIR = "data/processed"
OUTPUT_FILE = f"{PROCESSED_DIR}/training_snapshots_labeled.parquet"


# ============================================================
# SETTINGS
# ============================================================

LABEL_HORIZON_DAYS = pd.Timedelta(days=90)
# Removes the suspicious/ancient Synthea snapshots such as 1923.
# We keep a large modern training period while avoiding extremely
# old historical snapshots.
TRAINING_START_DATE = pd.Timestamp("2010-01-01", tz="UTC")

ACUTE_ENCOUNTER_CLASSES = {
    "emergency",
    "urgentcare",
}


# ============================================================
# HELPERS
# ============================================================

def print_section(title):
    print("\n" + "=" * 75)
    print(title)
    print("=" * 75)


# ============================================================
# LOAD SNAPSHOTS
# ============================================================

def load_snapshots():
    print_section("LOADING SNAPSHOTS")

    snapshots = pd.read_parquet(SNAPSHOTS_FILE)

    snapshots["SNAPSHOT_DATE"] = pd.to_datetime(
        snapshots["SNAPSHOT_DATE"],
        errors="coerce",
        utc=True,
    )

    snapshots = snapshots.dropna(
        subset=["PATIENT", "SNAPSHOT_DATE"]
    ).copy()

    print("Candidate snapshots:", len(snapshots))
    print("Candidate patients:", snapshots["PATIENT"].nunique())
    print(
        "Original snapshot range:",
        snapshots["SNAPSHOT_DATE"].min(),
        "to",
        snapshots["SNAPSHOT_DATE"].max(),
    )

    return snapshots


# ============================================================
# FILTER TRAINING PERIOD
# ============================================================

def filter_training_period(snapshots):
    print_section("FILTERING TRAINING PERIOD")

    before = len(snapshots)

    snapshots = snapshots[
        snapshots["SNAPSHOT_DATE"] >= TRAINING_START_DATE
    ].copy()

    removed = before - len(snapshots)

    print("Training start date:", TRAINING_START_DATE)
    print("Snapshots removed:", removed)
    print("Snapshots retained:", len(snapshots))
    print("Patients retained:", snapshots["PATIENT"].nunique())

    if snapshots.empty:
        raise RuntimeError(
            "No snapshots remain after the training date filter."
        )

    print(
        "Final snapshot range:",
        snapshots["SNAPSHOT_DATE"].min(),
        "to",
        snapshots["SNAPSHOT_DATE"].max(),
    )

    return snapshots


# ============================================================
# LOAD ACUTE ENCOUNTERS
# ============================================================

def load_acute_encounters():
    print_section("LOADING ACUTE ENCOUNTERS")

    usecols = [
        "PATIENT",
        "START",
        "ENCOUNTERCLASS",
    ]

    encounters = pd.read_csv(
        ENCOUNTERS_FILE,
        usecols=usecols,
        low_memory=False,
    )

    encounters["START"] = pd.to_datetime(
        encounters["START"],
        errors="coerce",
        utc=True,
    )

    encounters = encounters.dropna(
        subset=["PATIENT", "START", "ENCOUNTERCLASS"]
    ).copy()

    encounters["ENCOUNTERCLASS"] = (
        encounters["ENCOUNTERCLASS"]
        .astype(str)
        .str.strip()
        .str.lower()
    )

    acute_encounters = encounters[
        encounters["ENCOUNTERCLASS"].isin(
            ACUTE_ENCOUNTER_CLASSES
        )
    ].copy()

    acute_encounters = acute_encounters[
        ["PATIENT", "START", "ENCOUNTERCLASS"]
    ].sort_values(
        ["PATIENT", "START"]
    ).reset_index(drop=True)

    print("Total encounters loaded:", len(encounters))
    print("Acute encounters:", len(acute_encounters))
    print("Patients with acute encounters:",
          acute_encounters["PATIENT"].nunique())

    print(
        "Acute encounter range:",
        acute_encounters["START"].min(),
        "to",
        acute_encounters["START"].max(),
    )

    return acute_encounters


# ============================================================
# GENERATE LABELS
# ============================================================

def generate_labels(snapshots, acute_encounters):
    """
    LABEL = 1 if the patient has at least one emergency or urgentcare
    encounter strictly AFTER the snapshot and within the next 90 days.

    Window:
        SNAPSHOT_DATE < ACUTE_EVENT_DATE <= SNAPSHOT_DATE + 90 days
    """

    print_section("GENERATING 90-DAY ACUTE EVENT LABELS")

    snapshots = snapshots.copy()

    snapshots["WINDOW_END"] = (
        snapshots["SNAPSHOT_DATE"] + LABEL_HORIZON_DAYS
    )

    # Make sure both sides remain timezone-aware UTC timestamps
    snapshots["SNAPSHOT_DATE"] = pd.to_datetime(
        snapshots["SNAPSHOT_DATE"],
        utc=True,
        errors="coerce",
    )

    snapshots["WINDOW_END"] = pd.to_datetime(
        snapshots["WINDOW_END"],
        utc=True,
        errors="coerce",
    )

    acute_encounters = acute_encounters.copy()

    acute_encounters["START"] = pd.to_datetime(
        acute_encounters["START"],
        utc=True,
        errors="coerce",
    )

    # Remove invalid dates just in case
    snapshots = snapshots.dropna(
        subset=["SNAPSHOT_DATE", "WINDOW_END"]
    ).copy()

    acute_encounters = acute_encounters.dropna(
        subset=["PATIENT", "START"]
    ).copy()

    # --------------------------------------------------------
    # Build sorted timezone-aware event arrays per patient
    # --------------------------------------------------------

    acute_by_patient = {
        patient_id: group["START"].sort_values().tolist()
        for patient_id, group in acute_encounters.groupby("PATIENT")
    }

    labels = []
    future_event_dates = []

    total = len(snapshots)

    # --------------------------------------------------------
    # Label each snapshot
    # --------------------------------------------------------

    for count, (_, row) in enumerate(
        snapshots.iterrows(),
        start=1,
    ):

        patient_id = row["PATIENT"]
        snapshot_date = row["SNAPSHOT_DATE"]
        window_end = row["WINDOW_END"]

        patient_events = acute_by_patient.get(patient_id)

        label = 0
        first_future_event_date = pd.NaT

        if patient_events:

            # Since events are sorted, find the first event
            # strictly AFTER the snapshot.
            for event_date in patient_events:

                if event_date <= snapshot_date:
                    continue

                # First future event found.
                # If it falls inside the 90-day window,
                # this snapshot is positive.
                if event_date <= window_end:
                    label = 1
                    first_future_event_date = event_date

                # Either way, this is the first future event,
                # so no later event can be the "first".
                break

        labels.append(label)
        future_event_dates.append(first_future_event_date)

        if count % 50000 == 0:
            print(f"Processed {count:,}/{total:,} snapshots")

    snapshots["LABEL"] = pd.Series(
        labels,
        index=snapshots.index,
        dtype="int8",
    )

    snapshots["FIRST_FUTURE_ACUTE_EVENT_DATE"] = (
        future_event_dates
    )

    snapshots = snapshots.drop(
        columns=["WINDOW_END"]
    )

    print("\nLabel generation complete.")

    return snapshots

# ============================================================
# LABEL SUMMARY
# ============================================================

def print_label_summary(labeled_snapshots):
    print_section("LABEL SUMMARY")

    total = len(labeled_snapshots)

    positive = int(
        labeled_snapshots["LABEL"].sum()
    )

    negative = total - positive

    positive_rate = (
        positive / total
        if total > 0
        else 0
    )

    print("Total snapshots:", total)
    print("Positive labels (1):", positive)
    print("Negative labels (0):", negative)
    print(f"Positive rate: {positive_rate:.4%}")

    print(
        "\nPatients with at least one positive snapshot:",
        labeled_snapshots.loc[
            labeled_snapshots["LABEL"] == 1,
            "PATIENT"
        ].nunique()
    )

    print(
        "Total patients:",
        labeled_snapshots["PATIENT"].nunique()
    )

    print("\nLabel distribution:")
    print(
        labeled_snapshots["LABEL"]
        .value_counts()
        .sort_index()
    )


# ============================================================
# SAVE
# ============================================================

def save_output(labeled_snapshots):
    print_section("SAVING LABELED TRAINING SNAPSHOTS")

    os.makedirs(PROCESSED_DIR, exist_ok=True)

    labeled_snapshots.to_parquet(
        OUTPUT_FILE,
        index=False,
    )

    print("Saved:")
    print(OUTPUT_FILE)


# ============================================================
# MAIN
# ============================================================

def main():

    snapshots = load_snapshots()

    snapshots = filter_training_period(
        snapshots
    )

    acute_encounters = load_acute_encounters()

    labeled_snapshots = generate_labels(
        snapshots,
        acute_encounters,
    )

    print_label_summary(
        labeled_snapshots
    )

    save_output(
        labeled_snapshots
    )

    print_section("LABEL GENERATION COMPLETE")

    print(
        "Output is ready for feature generation and model training."
    )


if __name__ == "__main__":
    main()