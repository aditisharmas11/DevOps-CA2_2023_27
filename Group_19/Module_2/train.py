from __future__ import annotations

import json
import random
import time
from pathlib import Path
from typing import Dict, Tuple

import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import (
    accuracy_score,
    f1_score,
)
from torch.optim import AdamW
from torch.optim.lr_scheduler import ReduceLROnPlateau
from torch.utils.data import DataLoader

import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import config
from dataset import (
    DDXPlusDataset,
    calculate_training_age_stats,
)
from model import MediTwinSymptomClassifier


# ============================================================
# REPRODUCIBILITY
# ============================================================

def set_seed(seed: int) -> None:

    random.seed(seed)

    np.random.seed(seed)

    torch.manual_seed(seed)

    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

    if config.DETERMINISTIC:

        torch.backends.cudnn.deterministic = True

        torch.backends.cudnn.benchmark = False


# ============================================================
# JSON UTILITIES
# ============================================================

def save_json(
    path: Path,
    data: Dict,
) -> None:

    with open(
        path,
        "w",
        encoding="utf-8",
    ) as f:

        json.dump(
            data,
            f,
            indent=2,
            ensure_ascii=False,
        )


# ============================================================
# DATA LOADERS
# ============================================================

def build_dataloaders():

    print("=" * 80)
    print("CALCULATING TRAINING AGE STATISTICS")
    print("=" * 80)

    age_mean, age_std = (
        calculate_training_age_stats()
    )

    print(
        f"Age mean: {age_mean:.6f}"
    )

    print(
        f"Age std : {age_std:.6f}"
    )

    save_json(
        config.RUNS_DIR
        / config.AGE_STATS_NAME,
        {
            "mean": age_mean,
            "std": age_std,
        },
    )

    print()
    print("=" * 80)
    print("LOADING DATASETS")
    print("=" * 80)

    train_dataset = DDXPlusDataset(
        split="train",
        max_samples=config.MAX_TRAIN_SAMPLES,
        age_mean=age_mean,
        age_std=age_std,
    )

    validation_dataset = DDXPlusDataset(
        split="validation",
        max_samples=config.MAX_VALIDATION_SAMPLES,
        age_mean=age_mean,
        age_std=age_std,
    )

    print(
        f"Train samples     : {len(train_dataset):,}"
    )

    print(
        f"Validation samples: "
        f"{len(validation_dataset):,}"
    )

    train_loader = DataLoader(
        train_dataset,
        batch_size=config.BATCH_SIZE,
        shuffle=True,
        num_workers=config.NUM_WORKERS,
        pin_memory=torch.cuda.is_available(),
        drop_last=False,
    )

    validation_loader = DataLoader(
        validation_dataset,
        batch_size=config.BATCH_SIZE,
        shuffle=False,
        num_workers=config.NUM_WORKERS,
        pin_memory=torch.cuda.is_available(),
        drop_last=False,
    )

    return (
        train_loader,
        validation_loader,
        age_mean,
        age_std,
    )


# ============================================================
# METRICS
# ============================================================

def calculate_metrics(
    targets: np.ndarray,
    predictions: np.ndarray,
) -> Dict[str, float]:

    top1 = accuracy_score(
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

    return {
        "top1_accuracy": float(top1),
        "macro_f1": float(macro_f1),
        "weighted_f1": float(weighted_f1),
    }


# ============================================================
# TOP-K ACCURACY
# ============================================================

def top_k_accuracy(
    logits: torch.Tensor,
    targets: torch.Tensor,
    k: int,
) -> int:

    top_k = torch.topk(
        logits,
        k=k,
        dim=1,
    ).indices

    correct = (
        top_k == targets.unsqueeze(1)
    ).any(dim=1)

    return int(
        correct.sum().item()
    )


# ============================================================
# TRAIN ONE EPOCH
# ============================================================

def train_one_epoch(
    model: nn.Module,
    loader: DataLoader,
    optimizer,
    criterion,
    device,
    epoch: int,
) -> Dict[str, float]:

    model.train()

    running_loss = 0.0

    total_examples = 0

    top1_correct = 0

    top3_correct = 0

    all_targets = []

    all_predictions = []

    start = time.time()

    for batch_idx, batch in enumerate(
        loader,
        start=1,
    ):

        input_ids = (
            batch["input_ids"]
            .to(device)
        )

        attention_mask = (
            batch["attention_mask"]
            .to(device)
        )

        age = (
            batch["age"]
            .to(device)
        )

        sex = (
            batch["sex"]
            .to(device)
        )

        targets = (
            batch["pathology_label"]
            .to(device)
        )

        # ----------------------------------------------------
        # Forward
        # ----------------------------------------------------

        optimizer.zero_grad(
            set_to_none=True
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

        # ----------------------------------------------------
        # Backprop
        # ----------------------------------------------------

        loss.backward()

        if config.GRAD_CLIP_NORM is not None:

            torch.nn.utils.clip_grad_norm_(
                model.parameters(),
                config.GRAD_CLIP_NORM,
            )

        optimizer.step()

        # ----------------------------------------------------
        # Metrics
        # ----------------------------------------------------

        batch_size = targets.size(0)

        running_loss += (
            loss.item()
            * batch_size
        )

        total_examples += batch_size

        predictions = torch.argmax(
            logits,
            dim=1,
        )

        top1_correct += int(
            (predictions == targets)
            .sum()
            .item()
        )

        top3_correct += top_k_accuracy(
            logits,
            targets,
            k=3,
        )

        all_targets.append(
            targets.detach()
            .cpu()
            .numpy()
        )

        all_predictions.append(
            predictions.detach()
            .cpu()
            .numpy()
        )

        # ----------------------------------------------------
        # Progress
        # ----------------------------------------------------

        if (
            batch_idx
            % config.PRINT_EVERY_BATCHES
            == 0
        ):

            current_loss = (
                running_loss
                / total_examples
            )

            current_top1 = (
                top1_correct
                / total_examples
            )

            current_top3 = (
                top3_correct
                / total_examples
            )

            print(
                f"Epoch {epoch:02d} | "
                f"Batch {batch_idx:5d}/{len(loader):5d} | "
                f"Loss {current_loss:.4f} | "
                f"Top-1 {current_top1:.4f} | "
                f"Top-3 {current_top3:.4f}"
            )

    targets_np = np.concatenate(
        all_targets
    )

    predictions_np = np.concatenate(
        all_predictions
    )

    metrics = calculate_metrics(
        targets_np,
        predictions_np,
    )

    metrics["loss"] = (
        running_loss
        / total_examples
    )

    metrics["top3_accuracy"] = (
        top3_correct
        / total_examples
    )

    metrics["epoch_time_seconds"] = (
        time.time() - start
    )

    return metrics


# ============================================================
# VALIDATION
# ============================================================

@torch.no_grad()
def evaluate(
    model: nn.Module,
    loader: DataLoader,
    criterion,
    device,
) -> Dict[str, float]:

    model.eval()

    running_loss = 0.0

    total_examples = 0

    top1_correct = 0

    top3_correct = 0

    all_targets = []

    all_predictions = []

    for batch in loader:

        input_ids = (
            batch["input_ids"]
            .to(device)
        )

        attention_mask = (
            batch["attention_mask"]
            .to(device)
        )

        age = (
            batch["age"]
            .to(device)
        )

        sex = (
            batch["sex"]
            .to(device)
        )

        targets = (
            batch["pathology_label"]
            .to(device)
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

        running_loss += (
            loss.item()
            * batch_size
        )

        total_examples += batch_size

        predictions = torch.argmax(
            logits,
            dim=1,
        )

        top1_correct += int(
            (predictions == targets)
            .sum()
            .item()
        )

        top3_correct += top_k_accuracy(
            logits,
            targets,
            k=3,
        )

        all_targets.append(
            targets.cpu().numpy()
        )

        all_predictions.append(
            predictions.cpu().numpy()
        )

    targets_np = np.concatenate(
        all_targets
    )

    predictions_np = np.concatenate(
        all_predictions
    )

    metrics = calculate_metrics(
        targets_np,
        predictions_np,
    )

    metrics["loss"] = (
        running_loss
        / total_examples
    )

    metrics["top3_accuracy"] = (
        top3_correct
        / total_examples
    )

    return metrics


# ============================================================
# CHECKPOINT
# ============================================================

def save_checkpoint(
    path: Path,
    model: nn.Module,
    optimizer,
    scheduler,
    epoch: int,
    metrics: Dict[str, float],
    age_mean: float,
    age_std: float,
) -> None:

    checkpoint = {
        "epoch": epoch,

        "model_state_dict":
            model.state_dict(),

        "optimizer_state_dict":
            optimizer.state_dict(),

        "scheduler_state_dict":
            scheduler.state_dict(),

        "metrics": metrics,

        "age_mean": age_mean,

        "age_std": age_std,

        "config": {
            "VOCAB_SIZE":
                config.VOCAB_SIZE,

            "NUM_CLASSES":
                config.NUM_CLASSES,

            "SEQUENCE_LENGTH":
                config.SEQUENCE_LENGTH,

            "EMBED_DIM":
                config.EMBED_DIM,

            "NUM_TRANSFORMER_LAYERS":
                config.NUM_TRANSFORMER_LAYERS,

            "NUM_ATTENTION_HEADS":
                config.NUM_ATTENTION_HEADS,

            "FF_DIM":
                config.FF_DIM,

            "DROPOUT":
                config.DROPOUT,
        },
    }

    torch.save(
        checkpoint,
        path,
    )


# ============================================================
# MAIN
# ============================================================

def main():

    set_seed(
        config.SEED
    )

    print("=" * 80)
    print("MEDI TWIN - MODULE 2 TRAINING")
    print("=" * 80)

    print(
        f"BASE       : {config.BASE}"
    )

    print(
        f"DATA_DIR   : {config.DATA_DIR}"
    )

    print(
        f"DEVICE     : {config.DEVICE}"
    )

    print(
        f"Train limit: "
        f"{config.MAX_TRAIN_SAMPLES}"
    )

    print(
        f"Epochs     : "
        f"{config.EPOCHS}"
    )

    print(
        f"Batch size : "
        f"{config.BATCH_SIZE}"
    )

    print(
        f"Learning rate: "
        f"{config.LEARNING_RATE}"
    )

    # --------------------------------------------------------
    # Data
    # --------------------------------------------------------

    (
        train_loader,
        validation_loader,
        age_mean,
        age_std,
    ) = build_dataloaders()

    # --------------------------------------------------------
    # Model
    # --------------------------------------------------------

    print()
    print("=" * 80)
    print("BUILDING MODEL")
    print("=" * 80)

    model = MediTwinSymptomClassifier()

    model = model.to(
        config.DEVICE
    )

    parameter_count = sum(
        p.numel()
        for p in model.parameters()
    )

    trainable_parameter_count = sum(
        p.numel()
        for p in model.parameters()
        if p.requires_grad
    )

    print(
        f"Total parameters     : "
        f"{parameter_count:,}"
    )

    print(
        f"Trainable parameters : "
        f"{trainable_parameter_count:,}"
    )

    # --------------------------------------------------------
    # Loss
    # --------------------------------------------------------

    criterion = nn.CrossEntropyLoss()

    # --------------------------------------------------------
    # Optimizer
    # --------------------------------------------------------

    optimizer = AdamW(
        model.parameters(),
        lr=config.LEARNING_RATE,
        weight_decay=config.WEIGHT_DECAY,
    )

    # --------------------------------------------------------
    # Scheduler
    # --------------------------------------------------------

    scheduler = ReduceLROnPlateau(
        optimizer,
        mode="max",
        factor=0.5,
        patience=1,
        min_lr=1e-6,
    )

    # --------------------------------------------------------
    # Training history
    # --------------------------------------------------------

    history = []

    best_metric = -float("inf")

    epochs_without_improvement = 0

    # --------------------------------------------------------
    # Epoch loop
    # --------------------------------------------------------

    for epoch in range(
        1,
        config.EPOCHS + 1,
    ):

        print()
        print("=" * 80)
        print(
            f"EPOCH {epoch}/{config.EPOCHS}"
        )
        print("=" * 80)

        # ----------------------------------------------------
        # Train
        # ----------------------------------------------------

        train_metrics = train_one_epoch(
            model=model,
            loader=train_loader,
            optimizer=optimizer,
            criterion=criterion,
            device=config.DEVICE,
            epoch=epoch,
        )

        # ----------------------------------------------------
        # Validation
        # ----------------------------------------------------

        validation_metrics = evaluate(
            model=model,
            loader=validation_loader,
            criterion=criterion,
            device=config.DEVICE,
        )

        # ----------------------------------------------------
        # Scheduler
        # ----------------------------------------------------

        scheduler.step(
            validation_metrics[
                "macro_f1"
            ]
        )

        current_lr = (
            optimizer.param_groups[0]["lr"]
        )

        # ----------------------------------------------------
        # Epoch summary
        # ----------------------------------------------------

        print()
        print(
            f"TRAIN      | "
            f"Loss={train_metrics['loss']:.4f} | "
            f"Top-1={train_metrics['top1_accuracy']:.4f} | "
            f"Top-3={train_metrics['top3_accuracy']:.4f} | "
            f"Macro-F1={train_metrics['macro_f1']:.4f}"
        )

        print(
            f"VALIDATION | "
            f"Loss={validation_metrics['loss']:.4f} | "
            f"Top-1={validation_metrics['top1_accuracy']:.4f} | "
            f"Top-3={validation_metrics['top3_accuracy']:.4f} | "
            f"Macro-F1={validation_metrics['macro_f1']:.4f}"
        )

        print(
            f"Learning rate: {current_lr:.7f}"
        )

        # ----------------------------------------------------
        # History
        # ----------------------------------------------------

        epoch_record = {
            "epoch": epoch,

            "learning_rate": current_lr,

            "train": train_metrics,

            "validation": validation_metrics,
        }

        history.append(
            epoch_record
        )

        save_json(
            config.RESULTS_DIR
            / "training_history.json",
            {
                "history": history
            },
        )

        # ----------------------------------------------------
        # Save last checkpoint
        # ----------------------------------------------------

        save_checkpoint(
            path=(
                config.CHECKPOINT_DIR
                / config.LAST_CHECKPOINT_NAME
            ),
            model=model,
            optimizer=optimizer,
            scheduler=scheduler,
            epoch=epoch,
            metrics=validation_metrics,
            age_mean=age_mean,
            age_std=age_std,
        )

        # ----------------------------------------------------
        # Save best checkpoint
        # ----------------------------------------------------

        current_metric = (
            validation_metrics[
                "macro_f1"
            ]
        )

        if current_metric > best_metric:

            best_metric = current_metric

            epochs_without_improvement = 0

            save_checkpoint(
                path=(
                    config.CHECKPOINT_DIR
                    / config.BEST_CHECKPOINT_NAME
                ),
                model=model,
                optimizer=optimizer,
                scheduler=scheduler,
                epoch=epoch,
                metrics=validation_metrics,
                age_mean=age_mean,
                age_std=age_std,
            )

            print(
                "✓ New best model saved."
            )

        else:

            epochs_without_improvement += 1

            print(
                f"No improvement. "
                f"Patience: "
                f"{epochs_without_improvement}/"
                f"{config.EARLY_STOPPING_PATIENCE}"
            )

        # ----------------------------------------------------
        # Early stopping
        # ----------------------------------------------------

        if (
            epochs_without_improvement
            >= config.EARLY_STOPPING_PATIENCE
        ):

            print()
            print(
                "Early stopping triggered."
            )

            break

    # --------------------------------------------------------
    # Training complete
    # --------------------------------------------------------

    print()
    print("=" * 80)
    print("TRAINING COMPLETE")
    print("=" * 80)

    print(
        f"Best validation Macro-F1: "
        f"{best_metric:.4f}"
    )

    print(
        f"Best checkpoint:\n"
        f"{config.CHECKPOINT_DIR / config.BEST_CHECKPOINT_NAME}"
    )

    print(
        f"Training history:\n"
        f"{config.RESULTS_DIR / 'training_history.json'}"
    )


if __name__ == "__main__":
    main()