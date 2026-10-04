from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from torch.utils.data import DataLoader

import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import config
from dataset import DDXPlusDataset
from model import MediTwinSymptomClassifier


# ============================================================
# CONFIG
# ============================================================

CHECKPOINT_PATH = (
    config.CHECKPOINT_DIR
    / config.BEST_CHECKPOINT_NAME
)

BATCH_SIZE = config.BATCH_SIZE

DEVICE = config.DEVICE


# ============================================================
# LOAD AGE STATISTICS
# ============================================================

def load_age_stats():

    path = (
        config.RUNS_DIR
        / config.AGE_STATS_NAME
    )

    if not path.exists():
        raise FileNotFoundError(
            f"Age statistics not found:\n{path}"
        )

    with open(
        path,
        "r",
        encoding="utf-8",
    ) as f:
        stats = json.load(f)

    return (
        float(stats["mean"]),
        float(stats["std"]),
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 80)
    print("MEDI TWIN - MODULE 2 TEST EVALUATION")
    print("=" * 80)

    print(
        f"Checkpoint:\n{CHECKPOINT_PATH}"
    )

    print(
        f"Device: {DEVICE}"
    )

    if not CHECKPOINT_PATH.exists():
        raise FileNotFoundError(
            f"Checkpoint not found:\n"
            f"{CHECKPOINT_PATH}"
        )

    # --------------------------------------------------------
    # Age stats
    # --------------------------------------------------------

    age_mean, age_std = load_age_stats()

    print()
    print(
        f"Training age mean: {age_mean:.6f}"
    )

    print(
        f"Training age std : {age_std:.6f}"
    )

    # --------------------------------------------------------
    # Test dataset
    # --------------------------------------------------------

    print()
    print("=" * 80)
    print("LOADING TEST DATA")
    print("=" * 80)

    test_dataset = DDXPlusDataset(
        split="test",
        max_samples=None,
        age_mean=age_mean,
        age_std=age_std,
    )

    print(
        f"Test samples: {len(test_dataset):,}"
    )

    test_loader = DataLoader(
        test_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=config.NUM_WORKERS,
        pin_memory=torch.cuda.is_available(),
    )

    # --------------------------------------------------------
    # Model
    # --------------------------------------------------------

    print()
    print("=" * 80)
    print("LOADING MODEL")
    print("=" * 80)

    model = MediTwinSymptomClassifier()

    checkpoint = torch.load(
        CHECKPOINT_PATH,
        map_location=DEVICE,
    )

    model.load_state_dict(
        checkpoint["model_state_dict"]
    )

    model = model.to(DEVICE)

    model.eval()

    checkpoint_epoch = checkpoint.get(
        "epoch",
        None,
    )

    print(
        f"Checkpoint epoch: {checkpoint_epoch}"
    )

    # --------------------------------------------------------
    # Evaluation
    # --------------------------------------------------------

    all_targets = []
    all_predictions = []
    all_probabilities = []

    total_loss = 0.0
    total_examples = 0

    criterion = torch.nn.CrossEntropyLoss()

    print()
    print("=" * 80)
    print("RUNNING TEST EVALUATION")
    print("=" * 80)

    with torch.no_grad():

        for batch_idx, batch in enumerate(
            test_loader,
            start=1,
        ):

            input_ids = (
                batch["input_ids"]
                .to(DEVICE)
            )

            attention_mask = (
                batch["attention_mask"]
                .to(DEVICE)
            )

            age = (
                batch["age"]
                .to(DEVICE)
            )

            sex = (
                batch["sex"]
                .to(DEVICE)
            )

            targets = (
                batch["pathology_label"]
                .to(DEVICE)
            )

            logits = model(
                input_ids=input_ids,
                attention_mask=attention_mask,
                age=age,
                sex=sex,
            )

            loss = criterion(
                logits,
                targets,
            )

            batch_size = targets.size(0)

            total_loss += (
                loss.item()
                * batch_size
            )

            total_examples += batch_size

            probabilities = torch.softmax(
                logits,
                dim=1,
            )

            predictions = torch.argmax(
                probabilities,
                dim=1,
            )

            all_targets.append(
                targets.cpu().numpy()
            )

            all_predictions.append(
                predictions.cpu().numpy()
            )

            all_probabilities.append(
                probabilities.cpu().numpy()
            )

            if batch_idx % 50 == 0:
                print(
                    f"Processed "
                    f"{batch_idx:,}/"
                    f"{len(test_loader):,} batches"
                )

    # --------------------------------------------------------
    # Combine
    # --------------------------------------------------------

    targets = np.concatenate(
        all_targets
    )

    predictions = np.concatenate(
        all_predictions
    )

    probabilities = np.concatenate(
        all_probabilities
    )

    # --------------------------------------------------------
    # Metrics
    # --------------------------------------------------------

    test_loss = (
        total_loss
        / total_examples
    )

    top1_accuracy = accuracy_score(
        targets,
        predictions,
    )

    macro_f1 = f1_score(
        targets,
        predictions,
        average="macro",
        zero_division=0,
    )

    weighted_f1 = f1_score(
        targets,
        predictions,
        average="weighted",
        zero_division=0,
    )

    # Top-3
    top3_indices = np.argsort(
        probabilities,
        axis=1,
    )[:, -3:]

    top3_correct = np.any(
        top3_indices
        == targets[:, None],
        axis=1,
    )

    top3_accuracy = float(
        np.mean(top3_correct)
    )

    # --------------------------------------------------------
    # Results
    # --------------------------------------------------------

    print()
    print("=" * 80)
    print("FINAL TEST RESULTS")
    print("=" * 80)

    print(
        f"Test Loss          : {test_loss:.6f}"
    )

    print(
        f"Top-1 Accuracy     : "
        f"{top1_accuracy * 100:.4f}%"
    )

    print(
        f"Top-3 Accuracy     : "
        f"{top3_accuracy * 100:.4f}%"
    )

    print(
        f"Macro F1           : "
        f"{macro_f1 * 100:.4f}%"
    )

    print(
        f"Weighted F1        : "
        f"{weighted_f1 * 100:.4f}%"
    )

    # --------------------------------------------------------
    # Load pathology names
    # --------------------------------------------------------

    with open(
        config.DATA_DIR
        / "id_to_condition.json",
        "r",
        encoding="utf-8",
    ) as f:

        id_to_condition = json.load(f)

    target_names = [
        id_to_condition[str(i)]
        for i in range(
            config.NUM_CLASSES
        )
    ]

    # --------------------------------------------------------
    # Classification report
    # --------------------------------------------------------

    report = classification_report(
        targets,
        predictions,
        labels=np.arange(
            config.NUM_CLASSES
        ),
        target_names=target_names,
        output_dict=True,
        zero_division=0,
    )

    report_text = classification_report(
        targets,
        predictions,
        labels=np.arange(
            config.NUM_CLASSES
        ),
        target_names=target_names,
        zero_division=0,
    )

    print()
    print("=" * 80)
    print("PER-CLASS CLASSIFICATION REPORT")
    print("=" * 80)

    print(report_text)

    # --------------------------------------------------------
    # Confusion matrix
    # --------------------------------------------------------

    cm = confusion_matrix(
        targets,
        predictions,
        labels=np.arange(
            config.NUM_CLASSES
        ),
    )

    # --------------------------------------------------------
    # Save results
    # --------------------------------------------------------

    results_dir = config.RESULTS_DIR

    results_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    metrics = {
        "checkpoint": str(
            CHECKPOINT_PATH
        ),
        "checkpoint_epoch": checkpoint_epoch,
        "test_samples": int(
            len(targets)
        ),
        "test_loss": float(
            test_loss
        ),
        "top1_accuracy": float(
            top1_accuracy
        ),
        "top3_accuracy": float(
            top3_accuracy
        ),
        "macro_f1": float(
            macro_f1
        ),
        "weighted_f1": float(
            weighted_f1
        ),
    }

    with open(
        results_dir
        / "test_metrics.json",
        "w",
        encoding="utf-8",
    ) as f:

        json.dump(
            metrics,
            f,
            indent=2,
        )

    with open(
        results_dir
        / "classification_report.json",
        "w",
        encoding="utf-8",
    ) as f:

        json.dump(
            report,
            f,
            indent=2,
        )

    np.save(
        results_dir
        / "confusion_matrix.npy",
        cm,
    )

    # --------------------------------------------------------
    # Save human-readable predictions
    # --------------------------------------------------------

    prediction_rows = []

    for i in range(
        len(targets)
    ):

        target_id = int(
            targets[i]
        )

        prediction_id = int(
            predictions[i]
        )

        top3_ids = (
            np.argsort(
                probabilities[i]
            )[-3:][::-1]
        )

        prediction_rows.append(
            {
                "test_index": i,
                "ground_truth": id_to_condition[
                    str(target_id)
                ],
                "prediction": id_to_condition[
                    str(prediction_id)
                ],
                "prediction_probability": float(
                    probabilities[
                        i,
                        prediction_id
                    ]
                ),
                "top1_correct": bool(
                    target_id == prediction_id
                ),
                "top3_prediction_1": id_to_condition[
                    str(int(top3_ids[0]))
                ],
                "top3_probability_1": float(
                    probabilities[
                        i,
                        top3_ids[0]
                    ]
                ),
                "top3_prediction_2": id_to_condition[
                    str(int(top3_ids[1]))
                ],
                "top3_probability_2": float(
                    probabilities[
                        i,
                        top3_ids[1]
                    ]
                ),
                "top3_prediction_3": id_to_condition[
                    str(int(top3_ids[2]))
                ],
                "top3_probability_3": float(
                    probabilities[
                        i,
                        top3_ids[2]
                    ]
                ),
            }
        )

    import csv

    prediction_path = (
        results_dir
        / "test_predictions.csv"
    )

    with open(
        prediction_path,
        "w",
        newline="",
        encoding="utf-8",
    ) as f:

        writer = csv.DictWriter(
            f,
            fieldnames=prediction_rows[0].keys(),
        )

        writer.writeheader()

        writer.writerows(
            prediction_rows
        )

    # --------------------------------------------------------
    # Error analysis
    # --------------------------------------------------------

    misclassified = []

    for i in range(
        len(targets)
    ):

        if targets[i] != predictions[i]:

            top3_ids = (
                np.argsort(
                    probabilities[i]
                )[-3:][::-1]
            )

            misclassified.append(
                {
                    "test_index": i,
                    "ground_truth":
                        id_to_condition[
                            str(int(targets[i]))
                        ],
                    "prediction":
                        id_to_condition[
                            str(int(predictions[i]))
                        ],
                    "prediction_probability":
                        float(
                            probabilities[
                                i,
                                predictions[i]
                            ]
                        ),
                    "top3": [
                        {
                            "condition":
                                id_to_condition[
                                    str(int(cid))
                                ],
                            "probability":
                                float(
                                    probabilities[
                                        i,
                                        cid
                                    ]
                                ),
                        }
                        for cid in top3_ids
                    ],
                }
            )

    with open(
        results_dir
        / "misclassified_cases.json",
        "w",
        encoding="utf-8",
    ) as f:

        json.dump(
            misclassified,
            f,
            indent=2,
            ensure_ascii=False,
        )

    # --------------------------------------------------------
    # Final summary
    # --------------------------------------------------------

    print()
    print("=" * 80)
    print("FILES SAVED")
    print("=" * 80)

    print(
        results_dir
        / "test_metrics.json"
    )

    print(
        results_dir
        / "classification_report.json"
    )

    print(
        results_dir
        / "confusion_matrix.npy"
    )

    print(
        results_dir
        / "test_predictions.csv"
    )

    print(
        results_dir
        / "misclassified_cases.json"
    )

    print()
    print(
        f"Misclassified cases: "
        f"{len(misclassified):,}"
    )

    print()
    print("✓ TEST EVALUATION COMPLETE")


if __name__ == "__main__":
    main()