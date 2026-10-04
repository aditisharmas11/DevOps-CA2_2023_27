from pathlib import Path
import torch


# ============================================================
# PROJECT PATHS
# ============================================================

# Example:
# C:\Users\yadav\Desktop\SEM 7\B-Tech Project\datasets\Module_2
BASE = Path(__file__).resolve().parent

# Preprocessed DDXPlus data
DATA_DIR = BASE / "module2_data_clean"

# Training outputs
RUNS_DIR = BASE / "runs"
CHECKPOINT_DIR = RUNS_DIR / "checkpoints"
RESULTS_DIR = RUNS_DIR / "results"


# Create output directories
RUNS_DIR.mkdir(parents=True, exist_ok=True)
CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# DATA
# ============================================================

NUM_CLASSES = 49
SEQUENCE_LENGTH = 49

# This should match the generated preprocessing vocabulary.
VOCAB_SIZE = 991


# ============================================================
# MODEL
# ============================================================

EMBED_DIM = 128

NUM_TRANSFORMER_LAYERS = 3

NUM_ATTENTION_HEADS = 4

FF_DIM = 256

DROPOUT = 0.10

# Small demographic feature embeddings.
SEX_EMBED_DIM = 16

AGE_HIDDEN_DIM = 32


# ============================================================
# TRAINING
# ============================================================

SEED = 42

BATCH_SIZE = 256

NUM_WORKERS = 0

LEARNING_RATE = 3e-4

WEIGHT_DECAY = 1e-4

EPOCHS = 5

GRAD_CLIP_NORM = 1.0

# Number of epochs without validation improvement
# before stopping.
EARLY_STOPPING_PATIENCE = 3


# ============================================================
# EXPERIMENT SIZE
# ============================================================

# None = use all training samples.
#
# For smoke test:
#     10_000
#
# For medium experiment:
#     100_000
#
# For final training:
#     None
MAX_TRAIN_SAMPLES = None

# We use the complete validation set even during smoke testing.
MAX_VALIDATION_SAMPLES = None


# ============================================================
# DEVICE
# ============================================================

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# ============================================================
# REPRODUCIBILITY
# ============================================================

DETERMINISTIC = False


# ============================================================
# LOGGING
# ============================================================

PRINT_EVERY_BATCHES = 100


# ============================================================
# CHECKPOINT
# ============================================================

BEST_CHECKPOINT_NAME = "best_model.pt"

LAST_CHECKPOINT_NAME = "last_model.pt"

AGE_STATS_NAME = "age_stats.json"

CONFIG_SNAPSHOT_NAME = "config_snapshot.json"