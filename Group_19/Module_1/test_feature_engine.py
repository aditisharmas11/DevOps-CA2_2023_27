from feature_engine import (
    build_patient_feature_dataframe,
    get_feature_names,
)

from trajectory import analyze_patient_trajectory


observations = [

    {"date": "2025-05-01", "description": "Glucose", "value": 195},
    {"date": "2025-08-01", "description": "Glucose", "value": 205},
    {"date": "2025-12-20", "description": "Glucose", "value": 218},
    {"date": "2026-06-01", "description": "Glucose", "value": 230},

    {
        "date": "2025-05-01",
        "description": "Hemoglobin A1c/Hemoglobin.total in Blood",
        "value": 8.3,
    },
    {
        "date": "2025-12-20",
        "description": "Hemoglobin A1c/Hemoglobin.total in Blood",
        "value": 8.7,
    },
    {
        "date": "2026-06-01",
        "description": "Hemoglobin A1c/Hemoglobin.total in Blood",
        "value": 9.0,
    },

    {"date": "2025-05-01", "description": "Creatinine", "value": 1.7},
    {"date": "2025-12-20", "description": "Creatinine", "value": 1.9},
    {"date": "2026-06-01", "description": "Creatinine", "value": 2.2},

    {
        "date": "2025-05-01",
        "description": "Glomerular filtration rate/1.73 sq M.predicted",
        "value": 48,
    },
    {
        "date": "2026-06-01",
        "description": "Glomerular filtration rate/1.73 sq M.predicted",
        "value": 35,
    },

    {
        "date": "2025-05-01",
        "description": "Systolic Blood Pressure",
        "value": 162,
    },
    {
        "date": "2025-12-20",
        "description": "Systolic Blood Pressure",
        "value": 168,
    },
    {
        "date": "2026-06-01",
        "description": "Systolic Blood Pressure",
        "value": 174,
    },

    {
        "date": "2025-05-01",
        "description": "Diastolic Blood Pressure",
        "value": 92,
    },
    {
        "date": "2026-06-01",
        "description": "Diastolic Blood Pressure",
        "value": 100,
    },

    {
        "date": "2025-05-01",
        "description": "Body Mass Index",
        "value": 33.8,
    },
    {
        "date": "2026-06-01",
        "description": "Body Mass Index",
        "value": 35.1,
    },

    {
        "date": "2025-05-01",
        "description": "Total Cholesterol",
        "value": 245,
    },
    {
        "date": "2026-06-01",
        "description": "Total Cholesterol",
        "value": 268,
    },
]


print("\n========== FEATURE ENGINE ==========\n")

feature_df = build_patient_feature_dataframe(
    observations
)

feature_names = get_feature_names()

print(
    "Expected feature count:",
    len(feature_names)
)

print(
    "Actual feature count:",
    feature_df.shape[1]
)

print(
    "Feature dataframe shape:",
    feature_df.shape
)

assert len(feature_names) == 348
assert feature_df.shape[1] == 348

print("\nFeature count check: PASSED")


print("\n========== PRESENT OBSERVATION FEATURES ==========\n")

present_observations = [
    "Body Mass Index",
    "Systolic Blood Pressure",
    "Diastolic Blood Pressure",
    "Total Cholesterol",
    "Glucose",
    "Hemoglobin A1c/Hemoglobin.total in Blood",
    "Creatinine",
    "Glomerular filtration rate/1.73 sq M.predicted",
]

for observation_name in present_observations:

    print(f"\n--- {observation_name} ---")

    for suffix in [
        "latest",
        "mean_365d",
        "slope_365d",
        "absolute_change_365d",
        "relative_change_365d",
        "missing",
    ]:

        column = f"{observation_name}__{suffix}"

        print(
            f"{suffix}: "
            f"{feature_df.iloc[0][column]}"
        )


print("\n========== TRAJECTORY ==========\n")

result = analyze_patient_trajectory(
    observations
)

print("Reference date:")
print(result["reference_date"])

print("\nOverall:")
print(result["overall"])

print("\nObservation results:")

for observation in result["observations"]:

    if observation["status"] not in {
        "NOT_AVAILABLE",
        "INSUFFICIENT_HISTORY",
    }:

        print(
            f"{observation['label']}: "
            f"{observation['status']} | "
            f"First={observation['first_value']} | "
            f"Latest={observation['latest_value']} | "
            f"Change={observation['absolute_change']} | "
            f"Confidence={observation['confidence']}"
        )