import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from typing import Optional

import json
import numpy as np
import torch
from torch.utils.data import Dataset

import config


# ============================================================
# HELPERS
# ============================================================

def load_npy(
    path: Path,
    dtype: Optional[np.dtype] = None,
):
    """
    Load a .npy file using mmap_mode='r'.

    This is important for the large DDXPlus dataset because
    we do not want to copy the complete arrays into RAM.
    """

    if not path.exists():
        raise FileNotFoundError(
            f"Required dataset file not found:\n{path}"
        )

    array = np.load(
        path,
        mmap_mode="r",
    )

    if dtype is not None:
        # Do not call astype here unnecessarily because
        # that would create another complete array.
        if array.dtype != dtype:
            raise TypeError(
                f"Unexpected dtype for {path.name}: "
                f"expected {dtype}, found {array.dtype}"
            )

    return array


# ============================================================
# DATASET
# ============================================================

class DDXPlusDataset(Dataset):

    def __init__(
        self,
        split: str,
        data_dir: Path = config.DATA_DIR,
        max_samples: Optional[int] = None,
        seed: int = config.SEED,
        age_mean: Optional[float] = None,
        age_std: Optional[float] = None,
    ):

        if split not in {
            "train",
            "validation",
            "test",
        }:
            raise ValueError(
                "split must be one of: "
                "train, validation, test"
            )

        self.split = split

        split_dir = (
            Path(data_dir) / split
        )

        if not split_dir.exists():
            raise FileNotFoundError(
                f"Split directory not found:\n{split_dir}"
            )

        # ----------------------------------------------------
        # Load arrays
        # ----------------------------------------------------

        self.input_ids = load_npy(
            split_dir / "input_ids.npy"
        )

        self.attention_mask = load_npy(
            split_dir / "attention_mask.npy"
        )

        self.age = load_npy(
            split_dir / "age.npy"
        )

        self.sex = load_npy(
            split_dir / "sex.npy"
        )

        self.pathology_labels = load_npy(
            split_dir / "pathology_labels.npy"
        )

        self.initial_evidence = load_npy(
            split_dir / "initial_evidence.npy"
        )

        self.differential_targets = load_npy(
            split_dir / "differential_targets.npy"
        )

        # ----------------------------------------------------
        # Shape validation
        # ----------------------------------------------------

        n = self.input_ids.shape[0]

        if self.input_ids.shape != (
            n,
            config.SEQUENCE_LENGTH,
        ):
            raise ValueError(
                f"Unexpected input_ids shape: "
                f"{self.input_ids.shape}"
            )

        if self.attention_mask.shape != (
            n,
            config.SEQUENCE_LENGTH,
        ):
            raise ValueError(
                f"Unexpected attention_mask shape: "
                f"{self.attention_mask.shape}"
            )

        if self.age.shape != (n,):
            raise ValueError(
                f"Unexpected age shape: "
                f"{self.age.shape}"
            )

        if self.sex.shape != (n,):
            raise ValueError(
                f"Unexpected sex shape: "
                f"{self.sex.shape}"
            )

        if self.pathology_labels.shape != (n,):
            raise ValueError(
                "Unexpected pathology_labels shape: "
                f"{self.pathology_labels.shape}"
            )

        if self.initial_evidence.shape != (n,):
            raise ValueError(
                "Unexpected initial_evidence shape: "
                f"{self.initial_evidence.shape}"
            )

        if self.differential_targets.shape != (
            n,
            config.NUM_CLASSES,
        ):
            raise ValueError(
                "Unexpected differential_targets shape: "
                f"{self.differential_targets.shape}"
            )

        # ----------------------------------------------------
        # Label validation
        # ----------------------------------------------------

        label_min = int(
            self.pathology_labels.min()
        )

        label_max = int(
            self.pathology_labels.max()
        )

        if label_min < 0 or label_max >= config.NUM_CLASSES:
            raise ValueError(
                f"Pathology labels out of range: "
                f"{label_min}..{label_max}"
            )

        # ----------------------------------------------------
        # Optional deterministic subsampling
        # ----------------------------------------------------

        self.indices = None

        if (
            max_samples is not None
            and max_samples < n
        ):

            rng = np.random.RandomState(seed)

            self.indices = np.sort(
                rng.choice(
                    n,
                    size=max_samples,
                    replace=False,
                )
            )

        self.n = (
            len(self.indices)
            if self.indices is not None
            else n
        )

        # ----------------------------------------------------
        # Age normalization
        # ----------------------------------------------------

        self.age_mean = age_mean
        self.age_std = age_std

        if self.age_mean is None:
            self.age_mean = 0.0

        if self.age_std is None:
            self.age_std = 1.0

        if self.age_std <= 0:
            raise ValueError(
                f"age_std must be positive, "
                f"got {self.age_std}"
            )

    # ========================================================
    # LENGTH
    # ========================================================

    def __len__(self):
        return self.n

    # ========================================================
    # INDEX
    # ========================================================

    def _real_index(self, idx: int) -> int:

        if self.indices is None:
            return idx

        return int(
            self.indices[idx]
        )

    # ========================================================
    # ITEM
    # ========================================================

    def __getitem__(self, idx: int):

        real_idx = self._real_index(idx)

        input_ids = np.asarray(
            self.input_ids[real_idx],
            dtype=np.int64,
        )

        attention_mask = np.asarray(
            self.attention_mask[real_idx],
            dtype=np.int64,
        )

        age = float(
            self.age[real_idx]
        )

        age_normalized = (
            age - self.age_mean
        ) / self.age_std

        sex = int(
            self.sex[real_idx]
        )

        pathology_label = int(
            self.pathology_labels[
                real_idx
            ]
        )

        return {
            "input_ids": torch.from_numpy(
                input_ids
            ),

            "attention_mask": torch.from_numpy(
                attention_mask
            ),

            "age": torch.tensor(
                age_normalized,
                dtype=torch.float32,
            ),

            "sex": torch.tensor(
                sex,
                dtype=torch.long,
            ),

            "pathology_label": torch.tensor(
                pathology_label,
                dtype=torch.long,
            ),
        }


# ============================================================
# AGE STATISTICS
# ============================================================

def calculate_training_age_stats(
    data_dir: Path = config.DATA_DIR,
) -> tuple[float, float]:

    """
    Calculate age mean/std using ONLY the training split.

    These statistics must then be reused for validation and test.
    """

    path = (
        Path(data_dir)
        / "train"
        / "age.npy"
    )

    if not path.exists():
        raise FileNotFoundError(
            f"Training age file not found:\n{path}"
        )

    ages = np.load(
        path,
        mmap_mode="r",
    )

    mean = float(
        np.mean(ages)
    )

    std = float(
        np.std(ages)
    )

    if std <= 0:
        raise ValueError(
            f"Training age standard deviation "
            f"is not positive: {std}"
        )

    return mean, std


# ============================================================
# DATASET SELF TEST
# ============================================================

if __name__ == "__main__":

    print("=" * 80)
    print("DDXPLUS DATASET SELF TEST")
    print("=" * 80)

    mean, std = calculate_training_age_stats()

    print(
        f"Training age mean: {mean:.4f}"
    )

    print(
        f"Training age std : {std:.4f}"
    )

    dataset = DDXPlusDataset(
        split="train",
        max_samples=10,
        age_mean=mean,
        age_std=std,
    )

    print(
        f"Dataset length: {len(dataset)}"
    )

    sample = dataset[0]

    for key, value in sample.items():

        print(
            f"{key:20s} "
            f"shape={tuple(value.shape)} "
            f"dtype={value.dtype}"
        )

    print()
    print("✓ Dataset self-test passed.")