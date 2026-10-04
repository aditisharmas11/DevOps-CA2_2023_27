from pathlib import Path


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

DATA_DIR = BASE_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
ARTIFACTS_DIR = DATA_DIR / "artifacts"
MODELS_DIR = BASE_DIR / "models"

OBSERVATIONS_CSV = RAW_DATA_DIR / "observations.csv"
ENCOUNTERS_CSV = RAW_DATA_DIR / "encounters.csv"

TRAINING_DATASET = PROCESSED_DATA_DIR / "observation_training_dataset.parquet"

MODEL_FILE = MODELS_DIR / "acute_event_model.json"
CALIBRATOR_FILE = MODELS_DIR / "calibrator.pkl"
MODEL_INFO_FILE = MODELS_DIR / "model_info.json"
FEATURE_NAMES_FILE = MODELS_DIR / "feature_names.json"


# ============================================================
# FEATURE WINDOWS
# ============================================================

# Used ONLY by the ML feature engine.
FEATURE_LOOKBACK_DAYS = 365
SHORT_FEATURE_LOOKBACK_DAYS = 90

# Used ONLY by trajectory analysis.
# Kept separate from ML features intentionally.
TRAJECTORY_LOOKBACK_DAYS = 730

MIN_HISTORY_POINTS_FOR_TREND = 2


# ============================================================
# FUTURE LABEL WINDOW
# ============================================================

PREDICTION_WINDOW_DAYS = 90
SNAPSHOT_INTERVAL_DAYS = 90
MIN_HISTORY_DAYS = 180

ACUTE_ENCOUNTER_CLASSES = {
    "emergency",
    "urgentcare",
}


# ============================================================
# EXACT 29 OBSERVATIONS
#
# These are the observations supported by Module 1.
#
# Important:
# - CBC expansion is intentionally excluded.
# - Extra protein / globulin observations are excluded.
# - Every observation is processed independently.
# ============================================================

OBSERVATION_CONFIG = {

    # ========================================================
    # VITAL SIGNS / BODY MEASUREMENTS (6)
    # ========================================================

    "Body Mass Index": {
        "label": "BMI",
        "unit": "kg/m²",
        "direction_of_concern": "higher_worse",
        "aliases": ["body mass index", "bmi"],
        "plausibility_range": (5, 100),
        "min_absolute_change": 0.3,
    },

    "Body Weight": {
        "label": "Body weight",
        "unit": "kg",
        "direction_of_concern": "neutral",
        "aliases": ["body weight", "weight"],
        "plausibility_range": (1, 500),
        "min_absolute_change": 1.0,
    },

    "Systolic Blood Pressure": {
        "label": "Systolic blood pressure",
        "unit": "mmHg",
        "direction_of_concern": "higher_worse",
        "aliases": [
            "systolic blood pressure",
            "systolic bp",
            "sbp",
        ],
        "plausibility_range": (40, 300),
        "min_absolute_change": 3.0,
    },

    "Diastolic Blood Pressure": {
        "label": "Diastolic blood pressure",
        "unit": "mmHg",
        "direction_of_concern": "higher_worse",
        "aliases": [
            "diastolic blood pressure",
            "diastolic bp",
            "dbp",
        ],
        "plausibility_range": (20, 200),
        "min_absolute_change": 2.0,
    },

    "Heart rate": {
        "label": "Heart rate",
        "unit": "bpm",
        "direction_of_concern": "neutral",
        "aliases": ["heart rate", "pulse"],
        "plausibility_range": (20, 250),
        "min_absolute_change": 5.0,
    },

    "Respiratory rate": {
        "label": "Respiratory rate",
        "unit": "breaths/min",
        "direction_of_concern": "neutral",
        "aliases": [
            "respiratory rate",
            "respiration rate",
            "breathing rate",
        ],
        "plausibility_range": (4, 80),
        "min_absolute_change": 2.0,
    },


    # ========================================================
    # LIPID PROFILE (4)
    # ========================================================

    "High Density Lipoprotein Cholesterol": {
        "label": "HDL cholesterol",
        "unit": "mg/dL",
        "direction_of_concern": "lower_worse",
        "aliases": [
            "high density lipoprotein cholesterol",
            "hdl cholesterol",
            "hdl",
        ],
        "plausibility_range": (1, 200),
        "min_absolute_change": 3.0,
    },

    "Low Density Lipoprotein Cholesterol": {
        "label": "LDL cholesterol",
        "unit": "mg/dL",
        "direction_of_concern": "higher_worse",
        "aliases": [
            "low density lipoprotein cholesterol",
            "ldl cholesterol",
            "ldl",
        ],
        "plausibility_range": (1, 500),
        "min_absolute_change": 5.0,
    },

    "Triglycerides": {
        "label": "Triglycerides",
        "unit": "mg/dL",
        "direction_of_concern": "higher_worse",
        "aliases": [
            "triglycerides",
            "triglyceride",
        ],
        "plausibility_range": (1, 2000),
        "min_absolute_change": 10.0,
    },

    "Total Cholesterol": {
        "label": "Total cholesterol",
        "unit": "mg/dL",
        "direction_of_concern": "higher_worse",
        "aliases": [
            "total cholesterol",
            "cholesterol total",
        ],
        "plausibility_range": (20, 1000),
        "min_absolute_change": 5.0,
    },


    # ========================================================
    # GLUCOSE / DIABETES (2)
    # ========================================================

    "Glucose": {
        "label": "Blood glucose",
        "unit": "mg/dL",
        "direction_of_concern": "higher_worse",
        "aliases": [
            "glucose",
            "blood glucose",
            "serum glucose",
        ],
        "plausibility_range": (20, 1000),
        "min_absolute_change": 5.0,
    },

    "Hemoglobin A1c/Hemoglobin.total in Blood": {
        "label": "HbA1c",
        "unit": "%",
        "direction_of_concern": "higher_worse",
        "aliases": [
            "hemoglobin a1c",
            "hba1c",
            "glycated hemoglobin",
            "hemoglobin a1c/hemoglobin.total in blood",
        ],
        "plausibility_range": (2, 25),
        "min_absolute_change": 0.2,
    },


    # ========================================================
    # ELECTROLYTES / METABOLIC (5)
    # ========================================================

    "Potassium": {
        "label": "Potassium",
        "unit": "mmol/L",
        "direction_of_concern": "neutral",
        "aliases": [
            "potassium",
            "serum potassium",
        ],
        "plausibility_range": (1, 10),
        "min_absolute_change": 0.3,
    },

    "Calcium": {
        "label": "Calcium",
        "unit": "mg/dL",
        "direction_of_concern": "neutral",
        "aliases": [
            "calcium",
            "serum calcium",
        ],
        "plausibility_range": (3, 20),
        "min_absolute_change": 0.3,
    },

    "Sodium": {
        "label": "Sodium",
        "unit": "mmol/L",
        "direction_of_concern": "neutral",
        "aliases": [
            "sodium",
            "serum sodium",
        ],
        "plausibility_range": (100, 180),
        "min_absolute_change": 2.0,
    },

    "Carbon Dioxide": {
        "label": "Carbon dioxide / bicarbonate",
        "unit": "mmol/L",
        "direction_of_concern": "neutral",
        "aliases": [
            "carbon dioxide",
            "bicarbonate",
            "co2",
        ],
        "plausibility_range": (5, 60),
        "min_absolute_change": 2.0,
    },

    "Chloride": {
        "label": "Chloride",
        "unit": "mmol/L",
        "direction_of_concern": "neutral",
        "aliases": [
            "chloride",
            "serum chloride",
        ],
        "plausibility_range": (60, 150),
        "min_absolute_change": 2.0,
    },


    # ========================================================
    # KIDNEY FUNCTION (3)
    # ========================================================

    "Creatinine": {
        "label": "Creatinine",
        "unit": "mg/dL",
        "direction_of_concern": "higher_worse",
        "aliases": [
            "creatinine",
            "serum creatinine",
        ],
        "plausibility_range": (0.1, 30),
        "min_absolute_change": 0.1,
    },

    "Urea Nitrogen": {
        "label": "Urea nitrogen / BUN",
        "unit": "mg/dL",
        "direction_of_concern": "higher_worse",
        "aliases": [
            "urea nitrogen",
            "bun",
            "blood urea nitrogen",
        ],
        "plausibility_range": (1, 300),
        "min_absolute_change": 2.0,
    },

    "Glomerular filtration rate/1.73 sq M.predicted": {
        "label": "eGFR",
        "unit": "mL/min/1.73 m²",
        "direction_of_concern": "lower_worse",
        "aliases": [
            "glomerular filtration rate",
            "egfr",
            "estimated glomerular filtration rate",
            "glomerular filtration rate/1.73 sq m.predicted",
        ],
        "plausibility_range": (1, 250),
        "min_absolute_change": 3.0,
    },


    # ========================================================
    # LIVER FUNCTION (5)
    # ========================================================

    "Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma": {
        "label": "AST",
        "unit": "U/L",
        "direction_of_concern": "higher_worse",
        "aliases": [
            "ast",
            "aspartate aminotransferase",
        ],
        "plausibility_range": (1, 5000),
        "min_absolute_change": 5.0,
    },

    "Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma": {
        "label": "ALT",
        "unit": "U/L",
        "direction_of_concern": "higher_worse",
        "aliases": [
            "alt",
            "alanine aminotransferase",
        ],
        "plausibility_range": (1, 5000),
        "min_absolute_change": 5.0,
    },

    "Alkaline phosphatase [Enzymatic activity/volume] in Serum or Plasma": {
        "label": "Alkaline phosphatase",
        "unit": "U/L",
        "direction_of_concern": "higher_worse",
        "aliases": [
            "alkaline phosphatase",
            "alp",
        ],
        "plausibility_range": (1, 5000),
        "min_absolute_change": 10.0,
    },

    "Bilirubin.total [Mass/volume] in Serum or Plasma": {
        "label": "Total bilirubin",
        "unit": "mg/dL",
        "direction_of_concern": "higher_worse",
        "aliases": [
            "total bilirubin",
            "bilirubin",
        ],
        "plausibility_range": (0.01, 100),
        "min_absolute_change": 0.2,
    },

    "Albumin [Mass/volume] in Serum or Plasma": {
        "label": "Albumin",
        "unit": "g/dL",
        "direction_of_concern": "lower_worse",
        "aliases": [
            "albumin",
            "serum albumin",
        ],
        "plausibility_range": (0.5, 10),
        "min_absolute_change": 0.2,
    },


    # ========================================================
    # CBC (4)
    #
    # Only the core four are retained.
    # ========================================================

    "Hemoglobin [Mass/volume] in Blood": {
        "label": "Hemoglobin",
        "unit": "g/dL",
        "direction_of_concern": "neutral",
        "aliases": [
            "hemoglobin",
            "haemoglobin",
        ],
        "plausibility_range": (1, 25),
        "min_absolute_change": 0.5,
    },

    "Hematocrit [Volume Fraction] of Blood by Automated count": {
        "label": "Hematocrit",
        "unit": "%",
        "direction_of_concern": "neutral",
        "aliases": [
            "hematocrit",
            "haematocrit",
        ],
        "plausibility_range": (5, 80),
        "min_absolute_change": 2.0,
    },

    "Leukocytes [#/volume] in Blood by Automated count": {
        "label": "Leukocytes",
        "unit": "10³/µL",
        "direction_of_concern": "neutral",
        "aliases": [
            "leukocytes",
            "white blood cells",
            "wbc",
        ],
        "plausibility_range": (0.1, 100),
        "min_absolute_change": 1.0,
    },

    "Platelets [#/volume] in Blood by Automated count": {
        "label": "Platelets",
        "unit": "10³/µL",
        "direction_of_concern": "neutral",
        "aliases": [
            "platelets",
            "platelet count",
        ],
        "plausibility_range": (1, 2000),
        "min_absolute_change": 20.0,
    },
}


# ============================================================
# DERIVED CONFIGURATION
# ============================================================

SUPPORTED_OBSERVATIONS = list(OBSERVATION_CONFIG.keys())

# Safety check: exactly 29 observations.
if len(SUPPORTED_OBSERVATIONS) != 29:
    raise RuntimeError(
        f"Expected exactly 29 observations, found "
        f"{len(SUPPORTED_OBSERVATIONS)}."
    )


OBSERVATION_ALIASES = {}

for canonical_name, info in OBSERVATION_CONFIG.items():

    OBSERVATION_ALIASES[canonical_name.lower()] = canonical_name

    for alias in info["aliases"]:
        OBSERVATION_ALIASES[alias.lower()] = canonical_name


# ============================================================
# TRAJECTORY SETTINGS
# ============================================================

TRAJECTORY_RELATIVE_CHANGE_THRESHOLD = 0.03
TRAJECTORY_MIN_SUPPORTED_SIGNALS = 2


# ============================================================
# MODEL SETTINGS
# ============================================================

RANDOM_STATE = 42

TEST_SIZE = 0.15
VALIDATION_SIZE = 0.15

XGBOOST_PARAMS = {
    "n_estimators": 500,
    "max_depth": 5,
    "learning_rate": 0.03,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "eval_metric": "logloss",
    "random_state": RANDOM_STATE,
}


# ============================================================
# RISK DISPLAY THRESHOLDS
# ============================================================

RISK_THRESHOLDS = {
    "low_max": 0.15,
    "elevated_max": 0.30,
    "high_max": 0.50,
}