import os
import pandas as pd

from config import OBSERVATION_CONFIG

OBSERVATIONS_FILE = "data/raw/observations.csv"
ENCOUNTERS_FILE = "data/raw/encounters.csv"

OUTPUT_DIR = "data/artifacts"

LOOKBACK_DAYS = 365
LABEL_HORIZON_DAYS = 90


def print_section(title):
    print("\n" + "=" * 80)
    print(title)
    print("=" * 80)


def ensure_output_dir():
    os.makedirs(OUTPUT_DIR, exist_ok=True)


def load_observations():
    print_section("LOADING SELECTED 29 OBSERVATIONS")

    usecols = [
        "DATE",
        "PATIENT",
        "ENCOUNTER",
        "CODE",
        "DESCRIPTION",
        "VALUE",
        "UNITS",
        "TYPE",
    ]

    observations = pd.read_csv(
        OBSERVATIONS_FILE,
        usecols=usecols,
        low_memory=False,
    )

    observations = observations[
        observations["DESCRIPTION"].isin(OBSERVATION_CONFIG)
    ].copy()

    observations["DATE"] = pd.to_datetime(
        observations["DATE"],
        errors="coerce",
        utc=True,
    )

    observations["VALUE_NUMERIC"] = pd.to_numeric(
        observations["VALUE"],
        errors="coerce",
    )

    observations = observations.dropna(
        subset=["DATE", "PATIENT", "DESCRIPTION", "VALUE_NUMERIC"]
    ).copy()

    observations = observations.sort_values(
        ["PATIENT", "DATE", "DESCRIPTION"]
    ).reset_index(drop=True)

    print("Selected observation rows:", len(observations))
    print("Selected patients:", observations["PATIENT"].nunique())
    print(
        "Selected observation types:",
        observations["DESCRIPTION"].nunique()
    )
    print("Date range:", observations["DATE"].min(), "to", observations["DATE"].max())

    return observations


def audit_exact_duplicates(observations):
    print_section("1. EXACT DUPLICATE AUDIT")

    exact_columns = [
        "DATE",
        "PATIENT",
        "ENCOUNTER",
        "CODE",
        "DESCRIPTION",
        "VALUE",
        "UNITS",
        "TYPE",
    ]

    exact_duplicates_mask = observations.duplicated(
        subset=exact_columns,
        keep=False,
    )

    exact_duplicates = observations[
        exact_duplicates_mask
    ].copy()

    print("Rows involved in exact duplicates:", len(exact_duplicates))

    if len(exact_duplicates) > 0:
        duplicate_groups = (
            exact_duplicates
            .groupby(exact_columns, dropna=False)
            .size()
            .reset_index(name="duplicate_count")
            .sort_values("duplicate_count", ascending=False)
        )

        print("Exact duplicate groups:", len(duplicate_groups))
        print("\nTop 20 exact duplicate groups:")
        print(duplicate_groups.head(20).to_string(index=False))

        duplicate_groups.to_csv(
            f"{OUTPUT_DIR}/exact_duplicate_groups.csv",
            index=False,
        )

    else:
        print("No exact duplicates found.")

    return exact_duplicates


def audit_same_patient_date_description(observations):
    print_section("2. SAME PATIENT + DATE + DESCRIPTION AUDIT")

    group_columns = [
        "PATIENT",
        "DATE",
        "DESCRIPTION",
    ]

    group_sizes = (
        observations
        .groupby(group_columns)
        .size()
        .reset_index(name="row_count")
    )

    repeated_groups = group_sizes[
        group_sizes["row_count"] > 1
    ].copy()

    print("Repeated patient/date/description groups:", len(repeated_groups))

    if len(repeated_groups) == 0:
        print("No repeated groups found.")
        return

    print(
        "Total rows inside repeated groups:",
        repeated_groups["row_count"].sum()
    )

    repeated_groups = repeated_groups.sort_values(
        "row_count",
        ascending=False,
    )

    print("\nTop 20 repeated groups:")
    print(repeated_groups.head(20).to_string(index=False))

    repeated_groups.to_csv(
        f"{OUTPUT_DIR}/repeated_patient_date_description_groups.csv",
        index=False,
    )

    sample_groups = repeated_groups.head(10)[group_columns]

    sample_rows = observations.merge(
        sample_groups,
        on=group_columns,
        how="inner",
    ).sort_values(group_columns)

    print("\nSample rows from repeated groups:")
    print(sample_rows.to_string(index=False))


def audit_units(observations):
    print_section("3. UNIT CONSISTENCY AUDIT")

    rows = []

    for observation_name in OBSERVATION_CONFIG:

        subset = observations[
            observations["DESCRIPTION"] == observation_name
        ]

        unit_counts = (
            subset["UNITS"]
            .fillna("<MISSING>")
            .astype(str)
            .value_counts()
        )

        rows.append({
            "observation": observation_name,
            "rows": len(subset),
            "unique_units": len(unit_counts),
            "most_common_unit": (
                unit_counts.index[0]
                if len(unit_counts) > 0
                else None
            ),
            "most_common_unit_rows": (
                int(unit_counts.iloc[0])
                if len(unit_counts) > 0
                else 0
            ),
            "missing_unit_rows": int(
                subset["UNITS"].isna().sum()
            ),
        })

        print(f"\n--- {observation_name} ---")
        print(unit_counts.to_string())

    unit_audit = pd.DataFrame(rows)

    print_section("UNIT AUDIT SUMMARY")
    print(unit_audit.to_string(index=False))

    unit_audit.to_csv(
        f"{OUTPUT_DIR}/unit_audit.csv",
        index=False,
    )


def audit_outliers(observations):
    print_section("4. EXTREME VALUE / OUTLIER AUDIT")

    summary_rows = []

    for observation_name in OBSERVATION_CONFIG:

        subset = observations[
            observations["DESCRIPTION"] == observation_name
        ].copy()

        values = subset["VALUE_NUMERIC"]

        q01 = values.quantile(0.01)
        q05 = values.quantile(0.05)
        q25 = values.quantile(0.25)
        q50 = values.quantile(0.50)
        q75 = values.quantile(0.75)
        q95 = values.quantile(0.95)
        q99 = values.quantile(0.99)

        summary_rows.append({
            "observation": observation_name,
            "count": len(values),
            "min": values.min(),
            "q01": q01,
            "q05": q05,
            "median": q50,
            "q95": q95,
            "q99": q99,
            "max": values.max(),
        })

    outlier_summary = pd.DataFrame(summary_rows)

    print(outlier_summary.to_string(index=False))

    outlier_summary.to_csv(
        f"{OUTPUT_DIR}/observation_value_distribution.csv",
        index=False,
    )

    print_section("TOP 20 CREATININE VALUES")

    creatinine = observations[
        observations["DESCRIPTION"] == "Creatinine"
    ].copy()

    creatinine_top = creatinine.nlargest(
        20,
        "VALUE_NUMERIC",
    )[
        [
            "DATE",
            "PATIENT",
            "ENCOUNTER",
            "VALUE",
            "VALUE_NUMERIC",
            "UNITS",
        ]
    ]

    print(creatinine_top.to_string(index=False))

    creatinine_top.to_csv(
        f"{OUTPUT_DIR}/top_creatinine_values.csv",
        index=False,
    )


def audit_patient_history(observations):
    print_section("5. PATIENT HISTORY / SPARSITY AUDIT")

    patient_summary = (
        observations
        .groupby("PATIENT")
        .agg(
            first_date=("DATE", "min"),
            last_date=("DATE", "max"),
            total_rows=("DESCRIPTION", "size"),
            unique_observations=("DESCRIPTION", "nunique"),
        )
        .reset_index()
    )

    patient_summary["history_days"] = (
        patient_summary["last_date"]
        - patient_summary["first_date"]
    ).dt.total_seconds() / 86400.0

    print("Patients:", len(patient_summary))

    print("\nHistory duration statistics:")
    print(
        patient_summary["history_days"]
        .describe()
        .to_string()
    )

    print("\nUnique configured observations per patient:")
    print(
        patient_summary["unique_observations"]
        .describe()
        .to_string()
    )

    print("\nPatients by observation coverage:")

    coverage = (
        patient_summary["unique_observations"]
        .value_counts()
        .sort_index()
    )

    print(coverage.to_string())

    patients_with_365_days = (
        patient_summary["history_days"] >= LOOKBACK_DAYS
    ).sum()

    print(
        f"\nPatients with at least {LOOKBACK_DAYS} days history:",
        patients_with_365_days,
        "/",
        len(patient_summary),
    )

    patient_summary.to_csv(
        f"{OUTPUT_DIR}/patient_history_audit.csv",
        index=False,
    )

    return patient_summary


def load_encounters():
    print_section("LOADING ENCOUNTERS FOR LABEL BOUNDARY AUDIT")

    usecols = [
        "Id",
        "START",
        "STOP",
        "PATIENT",
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
        subset=["START", "PATIENT", "ENCOUNTERCLASS"]
    ).copy()

    encounters["ENCOUNTERCLASS_NORMALIZED"] = (
        encounters["ENCOUNTERCLASS"]
        .astype(str)
        .str.strip()
        .str.lower()
    )

    print("Encounter rows:", len(encounters))
    print("Encounter date range:", encounters["START"].min(), "to", encounters["START"].max())

    return encounters


def audit_label_boundary(encounters):
    print_section("6. 90-DAY LABEL FOLLOW-UP BOUNDARY AUDIT")

    last_encounter_date = encounters["START"].max()

    safe_snapshot_cutoff = (
        last_encounter_date
        - pd.Timedelta(days=LABEL_HORIZON_DAYS)
    )

    print("Last encounter date:", last_encounter_date)
    print("Label horizon days:", LABEL_HORIZON_DAYS)
    print("Latest safe snapshot date:", safe_snapshot_cutoff)

    acute_classes = {
        "emergency",
        "urgentcare",
    }

    acute_encounters = encounters[
        encounters["ENCOUNTERCLASS_NORMALIZED"].isin(
            acute_classes
        )
    ].copy()

    print("\nAcute encounter rows:", len(acute_encounters))
    print(
        "Patients with acute encounters:",
        acute_encounters["PATIENT"].nunique(),
    )

    print(
        "Acute encounter date range:",
        acute_encounters["START"].min(),
        "to",
        acute_encounters["START"].max(),
    )

    boundary_df = pd.DataFrame([{
        "last_encounter_date": last_encounter_date,
        "label_horizon_days": LABEL_HORIZON_DAYS,
        "latest_safe_snapshot_date": safe_snapshot_cutoff,
        "acute_encounter_rows": len(acute_encounters),
        "acute_patients": acute_encounters["PATIENT"].nunique(),
    }])

    boundary_df.to_csv(
        f"{OUTPUT_DIR}/label_boundary_audit.csv",
        index=False,
    )


def main():
    ensure_output_dir()

    observations = load_observations()

    audit_exact_duplicates(observations)

    audit_same_patient_date_description(observations)

    audit_units(observations)

    audit_outliers(observations)

    audit_patient_history(observations)

    encounters = load_encounters()

    audit_label_boundary(encounters)

    print_section("INTEGRITY AUDIT COMPLETE")

    print("Artifacts saved to:")
    print(OUTPUT_DIR)

    print("\nGenerated files:")

    for filename in sorted(os.listdir(OUTPUT_DIR)):
        print("-", filename)


if __name__ == "__main__":
    main()