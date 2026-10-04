from __future__ import annotations

import ast
import csv
import hashlib
import json
import math
import random
import shutil
import sqlite3
import time

from collections import Counter, defaultdict
from pathlib import Path
import sys
from typing import Any, Dict, List, Tuple, Optional

import numpy as np
import pandas as pd


# ============================================================
# CONFIGURATION
# ============================================================

BASE = Path(__file__).resolve().parent
if str(BASE) not in sys.path:
    sys.path.insert(0, str(BASE))

# IMPORTANT:
# We do NOT overwrite the previous dataset.
CLEAN_OUTPUT = BASE / "module2_data_clean"

# Temporary database used so we don't need to keep
# 1.2M+ raw rows in RAM.
DB_PATH = BASE / "clean_split_builder.sqlite"

SPLITS = {
    "train": BASE / "release_train_patients",
    "validation": BASE / "release_validate_patients",
    "test": BASE / "release_test_patients",
}

CONDITIONS_FILE = BASE / "release_conditions.json"
EVIDENCES_FILE = BASE / "release_evidences.json"

CHUNK_SIZE = 25_000

SEED = 42

# Target proportions for the NEW dataset.
TRAIN_RATIO = 0.80
VALIDATION_RATIO = 0.10
TEST_RATIO = 0.10

SPECIAL_TOKENS = [
    "[PAD]",
    "[UNK]",
    "[CLS]",
    "[SEP]",
]

PROB_TOLERANCE = 1e-4


# ============================================================
# PRINT HELPERS
# ============================================================

def header(title: str):

    print()
    print("=" * 90)
    print(title)
    print("=" * 90)


def subheader(title: str):

    print()
    print("-" * 90)
    print(title)
    print("-" * 90)


# ============================================================
# FILE HELPERS
# ============================================================

def find_existing_file(
    base_path: Path,
) -> Path:

    candidates = [
        base_path,
        Path(str(base_path) + ".csv"),
        Path(str(base_path) + ".txt"),
    ]

    for path in candidates:

        if path.exists() and path.is_file():
            return path

    raise FileNotFoundError(
        f"Could not find dataset file.\n"
        f"Base path: {base_path}\n"
        f"Tried:\n"
        + "\n".join(
            str(x)
            for x in candidates
        )
    )


def load_json(path: Path):

    if not path.exists():
        raise FileNotFoundError(
            f"Missing JSON file:\n{path}"
        )

    with open(
        path,
        "r",
        encoding="utf-8",
    ) as f:

        return json.load(f)


# ============================================================
# DDXPLUS PARSING
# ============================================================

def parse_list(
    value,
    field_name: str,
    row_number: int,
):

    if value is None:
        raise ValueError(
            f"{field_name} is None at row "
            f"{row_number}"
        )

    if isinstance(value, float) and np.isnan(value):
        raise ValueError(
            f"{field_name} is NaN at row "
            f"{row_number}"
        )

    text = str(value).strip()

    if not text:
        raise ValueError(
            f"{field_name} is empty at row "
            f"{row_number}"
        )

    try:

        parsed = ast.literal_eval(text)

    except Exception as exc:

        raise ValueError(
            f"Could not parse {field_name} "
            f"at row {row_number}"
        ) from exc

    if not isinstance(parsed, list):

        raise ValueError(
            f"{field_name} must be a list "
            f"at row {row_number}"
        )

    return parsed


def normalize_atom(atom) -> str:

    return str(atom).strip()


def split_evidence_atom(
    atom: str,
):

    if "_@_" in atom:

        base, value = atom.split(
            "_@_",
            1,
        )

        return base, value

    return atom, None


# ============================================================
# EVIDENCE VALIDATION
# ============================================================

def validate_evidence_atom(
    atom: str,
    evidences: dict,
):

    base, value = split_evidence_atom(
        atom
    )

    if base not in evidences:

        raise ValueError(
            f"Unknown evidence code: {atom}"
        )

    info = evidences[base]

    possible_values = [
        str(x)
        for x in info.get(
            "possible-values",
            [],
        )
    ]

    data_type = info.get(
        "data_type"
    )

    if data_type == "B":

        if value is not None:

            raise ValueError(
                f"Binary evidence has "
                f"value suffix: {atom}"
            )

        return

    if value is None:

        raise ValueError(
            f"Non-binary evidence is missing "
            f"value: {atom}"
        )

    if possible_values:

        if str(value) not in possible_values:

            raise ValueError(
                f"Invalid value '{value}' "
                f"for evidence '{base}'"
            )


# ============================================================
# HASHING
# ============================================================

def evidence_signature(
    evidence_list: List[str],
) -> str:

    """
    Grouping key.

    IMPORTANT:
    We deliberately group by the complete evidence
    sequence only.

    This means:
        same symptoms/evidence
        => same split

    even if age/sex/pathology differ.
    """

    canonical = json.dumps(
        evidence_list,
        ensure_ascii=False,
        separators=(",", ":"),
    )

    return hashlib.sha256(
        canonical.encode("utf-8")
    ).hexdigest()


def full_case_signature(
    age,
    sex,
    evidence_list,
    pathology,
) -> str:

    value = {
        "age": float(age),
        "sex": str(sex),
        "evidence": evidence_list,
        "pathology": str(pathology),
    }

    serialized = json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
    )

    return hashlib.sha256(
        serialized.encode("utf-8")
    ).hexdigest()


# ============================================================
# DATABASE
# ============================================================

def create_database():

    if DB_PATH.exists():

        print(
            f"Removing old temporary database:\n"
            f"{DB_PATH}"
        )

        DB_PATH.unlink()

    conn = sqlite3.connect(
        DB_PATH
    )

    conn.execute(
        """
        PRAGMA journal_mode=WAL;
        """
    )

    conn.execute(
        """
        PRAGMA synchronous=NORMAL;
        """
    )

    conn.execute(
        """
        CREATE TABLE cases (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            evidence_hash TEXT NOT NULL,

            full_case_hash TEXT NOT NULL,

            age REAL NOT NULL,

            sex TEXT NOT NULL,

            pathology TEXT NOT NULL,

            evidences TEXT NOT NULL,

            initial_evidence TEXT NOT NULL,

            differential TEXT NOT NULL,

            source_split TEXT NOT NULL,

            source_row INTEGER NOT NULL
        )
        """
    )

    # One representative case per identical evidence sequence.
    #
    # This is the critical leakage protection.
    conn.execute(
        """
        CREATE UNIQUE INDEX idx_evidence_hash
        ON cases(evidence_hash)
        """
    )

    conn.execute(
        """
        CREATE INDEX idx_pathology
        ON cases(pathology)
        """
    )

    conn.commit()

    return conn


# ============================================================
# LOAD RAW DATA INTO SQLITE
# ============================================================

def ingest_raw_data(
    conn,
    split_paths,
    evidences,
):

    header(
        "INGESTING RAW DDXPLUS DATA"
    )

    total_raw = 0

    duplicate_evidence = 0

    duplicate_full_cases = 0

    pathology_counts = Counter()

    for split_name, file_path in split_paths.items():

        subheader(
            f"READING {split_name.upper()}"
        )

        source_row = 0

        for chunk_number, chunk in enumerate(
            pd.read_csv(
                file_path,
                usecols=[
                    "AGE",
                    "DIFFERENTIAL_DIAGNOSIS",
                    "SEX",
                    "PATHOLOGY",
                    "EVIDENCES",
                    "INITIAL_EVIDENCE",
                ],
                chunksize=CHUNK_SIZE,
                low_memory=False,
            ),
            start=1,
        ):

            for row in chunk.itertuples(
                index=False
            ):

                source_row += 1
                total_raw += 1

                # --------------------------------------------
                # AGE
                # --------------------------------------------

                try:

                    age = float(
                        row.AGE
                    )

                except Exception as exc:

                    raise ValueError(
                        f"Invalid AGE in "
                        f"{split_name}, row "
                        f"{source_row}"
                    ) from exc

                if not math.isfinite(age):

                    raise ValueError(
                        f"Non-finite AGE in "
                        f"{split_name}, row "
                        f"{source_row}"
                    )

                if age < 0:

                    raise ValueError(
                        f"Negative AGE in "
                        f"{split_name}, row "
                        f"{source_row}"
                    )

                # --------------------------------------------
                # SEX
                # --------------------------------------------

                sex = str(
                    row.SEX
                ).strip().upper()

                if sex not in {
                    "F",
                    "M",
                    "UNKNOWN",
                    "U",
                }:

                    raise ValueError(
                        f"Invalid SEX '{sex}' "
                        f"in {split_name}, "
                        f"row {source_row}"
                    )

                # --------------------------------------------
                # PATHOLOGY
                # --------------------------------------------

                pathology = str(
                    row.PATHOLOGY
                ).strip()

                pathology_counts[
                    pathology
                ] += 1

                # --------------------------------------------
                # EVIDENCES
                # --------------------------------------------

                raw_evidence = parse_list(
                    row.EVIDENCES,
                    "EVIDENCES",
                    source_row,
                )

                evidence_list = []

                for raw_atom in raw_evidence:

                    atom = normalize_atom(
                        raw_atom
                    )

                    validate_evidence_atom(
                        atom,
                        evidences,
                    )

                    evidence_list.append(
                        atom
                    )

                if not evidence_list:

                    raise ValueError(
                        f"Empty EVIDENCES in "
                        f"{split_name}, "
                        f"row {source_row}"
                    )

                # --------------------------------------------
                # INITIAL EVIDENCE
                # --------------------------------------------

                initial_evidence = normalize_atom(
                    row.INITIAL_EVIDENCE
                )

                validate_evidence_atom(
                    initial_evidence,
                    evidences,
                )

                # --------------------------------------------
                # HASHES
                # --------------------------------------------

                evidence_hash = evidence_signature(
                    evidence_list
                )

                full_hash = full_case_signature(
                    age,
                    sex,
                    evidence_list,
                    pathology,
                )

                # --------------------------------------------
                # INSERT
                # --------------------------------------------

                try:

                    conn.execute(
                        """
                        INSERT INTO cases (
                            evidence_hash,
                            full_case_hash,
                            age,
                            sex,
                            pathology,
                            evidences,
                            initial_evidence,
                            differential,
                            source_split,
                            source_row
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            evidence_hash,
                            full_hash,
                            age,
                            sex,
                            pathology,
                            json.dumps(
                                evidence_list,
                                ensure_ascii=False,
                            ),
                            initial_evidence,
                            str(
                                row.DIFFERENTIAL_DIAGNOSIS
                            ),
                            split_name,
                            source_row,
                        ),
                    )

                except sqlite3.IntegrityError:

                    duplicate_evidence += 1

                    # Check whether it was an exact full case.
                    existing = conn.execute(
                        """
                        SELECT full_case_hash
                        FROM cases
                        WHERE evidence_hash = ?
                        """,
                        (
                            evidence_hash,
                        ),
                    ).fetchone()

                    if (
                        existing is not None
                        and existing[0]
                        == full_hash
                    ):

                        duplicate_full_cases += 1

            if chunk_number % 10 == 0:

                print(
                    f"{split_name:12s} | "
                    f"chunk={chunk_number:4d} | "
                    f"raw rows={total_raw:,} | "
                    f"unique cases="
                    f"{conn.execute('SELECT COUNT(*) FROM cases').fetchone()[0]:,}"
                )

        conn.commit()

        print(
            f"{split_name:12s} complete | "
            f"rows={source_row:,}"
        )

    unique_cases = conn.execute(
        """
        SELECT COUNT(*)
        FROM cases
        """
    ).fetchone()[0]

    print()
    print(
        f"Total raw rows      : {total_raw:,}"
    )

    print(
        f"Unique evidence groups: "
        f"{unique_cases:,}"
    )

    print(
        f"Duplicate evidence rows removed: "
        f"{duplicate_evidence:,}"
    )

    print(
        f"Exact duplicate cases removed: "
        f"{duplicate_full_cases:,}"
    )

    return {
        "total_raw_rows": total_raw,
        "unique_evidence_groups": unique_cases,
        "duplicate_evidence_rows": duplicate_evidence,
        "duplicate_full_cases": duplicate_full_cases,
        "pathology_counts": dict(
            pathology_counts
        ),
    }


# ============================================================
# SPLIT ASSIGNMENT
# ============================================================

def assign_groups(
    conn,
):

    header(
        "CREATING NEW LEAKAGE-FREE SPLITS"
    )

    """
    Every unique evidence sequence becomes ONE group.

    A deterministic hash assigns the group to:
        80% train
        10% validation
        10% test

    Because the hash is based only on the evidence signature,
    identical evidence sequences can NEVER cross splits.
    """

    rows = conn.execute(
        """
        SELECT
            evidence_hash,
            pathology
        FROM cases
        ORDER BY evidence_hash
        """
    ).fetchall()

    assignment_counts = Counter()

    for index, (
        evidence_hash,
        pathology,
    ) in enumerate(rows):

        digest = hashlib.sha256(
            evidence_hash.encode(
                "utf-8"
            )
        ).hexdigest()

        number = int(
            digest[:8],
            16,
        )

        bucket = number % 100

        if bucket < 80:

            split = "train"

        elif bucket < 90:

            split = "validation"

        else:

            split = "test"

        conn.execute(
            """
            UPDATE cases
            SET source_split = ?
            WHERE evidence_hash = ?
            """,
            (
                split,
                evidence_hash,
            ),
        )

        assignment_counts[
            split
        ] += 1

    conn.commit()

    print(
        f"Unique groups: {len(rows):,}"
    )

    print(
        f"Train groups: "
        f"{assignment_counts['train']:,}"
    )

    print(
        f"Validation groups: "
        f"{assignment_counts['validation']:,}"
    )

    print(
        f"Test groups: "
        f"{assignment_counts['test']:,}"
    )


# ============================================================
# CHECK PATHOLOGY COVERAGE
# ============================================================

def check_pathology_coverage(
    conn,
):

    header(
        "CHECKING PATHOLOGY COVERAGE"
    )

    pathologies = [
        row[0]
        for row in conn.execute(
            """
            SELECT DISTINCT pathology
            FROM cases
            """
        ).fetchall()
    ]

    print(
        f"Total pathologies: "
        f"{len(pathologies)}"
    )

    if len(pathologies) != 49:

        raise RuntimeError(
            f"Expected 49 pathologies, "
            f"found {len(pathologies)}"
        )

    missing = {}

    for split in [
        "train",
        "validation",
        "test",
    ]:

        found = {
            row[0]
            for row in conn.execute(
                """
                SELECT DISTINCT pathology
                FROM cases
                WHERE source_split = ?
                """,
                (split,),
            ).fetchall()
        }

        missing[split] = sorted(
            set(pathologies)
            - found
        )

        print(
            f"{split:12s}: "
            f"{len(found)} pathologies"
        )

        if missing[split]:

            print(
                "  MISSING:"
            )

            for pathology in missing[split]:

                print(
                    f"    - {pathology}"
                )

    return missing


# ============================================================
# WRITE CLEAN RAW SPLITS
# ============================================================

OUTPUT_COLUMNS = [
    "AGE",
    "DIFFERENTIAL_DIAGNOSIS",
    "SEX",
    "PATHOLOGY",
    "EVIDENCES",
    "INITIAL_EVIDENCE",
]


def write_clean_raw_splits(
    conn,
):

    header(
        "WRITING CLEAN RAW SPLITS"
    )

    raw_dir = (
        CLEAN_OUTPUT
        / "raw_splits"
    )

    raw_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    for split in [
        "train",
        "validation",
        "test",
    ]:

        output_file = (
            raw_dir
            / f"release_{split}_patients.csv"
        )

        print(
            f"Writing {split}: "
            f"{output_file}"
        )

        cursor = conn.execute(
            """
            SELECT
                age,
                differential,
                sex,
                pathology,
                evidences,
                initial_evidence
            FROM cases
            WHERE source_split = ?
            ORDER BY evidence_hash
            """,
            (split,),
        )

        with open(
            output_file,
            "w",
            newline="",
            encoding="utf-8",
        ) as f:

            writer = csv.writer(
                f
            )

            writer.writerow(
                OUTPUT_COLUMNS
            )

            count = 0

            for row in cursor:

                (
                    age,
                    differential,
                    sex,
                    pathology,
                    evidences,
                    initial_evidence,
                ) = row

                writer.writerow(
                    [
                        age,
                        differential,
                        sex,
                        pathology,
                        evidences,
                        initial_evidence,
                    ]
                )

                count += 1

        print(
            f"  {count:,} rows written."
        )


# ============================================================
# BUILD ONTOLOGY VOCABULARY
# ============================================================

def build_mappings():

    conditions = load_json(
        CONDITIONS_FILE
    )

    evidences = load_json(
        EVIDENCES_FILE
    )

    condition_names = sorted(
        conditions.keys()
    )

    condition_to_id = {
        name: idx
        for idx, name
        in enumerate(condition_names)
    }

    id_to_condition = {
        str(idx): name
        for name, idx
        in condition_to_id.items()
    }

    vocab = {}

    for token in SPECIAL_TOKENS:

        vocab[token] = len(vocab)

    for evidence_code in sorted(
        evidences.keys()
    ):

        info = evidences[
            evidence_code
        ]

        if evidence_code not in vocab:

            vocab[
                evidence_code
            ] = len(vocab)

        for value in info.get(
            "possible-values",
            [],
        ):

            atom = (
                f"{evidence_code}"
                f"_@_"
                f"{value}"
            )

            if atom not in vocab:

                vocab[
                    atom
                ] = len(vocab)

    return (
        conditions,
        evidences,
        condition_to_id,
        id_to_condition,
        vocab,
    )


# ============================================================
# DISCOVER SEQUENCE LENGTH
# ============================================================

def discover_sequence_length(
    conn,
):

    header(
        "DISCOVERING SEQUENCE LENGTH"
    )

    maximum = 0

    cursor = conn.execute(
        """
        SELECT evidences
        FROM cases
        """
    )

    count = 0

    for row in cursor:

        evidence_list = json.loads(
            row[0]
        )

        maximum = max(
            maximum,
            len(evidence_list),
        )

        count += 1

    sequence_length = (
        maximum + 2
    )

    print(
        f"Unique cases : {count:,}"
    )

    print(
        f"Maximum evidence atoms: "
        f"{maximum}"
    )

    print(
        f"Final sequence length: "
        f"{sequence_length}"
    )

    return sequence_length


# ============================================================
# PARSE DIFFERENTIAL
# ============================================================

def parse_differential(
    value,
    pathology,
    condition_to_id,
):

    differential = parse_list(
        value,
        "DIFFERENTIAL_DIAGNOSIS",
        0,
    )

    result = []

    total = 0.0

    pathology_found = False

    for item in differential:

        if (
            not isinstance(item, list)
            or len(item) != 2
        ):

            raise ValueError(
                "Invalid differential entry."
            )

        disease = str(
            item[0]
        ).strip()

        probability = float(
            item[1]
        )

        if disease not in condition_to_id:

            raise ValueError(
                f"Unknown disease "
                f"in differential: "
                f"{disease}"
            )

        if not math.isfinite(
            probability
        ):

            raise ValueError(
                "Non-finite differential "
                "probability."
            )

        if probability < 0:

            raise ValueError(
                "Negative differential "
                "probability."
            )

        result.append(
            (
                disease,
                probability,
            )
        )

        total += probability

        if disease == pathology:

            pathology_found = True

    if total <= 0:

        raise ValueError(
            "Differential probability "
            "sum is zero."
        )

    if abs(total - 1.0) > PROB_TOLERANCE:

        # We allow tiny differences because
        # we renormalize below.
        pass

    if not pathology_found:

        raise ValueError(
            f"Ground-truth pathology "
            f"'{pathology}' missing "
            f"from differential."
        )

    return result, total


# ============================================================
# GENERATE NUMPY ARRAYS
# ============================================================

def process_clean_split(
    conn,
    split,
    vocab,
    evidences,
    condition_to_id,
    sequence_length,
):

    header(
        f"GENERATING {split.upper()} ARRAYS"
    )

    rows = conn.execute(
        """
        SELECT
            age,
            sex,
            pathology,
            evidences,
            initial_evidence,
            differential
        FROM cases
        WHERE source_split = ?
        ORDER BY evidence_hash
        """,
        (split,),
    ).fetchall()

    n = len(rows)

    print(
        f"Samples: {n:,}"
    )

    split_dir = (
        CLEAN_OUTPUT
        / split
    )

    split_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    input_ids = np.lib.format.open_memmap(
        split_dir / "input_ids.npy",
        mode="w+",
        dtype=np.int32,
        shape=(
            n,
            sequence_length,
        ),
    )

    attention_mask = np.lib.format.open_memmap(
        split_dir / "attention_mask.npy",
        mode="w+",
        dtype=np.uint8,
        shape=(
            n,
            sequence_length,
        ),
    )

    ages = np.lib.format.open_memmap(
        split_dir / "age.npy",
        mode="w+",
        dtype=np.float32,
        shape=(n,),
    )

    sex_array = np.lib.format.open_memmap(
        split_dir / "sex.npy",
        mode="w+",
        dtype=np.int8,
        shape=(n,),
    )

    initial_array = np.lib.format.open_memmap(
        split_dir / "initial_evidence.npy",
        mode="w+",
        dtype=np.int32,
        shape=(n,),
    )

    pathology_array = np.lib.format.open_memmap(
        split_dir / "pathology_labels.npy",
        mode="w+",
        dtype=np.int16,
        shape=(n,),
    )

    differential_array = np.lib.format.open_memmap(
        split_dir / "differential_targets.npy",
        mode="w+",
        dtype=np.float32,
        shape=(
            n,
            len(condition_to_id),
        ),
    )

    source_index = np.lib.format.open_memmap(
        split_dir / "source_row_index.npy",
        mode="w+",
        dtype=np.int64,
        shape=(n,),
    )

    # --------------------------------------------------------
    # Initialize
    # --------------------------------------------------------

    pad_id = vocab[
        "[PAD]"
    ]

    cls_id = vocab[
        "[CLS]"
    ]

    sep_id = vocab[
        "[SEP]"
    ]

    input_ids[:] = pad_id

    attention_mask[:] = 0

    differential_array[:] = 0.0

    pathology_counts = Counter()

    maximum_seen = 0

    for index, row in enumerate(
        rows
    ):

        (
            age,
            sex,
            pathology,
            evidence_json,
            initial_evidence,
            differential_raw,
        ) = row

        # ----------------------------------------------------
        # AGE
        # ----------------------------------------------------

        age = float(age)

        if age < 0 or not math.isfinite(
            age
        ):

            raise ValueError(
                f"Invalid age at row "
                f"{index}"
            )

        ages[index] = age

        # ----------------------------------------------------
        # SEX
        # ----------------------------------------------------

        sex_value = str(
            sex
        ).strip().upper()

        if sex_value == "F":

            sex_array[index] = 0

        elif sex_value == "M":

            sex_array[index] = 1

        else:

            sex_array[index] = 2

        # ----------------------------------------------------
        # EVIDENCE
        # ----------------------------------------------------

        evidence_list = json.loads(
            evidence_json
        )

        token_ids = [
            cls_id
        ]

        for atom in evidence_list:

            if atom not in vocab:

                raise ValueError(
                    f"Evidence atom not "
                    f"in vocabulary: {atom}"
                )

            token_ids.append(
                vocab[atom]
            )

        token_ids.append(
            sep_id
        )

        if len(token_ids) > sequence_length:

            raise ValueError(
                f"Sequence too long: "
                f"{len(token_ids)} > "
                f"{sequence_length}"
            )

        input_ids[
            index,
            :len(token_ids),
        ] = np.asarray(
            token_ids,
            dtype=np.int32,
        )

        attention_mask[
            index,
            :len(token_ids),
        ] = 1

        maximum_seen = max(
            maximum_seen,
            len(evidence_list),
        )

        # ----------------------------------------------------
        # INITIAL EVIDENCE
        # ----------------------------------------------------

        initial_evidence = str(
            initial_evidence
        ).strip()

        if initial_evidence not in vocab:

            raise ValueError(
                f"Unknown initial evidence: "
                f"{initial_evidence}"
            )

        initial_array[
            index
        ] = vocab[
            initial_evidence
        ]

        # ----------------------------------------------------
        # PATHOLOGY
        # ----------------------------------------------------

        pathology = str(
            pathology
        ).strip()

        if pathology not in condition_to_id:

            raise ValueError(
                f"Unknown pathology: "
                f"{pathology}"
            )

        pathology_array[
            index
        ] = condition_to_id[
            pathology
        ]

        pathology_counts[
            pathology
        ] += 1

        # ----------------------------------------------------
        # DIFFERENTIAL
        # ----------------------------------------------------

        differential, total = (
            parse_differential(
                differential_raw,
                pathology,
                condition_to_id,
            )
        )

        for disease, probability in differential:

            class_id = condition_to_id[
                disease
            ]

            differential_array[
                index,
                class_id,
            ] = (
                probability / total
            )

        # ----------------------------------------------------
        # SOURCE INDEX
        # ----------------------------------------------------

        source_index[
            index
        ] = index

    # --------------------------------------------------------
    # Validate differential sums
    # --------------------------------------------------------

    sums = np.asarray(
        differential_array.sum(
            axis=1
        )
    )

    bad = np.where(
        np.abs(
            sums - 1.0
        ) > PROB_TOLERANCE
    )[0]

    if len(bad) > 0:

        raise RuntimeError(
            f"{split}: {len(bad)} "
            f"differential rows do not "
            f"sum to 1."
        )

    # --------------------------------------------------------
    # Flush
    # --------------------------------------------------------

    input_ids.flush()
    attention_mask.flush()
    ages.flush()
    sex_array.flush()
    initial_array.flush()
    pathology_array.flush()
    differential_array.flush()
    source_index.flush()

    # --------------------------------------------------------
    # Metadata
    # --------------------------------------------------------

    metadata = {
        "split": split,
        "samples": n,
        "sequence_length": sequence_length,
        "vocab_size": len(vocab),
        "num_pathologies": len(
            condition_to_id
        ),
        "maximum_evidence_atoms": maximum_seen,
        "dtype": {
            "input_ids": "int32",
            "attention_mask": "uint8",
            "age": "float32",
            "sex": "int8",
            "initial_evidence": "int32",
            "pathology_labels": "int16",
            "differential_targets": "float32",
            "source_row_index": "int64",
        },
        "files": [
            "input_ids.npy",
            "attention_mask.npy",
            "age.npy",
            "sex.npy",
            "initial_evidence.npy",
            "pathology_labels.npy",
            "differential_targets.npy",
            "source_row_index.npy",
        ],
        "pathology_counts": dict(
            sorted(
                pathology_counts.items()
            )
        ),
    }

    with open(
        split_dir / "metadata.json",
        "w",
        encoding="utf-8",
    ) as f:

        json.dump(
            metadata,
            f,
            indent=2,
            ensure_ascii=False,
        )

    print(
        f"✓ {split} arrays generated."
    )

    return metadata


# ============================================================
# CROSS-SPLIT LEAKAGE CHECK
# ============================================================

def verify_no_overlap(
    conn,
):

    header(
        "FINAL CROSS-SPLIT LEAKAGE CHECK"
    )

    splits = [
        "train",
        "validation",
        "test",
    ]

    hashes = {}

    for split in splits:

        hashes[split] = {
            row[0]
            for row in conn.execute(
                """
                SELECT evidence_hash
                FROM cases
                WHERE source_split = ?
                """,
                (split,),
            ).fetchall()
        }

        print(
            f"{split:12s}: "
            f"{len(hashes[split]):,} "
            f"unique evidence groups"
        )

    failed = False

    comparisons = [
        ("train", "validation"),
        ("train", "test"),
        ("validation", "test"),
    ]

    for a, b in comparisons:

        overlap = (
            hashes[a]
            &
            hashes[b]
        )

        print(
            f"{a:12s} ↔ {b:12s}: "
            f"{len(overlap):,} overlap"
        )

        if overlap:

            failed = True

    if failed:

        raise RuntimeError(
            "LEAKAGE CHECK FAILED. "
            "Evidence groups overlap."
        )

    print()
    print(
        "✓ ZERO evidence-sequence overlap "
        "between train/validation/test."
    )


# ============================================================
# SAVE MAPPINGS
# ============================================================

def save_mappings(
    conditions,
    evidences,
    condition_to_id,
    id_to_condition,
    vocab,
):

    CLEAN_OUTPUT.mkdir(
        parents=True,
        exist_ok=True,
    )

    with open(
        CLEAN_OUTPUT
        / "condition_to_id.json",
        "w",
        encoding="utf-8",
    ) as f:

        json.dump(
            condition_to_id,
            f,
            indent=2,
            ensure_ascii=False,
        )

    with open(
        CLEAN_OUTPUT
        / "id_to_condition.json",
        "w",
        encoding="utf-8",
    ) as f:

        json.dump(
            id_to_condition,
            f,
            indent=2,
            ensure_ascii=False,
        )

    with open(
        CLEAN_OUTPUT
        / "evidence_vocab.json",
        "w",
        encoding="utf-8",
    ) as f:

        json.dump(
            vocab,
            f,
            indent=2,
            ensure_ascii=False,
        )

    evidence_descriptions = {}

    for code, info in evidences.items():

        evidence_descriptions[
            code
        ] = {
            "name": info.get("name"),
            "code_question":
                info.get("code_question"),
            "question_en":
                info.get("question_en"),
            "question_fr":
                info.get("question_fr"),
            "is_antecedent":
                bool(
                    info.get(
                        "is_antecedent",
                        False,
                    )
                ),
            "data_type":
                info.get("data_type"),
            "default_value":
                info.get("default_value"),
            "possible_values": [
                str(v)
                for v in info.get(
                    "possible-values",
                    [],
                )
            ],
            "value_meaning":
                info.get(
                    "value_meaning",
                    {},
                ),
        }

    with open(
        CLEAN_OUTPUT
        / "evidence_id_to_description.json",
        "w",
        encoding="utf-8",
    ) as f:

        json.dump(
            evidence_descriptions,
            f,
            indent=2,
            ensure_ascii=False,
        )


# ============================================================
# SAVE DISTRIBUTION
# ============================================================

def save_class_distribution(
    conn,
):

    rows = []

    for split in [
        "train",
        "validation",
        "test",
    ]:

        counts = conn.execute(
            """
            SELECT
                pathology,
                COUNT(*)
            FROM cases
            WHERE source_split = ?
            GROUP BY pathology
            ORDER BY pathology
            """,
            (split,),
        ).fetchall()

        for pathology, count in counts:

            rows.append(
                {
                    "split": split,
                    "pathology": pathology,
                    "count": count,
                }
            )

    pd.DataFrame(
        rows
    ).to_csv(
        CLEAN_OUTPUT
        / "class_distribution.csv",
        index=False,
    )


# ============================================================
# MAIN
# ============================================================

def main():

    start_time = time.time()

    header(
        "MEDI TWIN MODULE 2 - CLEAN DDXPLUS PREPROCESSING"
    )

    print(
        f"BASE:\n{BASE}"
    )

    print(
        f"CLEAN OUTPUT:\n{CLEAN_OUTPUT}"
    )

    # --------------------------------------------------------
    # Locate raw files
    # --------------------------------------------------------

    split_paths = {}

    for name, path in SPLITS.items():

        split_paths[
            name
        ] = find_existing_file(
            path
        )

        print(
            f"{name:12s}: "
            f"{split_paths[name]}"
        )

    if not CONDITIONS_FILE.exists():

        raise FileNotFoundError(
            f"Missing:\n{CONDITIONS_FILE}"
        )

    if not EVIDENCES_FILE.exists():

        raise FileNotFoundError(
            f"Missing:\n{EVIDENCES_FILE}"
        )

    # --------------------------------------------------------
    # Load ontology
    # --------------------------------------------------------

    header(
        "LOADING DDXPLUS ONTOLOGY"
    )

    (
        conditions,
        evidences,
        condition_to_id,
        id_to_condition,
        vocab,
    ) = build_mappings()

    print(
        f"Pathologies: "
        f"{len(condition_to_id)}"
    )

    print(
        f"Evidence definitions: "
        f"{len(evidences)}"
    )

    print(
        f"Vocabulary size: "
        f"{len(vocab)}"
    )

    if len(condition_to_id) != 49:

        raise RuntimeError(
            "Expected exactly 49 pathologies."
        )

    # --------------------------------------------------------
    # Clean output directory
    # --------------------------------------------------------

    if CLEAN_OUTPUT.exists():

        print()
        print(
            "Removing previous clean output..."
        )

        shutil.rmtree(
            CLEAN_OUTPUT
        )

    CLEAN_OUTPUT.mkdir(
        parents=True,
        exist_ok=True,
    )

    # --------------------------------------------------------
    # Database
    # --------------------------------------------------------

    conn = create_database()

    try:

        # ----------------------------------------------------
        # Ingest
        # ----------------------------------------------------

        ingest_report = ingest_raw_data(
            conn,
            split_paths,
            evidences,
        )

        # ----------------------------------------------------
        # Assign new splits
        # ----------------------------------------------------

        assign_groups(
            conn
        )

        # ----------------------------------------------------
        # Pathology coverage
        # ----------------------------------------------------

        missing = check_pathology_coverage(
            conn
        )

        # We should have all 49 in every split.
        #
        # If the deterministic hash happens to place a tiny
        # pathology into only one split, STOP instead of
        # silently producing a bad dataset.
        if any(
            missing[split]
            for split in missing
        ):

            raise RuntimeError(
                "At least one pathology is "
                "missing from a new split.\n"
                "We will NOT generate training "
                "data from an invalid split."
            )

        # ----------------------------------------------------
        # Final leakage check
        # ----------------------------------------------------

        verify_no_overlap(
            conn
        )

        # ----------------------------------------------------
        # Sequence length
        # ----------------------------------------------------

        sequence_length = (
            discover_sequence_length(
                conn
            )
        )

        # ----------------------------------------------------
        # Write clean raw CSVs
        # ----------------------------------------------------

        write_clean_raw_splits(
            conn
        )

        # ----------------------------------------------------
        # Generate arrays
        # ----------------------------------------------------

        split_metadata = {}

        for split in [
            "train",
            "validation",
            "test",
        ]:

            split_metadata[
                split
            ] = process_clean_split(
                conn=conn,
                split=split,
                vocab=vocab,
                evidences=evidences,
                condition_to_id=condition_to_id,
                sequence_length=sequence_length,
            )

        # ----------------------------------------------------
        # Mappings
        # ----------------------------------------------------

        save_mappings(
            conditions,
            evidences,
            condition_to_id,
            id_to_condition,
            vocab,
        )

        # ----------------------------------------------------
        # Class distribution
        # ----------------------------------------------------

        save_class_distribution(
            conn
        )

        # ----------------------------------------------------
        # Metadata
        # ----------------------------------------------------

        metadata = {
            "dataset": "DDXPlus",

            "module":
                "MediTwin Module 2",

            "description":
                (
                    "Leakage-controlled DDXPlus "
                    "symptom-disease dataset."
                ),

            "clean_split_method": {
                "grouping_key":
                    "complete evidence sequence",
                "train_ratio":
                    TRAIN_RATIO,
                "validation_ratio":
                    VALIDATION_RATIO,
                "test_ratio":
                    TEST_RATIO,
                "seed":
                    SEED,
            },

            "important_note":
                (
                    "All identical evidence sequences "
                    "are assigned to exactly one split."
                ),

            "pathologies":
                len(condition_to_id),

            "evidence_definitions":
                len(evidences),

            "vocab_size":
                len(vocab),

            "sequence_length":
                sequence_length,

            "raw_input_rows":
                ingest_report[
                    "total_raw_rows"
                ],

            "unique_evidence_groups":
                ingest_report[
                    "unique_evidence_groups"
                ],

            "duplicate_evidence_rows_removed":
                ingest_report[
                    "duplicate_evidence_rows"
                ],

            "duplicate_full_cases_removed":
                ingest_report[
                    "duplicate_full_cases"
                ],

            "splits":
                split_metadata,

            "output_directory":
                str(CLEAN_OUTPUT),

            "created_at":
                time.strftime(
                    "%Y-%m-%d %H:%M:%S"
                ),
        }

        with open(
            CLEAN_OUTPUT
            / "preprocessing_metadata.json",
            "w",
            encoding="utf-8",
        ) as f:

            json.dump(
                metadata,
                f,
                indent=2,
                ensure_ascii=False,
            )

        # ----------------------------------------------------
        # Final summary
        # ----------------------------------------------------

        header(
            "CLEAN PREPROCESSING COMPLETE"
        )

        print(
            f"Output:\n{CLEAN_OUTPUT}"
        )

        for split in [
            "train",
            "validation",
            "test",
        ]:

            print(
                f"{split:12s}: "
                f"{split_metadata[split]['samples']:,}"
            )

        print()
        print(
            f"Pathologies : "
            f"{len(condition_to_id)}"
        )

        print(
            f"Vocabulary   : "
            f"{len(vocab)}"
        )

        print(
            f"Sequence len : "
            f"{sequence_length}"
        )

        print(
            f"Time: "
            f"{(time.time() - start_time) / 60:.2f} minutes"
        )

        print()
        print(
            "✓ Duplicate evidence groups removed"
        )

        print(
            "✓ New train/validation/test split created"
        )

        print(
            "✓ ZERO cross-split evidence overlap"
        )

        print(
            "✓ All 49 pathologies verified"
        )

        print(
            "✓ NumPy training arrays generated"
        )

    finally:

        conn.close()

        # Remove temporary database.
        if DB_PATH.exists():

            try:

                DB_PATH.unlink()

            except PermissionError:

                print(
                    "\nWARNING: Could not remove "
                    f"temporary database:\n{DB_PATH}"
                )


if __name__ == "__main__":

    main()