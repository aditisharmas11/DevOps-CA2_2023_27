from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Iterable

import torch


# =============================================================================
# PATHS
# =============================================================================

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_DIR = BASE_DIR / "module2_data_clean"
CHECKPOINT_FILE = BASE_DIR / "runs" / "checkpoints" / "best_model.pt"

VOCAB_FILE = DATA_DIR / "evidence_vocab.json"
PATHOLOGY_FILE = DATA_DIR / "id_to_condition.json"
METADATA_FILE = DATA_DIR / "preprocessing_metadata.json"
EVIDENCE_GRAPH_FILE = DATA_DIR / "evidence_graph.json"

# Keep the project root importable when this file is executed directly.
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))


# =============================================================================
# PROJECT IMPORTS
# =============================================================================

from model import MediTwinSymptomClassifier
from evidence_mapper import EvidenceMapper
from inference.evidence_matcher import EvidenceMatcher
from inference.value_extractor import ValueExtractor


# =============================================================================
# CONFIG
# =============================================================================

DEFAULT_TOP_K = 3

SEX_MAP = {
    "female": 0,
    "f": 0,
    "male": 1,
    "m": 1,
    "unknown": 2,
    "u": 2,
    "other": 2,
}

SPECIAL_TOKENS = ("[PAD]", "[CLS]", "[SEP]", "[UNK]")


# =============================================================================
# HELPERS
# =============================================================================

def load_json(path: Path) -> Any:
    if not path.exists():
        raise FileNotFoundError(f"Required file not found:\n{path}")

    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def unique_preserve_order(items: Iterable[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()

    for item in items:
        item = str(item).strip()
        if not item or item in seen:
            continue
        seen.add(item)
        result.append(item)

    return result


def normalize_atom(atom: Any) -> str:
    return str(atom).strip()


# =============================================================================
# PIPELINE
# =============================================================================

class MediTwinInferencePipeline:
    """
    Final Module-2 inference adapter.

    Responsibilities:
      1. Load the exact trained model/checkpoint.
      2. Convert natural language -> positive DDXPlus evidence.
      3. Extract value-based atoms such as E_55_@_V_29.
      4. Keep negated evidence out of model input.
      5. Provide BOTH:
           predict(text=...)
           predict_from_evidence(evidence_codes=...)
         so the conversational engine does not need to re-parse text.
      6. Return one stable prediction schema.

    Important:
      This class does not change the trained model or its probabilities.
      It only builds the exact evidence-token representation expected by
      the trained model.
    """

    def __init__(self, device: str | None = None):
        print("=" * 80)
        print("MEDI TWIN - MODULE 2 INFERENCE PIPELINE")
        print("=" * 80)

        self.device = self._resolve_device(device)
        print(f"Device: {self.device}")

        # ---------------------------------------------------------------------
        # Files
        # ---------------------------------------------------------------------

        print("\nLoading vocabulary...")
        self.vocab = load_json(VOCAB_FILE)

        if not isinstance(self.vocab, dict):
            raise ValueError(
                f"Vocabulary must be a JSON object: {VOCAB_FILE}"
            )

        self.vocab = {
            str(k): int(v)
            for k, v in self.vocab.items()
        }

        print(f"[OK] Vocabulary loaded: {len(self.vocab)} tokens")

        self._validate_special_tokens()

        print("\nLoading pathology mapping...")
        self.id_to_condition = load_json(PATHOLOGY_FILE)

        if not isinstance(self.id_to_condition, dict):
            raise ValueError(
                f"Pathology mapping must be a JSON object: {PATHOLOGY_FILE}"
            )

        print(
            f"[OK] Pathology mapping loaded: "
            f"{len(self.id_to_condition)} classes"
        )

        print("\nLoading preprocessing metadata...")
        self.metadata = load_json(METADATA_FILE)

        if not isinstance(self.metadata, dict):
            raise ValueError(
                f"Preprocessing metadata must be a JSON object: {METADATA_FILE}"
            )

        print("[OK] Metadata loaded")

        # ``evidence_vocab.json`` contains the full ontology, including
        # values which never occurred in the training split.  Only atoms in
        # the training-only graph are safe inputs for a condition ranking.
        graph = load_json(EVIDENCE_GRAPH_FILE)
        self.observed_evidence_atoms = set(graph.get("evidence", {}).keys())
        if not self.observed_evidence_atoms:
            raise ValueError("Evidence graph contains no observed training atoms.")

        # ---------------------------------------------------------------------
        # Checkpoint
        # ---------------------------------------------------------------------

        print("\nLoading checkpoint...")

        if not CHECKPOINT_FILE.exists():
            raise FileNotFoundError(
                f"Checkpoint not found:\n{CHECKPOINT_FILE}"
            )

        self.checkpoint = torch.load(
            CHECKPOINT_FILE,
            map_location=self.device,
        )

        if not isinstance(self.checkpoint, dict):
            raise ValueError("Checkpoint must be a dictionary.")

        if "model_state_dict" not in self.checkpoint:
            raise ValueError(
                "Checkpoint does not contain 'model_state_dict'."
            )

        print("[OK] Checkpoint loaded")

        # ---------------------------------------------------------------------
        # Exact training configuration
        # ---------------------------------------------------------------------

        self.model_config = self._resolve_model_config()

        self.sequence_length = int(
            self.model_config["SEQUENCE_LENGTH"]
        )
        self.num_classes = int(
            self.model_config["NUM_CLASSES"]
        )

        if self.sequence_length < 3:
            raise ValueError(
                f"Invalid sequence length: {self.sequence_length}"
            )

        if self.num_classes < 1:
            raise ValueError(
                f"Invalid number of classes: {self.num_classes}"
            )

        # ---------------------------------------------------------------------
        # Age statistics
        # ---------------------------------------------------------------------

        self.age_mean, self.age_std = self._resolve_age_statistics()

        print(f"Age mean : {self.age_mean:.6f}")
        print(f"Age std  : {self.age_std:.6f}")

        # ---------------------------------------------------------------------
        # DDXPlus components
        # ---------------------------------------------------------------------

        print("\nLoading DDXPlus components...")

        self.mapper = EvidenceMapper()
        print("[OK] Evidence mapper loaded")

        self.matcher = EvidenceMatcher()
        print("[OK] Hybrid evidence matcher loaded")

        self.value_extractor = ValueExtractor()
        print("[OK] Value extractor loaded")

        # ---------------------------------------------------------------------
        # Model
        # ---------------------------------------------------------------------

        print("\nLoading model...")

        self.model = MediTwinSymptomClassifier(
            vocab_size=int(self.model_config["VOCAB_SIZE"]),
            num_classes=int(self.model_config["NUM_CLASSES"]),
            sequence_length=int(self.model_config["SEQUENCE_LENGTH"]),
            embed_dim=int(self.model_config["EMBED_DIM"]),
            num_layers=int(self.model_config["NUM_TRANSFORMER_LAYERS"]),
            num_heads=int(self.model_config["NUM_ATTENTION_HEADS"]),
            ff_dim=int(self.model_config["FF_DIM"]),
            dropout=float(self.model_config["DROPOUT"]),
        )

        self._validate_checkpoint_compatibility()

        self.model.load_state_dict(
            self.checkpoint["model_state_dict"]
        )

        self.model.to(self.device)
        self.model.eval()

        print("[OK] Model architecture matched")
        print("[OK] Model weights loaded")

        print()
        print("=" * 80)
        print("PIPELINE READY")
        print("=" * 80)

    # =========================================================================
    # DEVICE
    # =========================================================================

    @staticmethod
    def _resolve_device(device: str | None) -> torch.device:
        if device is None:
            return torch.device(
                "cuda" if torch.cuda.is_available() else "cpu"
            )

        requested = torch.device(device)

        if requested.type == "cuda" and not torch.cuda.is_available():
            raise RuntimeError(
                "CUDA was requested, but CUDA is not available."
            )

        return requested

    # =========================================================================
    # CHECKPOINT CONFIG
    # =========================================================================

    def _resolve_model_config(self) -> dict[str, Any]:
        checkpoint_config = self.checkpoint.get("config", {})

        if not isinstance(checkpoint_config, dict):
            checkpoint_config = {}

        # These are the defaults used by the current trained architecture.
        defaults = {
            "VOCAB_SIZE": 991,
            "NUM_CLASSES": 49,
            "SEQUENCE_LENGTH": 49,
            "EMBED_DIM": 128,
            "NUM_TRANSFORMER_LAYERS": 3,
            "NUM_ATTENTION_HEADS": 4,
            "FF_DIM": 256,
            "DROPOUT": 0.10,
        }

        config = dict(defaults)

        # Checkpoint is the strongest source.
        for key in defaults:
            if key in checkpoint_config:
                config[key] = checkpoint_config[key]

        # If a metadata file explicitly contains these fields, use them only
        # when checkpoint config did not provide them.
        metadata_map = {
            "VOCAB_SIZE": "vocab_size",
            "NUM_CLASSES": "num_classes",
            "SEQUENCE_LENGTH": "sequence_length",
            "EMBED_DIM": "embed_dim",
            "NUM_TRANSFORMER_LAYERS": "num_transformer_layers",
            "NUM_ATTENTION_HEADS": "num_attention_heads",
            "FF_DIM": "ff_dim",
            "DROPOUT": "dropout",
        }

        for model_key, metadata_key in metadata_map.items():
            if (
                model_key not in checkpoint_config
                and metadata_key in self.metadata
            ):
                config[model_key] = self.metadata[metadata_key]

        # Normalize numeric types.
        integer_keys = {
            "VOCAB_SIZE",
            "NUM_CLASSES",
            "SEQUENCE_LENGTH",
            "EMBED_DIM",
            "NUM_TRANSFORMER_LAYERS",
            "NUM_ATTENTION_HEADS",
            "FF_DIM",
        }

        for key in integer_keys:
            config[key] = int(config[key])

        config["DROPOUT"] = float(config["DROPOUT"])

        # The vocabulary and model must agree.
        if config["VOCAB_SIZE"] != len(self.vocab):
            raise RuntimeError(
                "Model/vocabulary mismatch.\n"
                f"Checkpoint/model VOCAB_SIZE = {config['VOCAB_SIZE']}\n"
                f"Loaded vocabulary size       = {len(self.vocab)}"
            )

        if config["NUM_CLASSES"] != len(self.id_to_condition):
            raise RuntimeError(
                "Model/pathology mapping mismatch.\n"
                f"Model NUM_CLASSES              = {config['NUM_CLASSES']}\n"
                f"Pathology mapping class count  = {len(self.id_to_condition)}"
            )

        return config

    def _validate_checkpoint_compatibility(self) -> None:
        state = self.checkpoint["model_state_dict"]

        if not isinstance(state, dict):
            raise ValueError("model_state_dict must be a state dictionary.")

        # load_state_dict below gives the exact error for shape mismatches.
        # Here we catch the common accidental checkpoint/model mismatch early.
        classifier_weight = state.get("classifier.0.weight")

        if classifier_weight is not None:
            expected_classes = self.num_classes

            if classifier_weight.shape[0] != expected_classes:
                raise RuntimeError(
                    "Checkpoint classifier output does not match NUM_CLASSES.\n"
                    f"Checkpoint classifier rows = {classifier_weight.shape[0]}\n"
                    f"Expected classes             = {expected_classes}"
                )

    # =========================================================================
    # SPECIAL TOKENS
    # =========================================================================

    def _validate_special_tokens(self) -> None:
        missing = [
            token
            for token in SPECIAL_TOKENS
            if token not in self.vocab
        ]

        if missing:
            raise RuntimeError(
                "Vocabulary is missing required special token(s): "
                + ", ".join(missing)
            )

    # =========================================================================
    # AGE
    # =========================================================================

    def _resolve_age_statistics(self) -> tuple[float, float]:
        age_mean = None
        age_std = None

        if "age_mean" in self.checkpoint:
            age_mean = float(self.checkpoint["age_mean"])

        if "age_std" in self.checkpoint:
            age_std = float(self.checkpoint["age_std"])

        # Some project runs store them in metadata.
        if age_mean is None and "age_mean" in self.metadata:
            age_mean = float(self.metadata["age_mean"])

        if age_std is None and "age_std" in self.metadata:
            age_std = float(self.metadata["age_std"])

        # Final project fallback: runs/age_stats.json.
        if age_mean is None or age_std is None:
            age_stats_file = BASE_DIR / "runs" / "age_stats.json"

            if age_stats_file.exists():
                stats = load_json(age_stats_file)

                if age_mean is None and "mean" in stats:
                    age_mean = float(stats["mean"])

                if age_std is None and "std" in stats:
                    age_std = float(stats["std"])

        if age_mean is None:
            raise RuntimeError(
                "Could not determine training age mean."
            )

        if age_std is None or age_std <= 0:
            raise RuntimeError(
                "Could not determine a valid training age std."
            )

        return age_mean, age_std

    def normalize_age(self, age: float) -> float:
        try:
            age = float(age)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"Invalid age: {age}") from exc

        if age < 0 or age > 130:
            raise ValueError(
                f"Age must be between 0 and 130. Received: {age}"
            )

        return (age - self.age_mean) / self.age_std

    # =========================================================================
    # SEX
    # =========================================================================

    @staticmethod
    def encode_sex(sex: str | int) -> int:
        if isinstance(sex, bool):
            raise ValueError("Sex must not be a boolean.")

        if isinstance(sex, int):
            if sex in (0, 1, 2):
                return sex
            raise ValueError(
                "Sex integer must be 0 (female), 1 (male), or 2 (unknown)."
            )

        value = str(sex).strip().lower()

        if value not in SEX_MAP:
            raise ValueError(
                f"Unsupported sex '{sex}'. "
                "Use male/female/unknown or 0/1/2."
            )

        return SEX_MAP[value]

    # =========================================================================
    # EVIDENCE CODE HELPERS
    # =========================================================================

    @staticmethod
    def base_code(atom: str) -> str:
        atom = normalize_atom(atom)

        if "_@_" in atom:
            return atom.split("_@_", 1)[0]

        return atom

    def _mapper_info(self, code: str) -> dict | None:
        try:
            info = self.mapper.get(code)
        except Exception:
            return None

        return info if isinstance(info, dict) else None

    def _requires_value(self, code: str) -> bool:
        info = self._mapper_info(code)

        if not info:
            return False

        data_type = info.get("data_type")

        possible_values = info.get(
            "possible-values",
            info.get("possible_values", []),
        )

        return bool(
            data_type in {"M", "C"}
            and possible_values
        )

    # =========================================================================
    # VALUE EXTRACTION
    # =========================================================================

    def _extract_values(self, text: str) -> list[dict]:
        result = self.value_extractor.extract(text)

        if result is None:
            return []

        if isinstance(result, dict):
            if "values" in result:
                result = result["values"]
            else:
                result = [result]

        if not isinstance(result, list):
            return []

        return [
            item
            for item in result
            if isinstance(item, dict)
        ]

    def _extract_value_atoms(self, values: list[dict]) -> list[str]:
        atoms: list[str] = []

        for item in values:
            atom = item.get("atom")

            if atom:
                atom = normalize_atom(atom)

                if atom and atom not in atoms:
                    atoms.append(atom)

        return atoms

    # =========================================================================
    # MATCHER EXTRACTION
    # =========================================================================

    def _extract_matcher_result(
        self,
        text: str,
    ) -> tuple[list[str], list[str], dict]:
        result = self.matcher.match(text)

        if not isinstance(result, dict):
            raise RuntimeError(
                "EvidenceMatcher.match() must return a dictionary."
            )

        positive: list[str] = []
        negated: list[str] = []

        # Current matcher generation.
        for item in result.get("evidence", []) or []:
            code = self._item_code(item)

            if code:
                positive.append(code)

        # Current final matcher uses negated_evidence.
        # Some previous versions used negated.
        for key in ("negated_evidence", "negated"):
            for item in result.get(key, []) or []:
                code = self._item_code(item)

                if code:
                    negated.append(code)

        positive = unique_preserve_order(positive)
        negated = unique_preserve_order(negated)

        # If the matcher somehow returns the same code in both states, do not
        # silently send contradictory evidence to the model.
        conflicts = sorted(set(positive) & set(negated))

        if conflicts:
            positive = [
                code
                for code in positive
                if code not in conflicts
            ]

        return positive, negated, {
            **result,
            "conflicting_evidence": conflicts,
        }

    @staticmethod
    def _item_code(item: Any) -> str | None:
        if isinstance(item, str):
            return normalize_atom(item)

        if not isinstance(item, dict):
            return None

        code = (
            item.get("evidence_code")
            or item.get("code")
            or item.get("atom")
        )

        if not code:
            return None

        return normalize_atom(code)

    # =========================================================================
    # COMBINE BINARY + VALUE EVIDENCE
    # =========================================================================

    def _combine_evidence(
        self,
        symptom_codes: list[str],
        value_atoms: list[str],
    ) -> list[str]:
        """
        Convert extracted evidence into model-valid atoms.

        Critical rule:
            E_55 alone is invalid for a categorical evidence field.
            E_55_@_V_29 is valid.

        Therefore, when a value atom exists, the raw base code is removed.
        """

        symptom_codes = unique_preserve_order(symptom_codes)
        value_atoms = unique_preserve_order(value_atoms)

        value_base_codes = {
            self.base_code(atom)
            for atom in value_atoms
            if "_@_" in atom
        }

        final_atoms: list[str] = []

        # Binary/simple codes.
        for code in symptom_codes:
            code = normalize_atom(code)

            if not code:
                continue

            # Already a value atom.
            if "_@_" in code:
                if code not in final_atoms:
                    final_atoms.append(code)
                continue

            # A value atom for this base code exists.
            if code in value_base_codes:
                continue

            # Do not put an unresolved categorical base code into the model.
            if self._requires_value(code):
                continue

            if code not in final_atoms:
                final_atoms.append(code)

        # Value atoms.
        for atom in value_atoms:
            atom = normalize_atom(atom)

            if atom and atom not in final_atoms:
                final_atoms.append(atom)

        return final_atoms

    # =========================================================================
    # COMPLETE NATURAL-LANGUAGE EXTRACTION
    # =========================================================================

    def extract_evidence(self, text: str) -> dict:
        text = str(text).strip()

        if not text:
            return {
                "symptom_codes": [],
                "negated_codes": [],
                "value_results": [],
                "value_atoms": [],
                "evidence_atoms": [],
                "conflicting_evidence": [],
                "matcher_result": {},
            }

        (
            symptom_codes,
            negated_codes,
            matcher_result,
        ) = self._extract_matcher_result(text)

        value_results = self._extract_values(text)
        value_atoms = self._extract_value_atoms(value_results)

        evidence_atoms = self._combine_evidence(
            symptom_codes=symptom_codes,
            value_atoms=value_atoms,
        )

        return {
            "symptom_codes": symptom_codes,
            "negated_codes": negated_codes,
            "value_results": value_results,
            "value_atoms": value_atoms,
            "evidence_atoms": evidence_atoms,
            "conflicting_evidence": matcher_result.get(
                "conflicting_evidence",
                [],
            ),
            "matcher_result": matcher_result,
        }

    # =========================================================================
    # MODEL ATOM VALIDATION
    # =========================================================================

    def validate_evidence_atoms(
        self,
        evidence_atoms: Iterable[str],
    ) -> list[str]:
        """
        Validate atoms without silently dropping unknown evidence.

        Returns unique atoms preserving the supplied order.
        """

        atoms = unique_preserve_order(
            normalize_atom(atom)
            for atom in evidence_atoms
        )

        if not atoms:
            return []

        invalid_vocab = [
            atom
            for atom in atoms
            if atom not in self.vocab
        ]

        if invalid_vocab:
            raise ValueError(
                "Evidence atom(s) are not present in the trained vocabulary:\n"
                + "\n".join(f"  {x}" for x in invalid_vocab)
                + "\n\nThis usually means the inference ontology and the "
                  "trained vocabulary are out of sync."
            )

        # Validate categorical atoms.
        for atom in atoms:
            if "_@_" not in atom:
                continue

            code, value = atom.split("_@_", 1)

            if not code or not value:
                raise ValueError(
                    f"Malformed value evidence atom: {atom}"
                )

            info = self._mapper_info(code)

            if info is None:
                raise ValueError(
                    f"Unknown evidence base code in atom: {atom}"
                )

            if not self._requires_value(code):
                raise ValueError(
                    f"{atom} is formatted as a value atom, but "
                    f"{code} is not a value-based evidence code."
                )

            possible_values = info.get(
                "possible-values",
                info.get("possible_values", []),
            )

            possible_values = {
                str(x)
                for x in possible_values
            }

            if possible_values and value not in possible_values:
                raise ValueError(
                    f"Invalid value '{value}' for {code}.\n"
                    f"Allowed values: {sorted(possible_values)}"
                )

        return atoms

    # =========================================================================
    # BUILD MODEL INPUT
    # =========================================================================

    def build_model_input(
        self,
        evidence_atoms: Iterable[str],
        age: float,
        sex: str | int,
    ) -> dict[str, torch.Tensor]:
        """
        Exact training representation:

            [CLS] evidence_1 evidence_2 ... evidence_N [SEP] [PAD]...

        Attention mask:
            1 for [CLS] + evidence + [SEP]
            0 for padding
        """

        atoms = self.validate_evidence_atoms(
            evidence_atoms
        )

        # Sequence contains:
        # [CLS] + N atoms + [SEP]
        required_length = len(atoms) + 2

        if required_length > self.sequence_length:
            raise ValueError(
                f"Too many evidence atoms for the trained sequence length.\n"
                f"Received: {len(atoms)} atoms\n"
                f"Maximum : {self.sequence_length - 2} atoms"
            )

        cls_id = self.vocab["[CLS]"]
        sep_id = self.vocab["[SEP]"]
        pad_id = self.vocab["[PAD]"]

        token_ids = [cls_id]

        for atom in atoms:
            token_ids.append(
                int(self.vocab[atom])
            )

        token_ids.append(sep_id)

        padding_count = (
            self.sequence_length
            - len(token_ids)
        )

        token_ids.extend(
            [pad_id] * padding_count
        )

        attention_mask = (
            [1] * (self.sequence_length - padding_count)
            + [0] * padding_count
        )

        if len(token_ids) != self.sequence_length:
            raise RuntimeError(
                "Internal token sequence construction error."
            )

        if len(attention_mask) != self.sequence_length:
            raise RuntimeError(
                "Internal attention-mask construction error."
            )

        age_normalized = self.normalize_age(age)
        sex_encoded = self.encode_sex(sex)

        return {
            "input_ids": torch.tensor(
                [token_ids],
                dtype=torch.long,
                device=self.device,
            ),
            "attention_mask": torch.tensor(
                [attention_mask],
                dtype=torch.long,
                device=self.device,
            ),
            "age": torch.tensor(
                [age_normalized],
                dtype=torch.float32,
                device=self.device,
            ),
            "sex": torch.tensor(
                [sex_encoded],
                dtype=torch.long,
                device=self.device,
            ),
        }

    # =========================================================================
    # PATHOLOGY
    # =========================================================================

    def pathology_name(self, class_id: int) -> str:
        key = str(int(class_id))

        if key in self.id_to_condition:
            return str(self.id_to_condition[key])

        return f"Unknown pathology (class {class_id})"

    # =========================================================================
    # DIRECT MODEL INFERENCE
    # =========================================================================

    @torch.no_grad()
    def predict_from_evidence(
        self,
        evidence_codes: list[str] | None = None,
        age: float = 0.0,
        sex: str | int = "unknown",
        top_k: int = DEFAULT_TOP_K,
        *,
        evidence_atoms: list[str] | None = None,
    ) -> dict:
        """
        Run the trained classifier directly from already-resolved evidence.

        This is the method the conversational engine should use.

        Both names are accepted for compatibility:

            evidence_codes=[...]
            evidence_atoms=[...]

        Only positive evidence should be passed here. Negated evidence is
        intentionally excluded by the conversation engine.
        """

        if evidence_codes is None:
            evidence_codes = evidence_atoms

        if evidence_codes is None:
            raise ValueError(
                "No evidence_codes/evidence_atoms were supplied."
            )

        atoms = self.validate_evidence_atoms(
            evidence_codes
        )

        if not atoms:
            return {
                "status": "no_supported_evidence",
                "evidence_atoms": [],
                "predictions": [],
                "age": float(age),
                "sex": self.encode_sex(sex),
            }

        unsupported_atoms = [
            atom for atom in atoms
            if atom not in self.observed_evidence_atoms
        ]

        if unsupported_atoms:
            return {
                "status": "unsupported_evidence",
                "evidence_atoms": atoms,
                "unsupported_evidence_atoms": unsupported_atoms,
                "predictions": [],
                "age": float(age),
                "sex": self.encode_sex(sex),
                "warning": (
                    "At least one supplied evidence atom was not observed "
                    "in the model's training data; no condition ranking was "
                    "generated."
                ),
            }

        try:
            top_k = int(top_k)
        except (TypeError, ValueError) as exc:
            raise ValueError(
                f"Invalid top_k: {top_k}"
            ) from exc

        if top_k < 1:
            raise ValueError("top_k must be >= 1.")

        top_k = min(
            top_k,
            self.num_classes,
        )

        inputs = self.build_model_input(
            evidence_atoms=atoms,
            age=age,
            sex=sex,
        )

        logits = self.model(
            input_ids=inputs["input_ids"],
            attention_mask=inputs["attention_mask"],
            age=inputs["age"],
            sex=inputs["sex"],
        )

        if logits.ndim != 2:
            raise RuntimeError(
                f"Unexpected model output shape: {tuple(logits.shape)}"
            )

        if logits.shape[0] != 1:
            raise RuntimeError(
                "Inference expects a single patient."
            )

        if logits.shape[1] != self.num_classes:
            raise RuntimeError(
                "Model output class count does not match the loaded "
                "pathology mapping."
            )

        probabilities = torch.softmax(
            logits,
            dim=-1,
        )[0]

        top_probabilities, top_ids = torch.topk(
            probabilities,
            k=top_k,
        )

        predictions: list[dict] = []

        for probability, class_id in zip(
            top_probabilities.tolist(),
            top_ids.tolist(),
        ):
            class_id = int(class_id)
            probability = float(probability)
            condition = self.pathology_name(class_id)

            # Return both names for compatibility with the older and newer
            # callers in this project.
            predictions.append(
                {
                    "class_id": class_id,
                    "pathology": condition,
                    "condition": condition,
                    "probability": probability,
                    "probability_percent": round(
                        probability * 100.0,
                        4,
                    ),
                }
            )

        return {
            "status": "prediction_generated",
            "evidence_atoms": atoms,
            "age": float(age),
            "sex": self.encode_sex(sex),
            "predictions": predictions,
        }

    # =========================================================================
    # NATURAL-LANGUAGE INFERENCE
    # =========================================================================

    @torch.no_grad()
    def predict(
        self,
        text: str,
        age: float,
        sex: str | int,
        top_k: int = DEFAULT_TOP_K,
    ) -> dict:
        """
        Natural-language entry point.

        Unlike the old implementation, this method:
          - keeps negated evidence visible,
          - never sends negated evidence to the model,
          - correctly handles categorical/value atoms,
          - exposes the same direct-evidence interface used by the
            conversational engine.
        """

        text = str(text).strip()

        if not text:
            raise ValueError(
                "Patient text cannot be empty."
            )

        extraction = self.extract_evidence(text)
        atoms = extraction["evidence_atoms"]

        if not atoms:
            return {
                "status": "no_supported_evidence",
                "input_text": text,
                "age": float(age),
                "sex": self.encode_sex(sex),
                "evidence_atoms": [],
                "negated_evidence": extraction["negated_codes"],
                "extraction": extraction,
                "predictions": [],
                "warning": (
                    "No supported positive DDXPlus evidence was "
                    "extracted from the input."
                ),
            }

        result = self.predict_from_evidence(
            evidence_codes=atoms,
            age=age,
            sex=sex,
            top_k=top_k,
        )

        result["input_text"] = text
        result["negated_evidence"] = extraction[
            "negated_codes"
        ]
        result["extraction"] = extraction

        return result

    # =========================================================================
    # DISPLAY
    # =========================================================================

    @staticmethod
    def display_result(result: dict) -> None:
        print()
        print("=" * 80)
        print("MEDI TWIN - MODULE 2 PREDICTION")
        print("=" * 80)

        print(
            f"Input:\n"
            f"{result.get('input_text', '')}"
        )

        print()
        print(f"Age : {result.get('age')}")

        sex = result.get("sex")
        sex_name = {
            0: "Female",
            1: "Male",
            2: "Unknown",
        }.get(sex, "Unknown")

        print(f"Sex : {sex_name}")

        print()
        print("-" * 80)
        print("POSITIVE DDXPLUS EVIDENCE")
        print("-" * 80)

        atoms = result.get("evidence_atoms", [])

        if atoms:
            for atom in atoms:
                print(f"+ {atom}")
        else:
            print("No supported positive evidence.")

        print()
        print("-" * 80)
        print("NEGATED DDXPLUS EVIDENCE")
        print("-" * 80)

        negated = result.get("negated_evidence", [])

        if negated:
            for atom in negated:
                print(f"- {atom}")
        else:
            print("None")

        print()
        print("-" * 80)
        print("TOP PREDICTIONS")
        print("-" * 80)

        predictions = result.get("predictions", [])

        if not predictions:
            print("No prediction generated.")

            warning = result.get("warning")
            if warning:
                print()
                print(f"Reason: {warning}")

            return

        for index, prediction in enumerate(
            predictions,
            start=1,
        ):
            name = (
                prediction.get("pathology")
                or prediction.get("condition")
                or "Unknown"
            )

            percent = prediction.get(
                "probability_percent"
            )

            if percent is None:
                percent = (
                    float(
                        prediction.get(
                            "probability",
                            0.0,
                        )
                    )
                    * 100.0
                )

            print(f"{index}. {name}")
            print(
                f"   Probability: {float(percent):.4f}%"
            )

        print()
        print("=" * 80)


# =============================================================================
# REGRESSION TESTS
# =============================================================================

def run_tests() -> None:
    """
    Small tests only. These test the interfaces that previously caused
    failures; they do not retrain anything.
    """

    print()
    print("=" * 80)
    print("MEDI TWIN - FINAL INFERENCE PIPELINE REGRESSION TEST")
    print("=" * 80)

    pipeline = MediTwinInferencePipeline()

    tests = [
        {
            "name": "Shortness of breath",
            "text": "I feel short of breath.",
            "age": 35,
            "sex": "Male",
        },
        {
            "name": "Misspelled breathing",
            "text": "I am having difficlty breathing.",
            "age": 35,
            "sex": "Male",
        },
        {
            "name": "Pain + numeric intensity",
            "text": (
                "I have pain in my lower chest "
                "and the pain is 8 out of 10."
            ),
            "age": 45,
            "sex": "Male",
        },
        {
            "name": "Cough + sputum",
            "text": "I have a cough with yellow sputum.",
            "age": 25,
            "sex": "Female",
        },
        {
            "name": "Negated fever",
            "text": "I don't have fever.",
            "age": 30,
            "sex": "Male",
        },
        {
            "name": "Coughing blood typo",
            "text": "I have been caughing up blud.",
            "age": 40,
            "sex": "Male",
        },
        {
            "name": "Unsupported headache",
            "text": "I have a headache.",
            "age": 30,
            "sex": "Male",
        },
    ]

    for index, test in enumerate(
        tests,
        start=1,
    ):
        print()
        print("#" * 80)
        print(
            f"TEST {index} - {test['name']}"
        )
        print("#" * 80)

        try:
            result = pipeline.predict(
                text=test["text"],
                age=test["age"],
                sex=test["sex"],
                top_k=3,
            )

            pipeline.display_result(result)

        except Exception as exc:
            print()
            print("❌ TEST FAILED")
            print(
                f"{type(exc).__name__}: {exc}"
            )

    # -------------------------------------------------------------------------
    # Direct evidence interface test.
    # This is the critical test for conversation_engine.py.
    # -------------------------------------------------------------------------

    print()
    print("#" * 80)
    print("DIRECT EVIDENCE INTERFACE TEST")
    print("#" * 80)

    try:
        direct = pipeline.predict_from_evidence(
            evidence_codes=["E_66"],
            age=35,
            sex="Male",
            top_k=3,
        )

        print("[OK] predict_from_evidence() works")
        print(
            f"Evidence: {direct['evidence_atoms']}"
        )

        for prediction in direct["predictions"]:
            print(
                f"  {prediction['pathology']}: "
                f"{prediction['probability_percent']:.4f}%"
            )

    except Exception as exc:
        print("❌ DIRECT EVIDENCE TEST FAILED")
        print(
            f"{type(exc).__name__}: {exc}"
        )

    print()
    print("=" * 80)
    print("REGRESSION TEST COMPLETE")
    print("=" * 80)


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    run_tests()
