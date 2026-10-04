import os
import numpy as np
import pandas as pd

from feature_engine import (
    build_training_feature_dataset,
    get_feature_names,
)


# ============================================================
# PATHS
# ============================================================

OBSERVATIONS_PATH = (
    "data/processed/observations_cleaned.parquet"
)

SNAPSHOTS_PATH = (
    "data/processed/training_snapshots_labeled.parquet"
)

OUTPUT_PATH = (
    "data/processed/training_dataset.parquet"
)


# ============================================================
# SAMPLING CONFIGURATION
# ============================================================

# Keep every positive snapshot.
# For negatives, aim for approximately this many negatives
# for every positive example.
NEGATIVE_TO_POSITIVE_RATIO = 3

# Prevent patients with very long histories from dominating
# the negative class.
MAX_NEGATIVE_SNAPSHOTS_PER_PATIENT = 12

# Reproducible selection.
RANDOM_SEED = 42


# ============================================================
# SELECT REPRESENTATIVE NEGATIVE SNAPSHOTS
# ============================================================

def select_negative_snapshots(
    negatives: pd.DataFrame,
    positives: pd.DataFrame,
) -> pd.DataFrame:

    rng = np.random.default_rng(RANDOM_SEED)

    selected_parts = []

    positive_counts = (
        positives.groupby("PATIENT")
        .size()
        .to_dict()
    )

    total_positive = len(positives)

    global_target_negatives = min(
        len(negatives),
        total_positive * NEGATIVE_TO_POSITIVE_RATIO,
    )

    print()
    print("=" * 75)
    print("SELECTING REPRESENTATIVE NEGATIVE SNAPSHOTS")
    print("=" * 75)

    print(f"Available negatives: {len(negatives):,}")
    print(f"Positive snapshots:  {total_positive:,}")
    print(
        f"Target negatives:    "
        f"{global_target_negatives:,}"
    )

    # --------------------------------------------------------
    # PATIENT-WISE TEMPORAL SAMPLING
    #
    # Select negatives across the patient's timeline rather
    # than simply selecting consecutive or random rows.
    # --------------------------------------------------------

    grouped = negatives.groupby(
        "PATIENT",
        sort=False,
    )

    for patient_id, patient_negatives in grouped:

        patient_negatives = (
            patient_negatives
            .sort_values("SNAPSHOT_DATE")
            .copy()
        )

        available = len(patient_negatives)

        patient_positive_count = int(
            positive_counts.get(patient_id, 0)
        )

        # Patients with positives get more representative
        # negative states, but every patient can contribute.
        if patient_positive_count > 0:

            target = min(
                available,
                max(
                    3,
                    patient_positive_count
                    * NEGATIVE_TO_POSITIVE_RATIO,
                ),
                MAX_NEGATIVE_SNAPSHOTS_PER_PATIENT,
            )

        else:

            # Patients with no positive event still provide
            # important low-risk examples.
            target = min(
                available,
                3,
            )

        if target >= available:

            selected_parts.append(
                patient_negatives
            )

            continue

        # ----------------------------------------------------
        # TEMPORAL COVERAGE
        #
        # Divide the patient's negative timeline into evenly
        # distributed positions. This retains early, middle,
        # and recent patient states.
        # ----------------------------------------------------

        positions = np.linspace(
            0,
            available - 1,
            num=target,
        )

        positions = np.round(
            positions
        ).astype(int)

        positions = np.unique(positions)

        selected = patient_negatives.iloc[
            positions
        ].copy()

        # Safety: if rounding produced fewer positions,
        # randomly fill remaining slots.
        remaining_needed = target - len(selected)

        if remaining_needed > 0:

            remaining_indices = np.setdiff1d(
                patient_negatives.index.to_numpy(),
                selected.index.to_numpy(),
            )

            if len(remaining_indices) > 0:

                extra_indices = rng.choice(
                    remaining_indices,
                    size=min(
                        remaining_needed,
                        len(remaining_indices),
                    ),
                    replace=False,
                )

                extra = patient_negatives.loc[
                    extra_indices
                ]

                selected = pd.concat(
                    [selected, extra],
                    ignore_index=False,
                )

        selected_parts.append(selected)

    selected_negatives = pd.concat(
        selected_parts,
        ignore_index=True,
    )

    # --------------------------------------------------------
    # GLOBAL LIMIT
    # --------------------------------------------------------

    # Patient-wise sampling can exceed the global target.
    # If so, perform balanced random selection.
    if len(selected_negatives) > global_target_negatives:

        selected_negatives = (
            selected_negatives
            .sample(
                n=global_target_negatives,
                random_state=RANDOM_SEED,
            )
            .copy()
        )

    selected_negatives = (
        selected_negatives
        .sort_values(
            ["PATIENT", "SNAPSHOT_DATE"]
        )
        .reset_index(drop=True)
    )

    print()
    print(
        f"Selected negatives: "
        f"{len(selected_negatives):,}"
    )

    print(
        f"Negative reduction: "
        f"{len(negatives):,} -> "
        f"{len(selected_negatives):,}"
    )

    return selected_negatives


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 75)
    print("MODULE 1 - BUILDING OPTIMIZED TRAINING DATASET")
    print("=" * 75)

    # --------------------------------------------------------
    # CHECK INPUT FILES
    # --------------------------------------------------------

    if not os.path.exists(OBSERVATIONS_PATH):
        raise FileNotFoundError(
            f"Observations file not found:\n"
            f"{OBSERVATIONS_PATH}"
        )

    if not os.path.exists(SNAPSHOTS_PATH):
        raise FileNotFoundError(
            f"Snapshots file not found:\n"
            f"{SNAPSHOTS_PATH}"
        )

    # --------------------------------------------------------
    # LOAD OBSERVATIONS
    # --------------------------------------------------------

    print()
    print("LOADING CLEANED OBSERVATIONS")
    print("-" * 75)

    observations = pd.read_parquet(
        OBSERVATIONS_PATH
    )

    print(
        f"Rows: {len(observations):,}"
    )

    print(
        f"Patients: "
        f"{observations['PATIENT'].nunique():,}"
    )

    # --------------------------------------------------------
    # LOAD SNAPSHOTS
    # --------------------------------------------------------

    print()
    print("LOADING LABELED SNAPSHOTS")
    print("-" * 75)

    snapshots = pd.read_parquet(
        SNAPSHOTS_PATH
    )

    snapshots["SNAPSHOT_DATE"] = pd.to_datetime(
        snapshots["SNAPSHOT_DATE"],
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
        .astype(int)
    )

    print(
        f"Original snapshots: "
        f"{len(snapshots):,}"
    )

    print()

    print("Original label distribution:")

    print(
        snapshots["LABEL"]
        .value_counts()
        .sort_index()
    )

    # --------------------------------------------------------
    # SEPARATE CLASSES
    # --------------------------------------------------------

    positives = snapshots[
        snapshots["LABEL"] == 1
    ].copy()

    negatives = snapshots[
        snapshots["LABEL"] == 0
    ].copy()

    # --------------------------------------------------------
    # KEEP ALL POSITIVES
    # --------------------------------------------------------

    print()
    print("=" * 75)
    print("KEEPING ALL POSITIVE SNAPSHOTS")
    print("=" * 75)

    print(
        f"Positive snapshots kept: "
        f"{len(positives):,}"
    )

    # --------------------------------------------------------
    # SELECT NEGATIVES
    # --------------------------------------------------------

    selected_negatives = (
        select_negative_snapshots(
            negatives=negatives,
            positives=positives,
        )
    )

    # --------------------------------------------------------
    # COMBINE FINAL SNAPSHOTS
    # --------------------------------------------------------

    training_snapshots = pd.concat(
        [
            positives,
            selected_negatives,
        ],
        ignore_index=True,
    )

    training_snapshots = (
        training_snapshots
        .sort_values(
            ["PATIENT", "SNAPSHOT_DATE"]
        )
        .reset_index(drop=True)
    )

    print()
    print("=" * 75)
    print("FINAL SELECTED SNAPSHOTS")
    print("=" * 75)

    print(
        f"Total: "
        f"{len(training_snapshots):,}"
    )

    print()

    print("Label distribution:")

    print(
        training_snapshots["LABEL"]
        .value_counts()
        .sort_index()
    )

    positive_rate = (
        training_snapshots["LABEL"].mean()
        * 100
    )

    print()
    print(
        f"Positive rate: "
        f"{positive_rate:.2f}%"
    )

    # --------------------------------------------------------
    # BUILD FEATURES
    # --------------------------------------------------------

    print()
    print("=" * 75)
    print("GENERATING 348 FEATURES")
    print("=" * 75)

    training_dataset = (
        build_training_feature_dataset(
            observations=observations,
            labeled_snapshots=training_snapshots,
            progress_every_patients=100,
        )
    )

    # --------------------------------------------------------
    # VALIDATE
    # --------------------------------------------------------

    print()
    print("=" * 75)
    print("VALIDATING DATASET")
    print("=" * 75)

    feature_names = get_feature_names()

    if len(feature_names) != 348:
        raise RuntimeError(
            f"Expected 348 features, "
            f"found {len(feature_names)}."
        )

    if len(training_dataset) != len(training_snapshots):
        raise RuntimeError(
            "Row count mismatch after feature generation."
        )

    missing_features = [
        feature
        for feature in feature_names
        if feature not in training_dataset.columns
    ]

    if missing_features:
        raise RuntimeError(
            "Missing feature columns:\n"
            + "\n".join(missing_features)
        )

    print(
        f"Rows: {len(training_dataset):,}"
    )

    print(
        f"Features: {len(feature_names)}"
    )

    print(
        f"Total columns: "
        f"{len(training_dataset.columns)}"
    )

    print("Validation: PASSED")

    # --------------------------------------------------------
    # SAVE
    # --------------------------------------------------------

    print()
    print("=" * 75)
    print("SAVING DATASET")
    print("=" * 75)

    os.makedirs(
        os.path.dirname(OUTPUT_PATH),
        exist_ok=True,
    )

    training_dataset.to_parquet(
        OUTPUT_PATH,
        index=False,
    )

    print()
    print(
        f"Saved:\n{OUTPUT_PATH}"
    )

    print()
    print("=" * 75)
    print("TRAINING DATASET COMPLETE")
    print("=" * 75)

    print(
        f"Final shape: "
        f"{training_dataset.shape}"
    )


if __name__ == "__main__":
    main()