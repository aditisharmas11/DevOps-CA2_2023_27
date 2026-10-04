from __future__ import annotations

import json
import re
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import spacy
from rapidfuzz import fuzz

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None


import sys

# ============================================================
# PATHS
# ============================================================

INFERENCE_DIR = Path(__file__).resolve().parent
BASE = INFERENCE_DIR.parent

for p in (INFERENCE_DIR, BASE):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

CATALOG_FILE = BASE / "symptom_catalog.json"
ALIASES_FILE = BASE / "mappings" / "symptom_aliases.json"


# ============================================================
# CONFIGURATION
# ============================================================

# These are handled by value_extractor.py, never by the alias matcher.
#
# FIX: this used to be a hardcoded 7-item set, but symptom_catalog.json
# actually contains 15 non-binary (categorical / multi-value) evidence
# codes. The other 8 -- E_130, E_131, E_132, E_133, E_135, E_136,
# E_152, E_204 -- are rash/lesion-characteristic or location questions
# that require a value suffix (e.g. "E_130_@_V_2"), not a bare code.
# Any alias accidentally pointing at one of those 8 would let the
# matcher emit a malformed evidence atom straight into the model. This
# is now derived directly from the catalog's data_type field so it can
# never silently drift out of sync with the ontology again.
def _load_value_based_evidence() -> set:
    try:
        with open(CATALOG_FILE, "r", encoding="utf-8") as fh:
            catalog = json.load(fh)
        return {
            item["evidence_code"]
            for item in catalog
            if item.get("data_type") != "B" and item.get("evidence_code")
        }
    except Exception:
        # Fall back to the original hardcoded set if the catalog is
        # unreadable for any reason, rather than crashing at import time.
        return {
            "E_55", "E_54", "E_57", "E_56", "E_58", "E_59", "E_134",
        }


VALUE_BASED_EVIDENCE = _load_value_based_evidence()


# ============================================================
# WORD GROUPS
# ============================================================

GRAMMAR_WORDS = {
    "i",
    "me",
    "my",
    "mine",
    "we",
    "our",
    "ours",
    "you",
    "your",
    "yours",
    "he",
    "him",
    "his",
    "she",
    "her",
    "hers",
    "they",
    "them",
    "their",
    "theirs",

    "the",
    "a",
    "an",
    "this",
    "that",
    "these",
    "those",

    "am",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",

    "have",
    "has",
    "had",
    "having",

    "do",
    "does",
    "did",

    "will",
    "would",
    "should",
    "could",
    "can",
    "may",
    "might",

    "feel",
    "feeling",
    "felt",
    "seem",
    "seems",
    "seemed",

    "very",
    "really",
    "quite",
    "just",
    "some",
    "any",
    "something",
    "someone",

    "today",
    "yesterday",
    "tomorrow",
    "currently",
    "recently",

    "for",
    "since",
    "during",
    "from",
    "with",
    "without",
    "and",
    "or",
    "but",
    "so",

    "to",
    "of",
    "in",
    "on",
    "at",
    "by",
    "as",
    "about",
    "into",

    "when",
    "while",
    "where",
    "why",
    "how",
    "than",
    "then",
}


LOW_INFORMATION_WORDS = GRAMMAR_WORDS | {
    "bad",
    "good",
    "little",
    "much",
    "more",
    "less",
    "quite",
    "really",
    "very",
    "today",
    "yesterday",
    "recently",
    "currently",
}


NEGATORS = {
    "no",
    "not",
    "never",
    "without",
    "neither",
    "nor",
    "deny",
    "denies",
    "denied",
    "absent",
}


# ============================================================
# MATCHING CONFIGURATION
# ============================================================

# Normal fuzzy matching.
FUZZY_THRESHOLD = 0.78

# For very short words, fuzzy matching is dangerous.
# A 3-letter word must normally match exactly.
MIN_FUZZY_LENGTH = 4

# Phonetic matching is only allowed for words of at least
# four characters.
MIN_PHONETIC_LENGTH = 4

# Semantic similarity is a supporting signal only.
SEMANTIC_RESCUE_THRESHOLD = 0.72

# Semantic score can never dominate lexical evidence.
MAX_SEMANTIC_BONUS = 0.18

# Minimum final score for normal acceptance.
ACCEPT_THRESHOLD = 0.60

# Scores below this are only displayed as candidates.
DISPLAY_THRESHOLD = 0.30

# Local windows should not become excessively large.
MAX_EXTRA_WINDOW = 4


# ============================================================
# DATA CLASSES
# ============================================================

@dataclass
class Token:
    text: str
    lemma: str
    pos: str
    dep: str
    index: int


@dataclass
class AliasEntry:
    key: str
    evidence_code: str
    alias: str
    normalized: str
    raw_tokens: list[str]
    lemmas: list[str]


# ============================================================
# TEXT PROCESSOR
# ============================================================

class TextProcessor:

    CONTRACTIONS = {
        "i'm": "i am",
        "im": "i am",

        "i've": "i have",
        "ive": "i have",

        "i'll": "i will",
        "ill": "i will",

        "i'd": "i would",
        "id": "i would",

        "don't": "do not",
        "dont": "do not",

        "doesn't": "does not",
        "doesnt": "does not",

        "didn't": "did not",
        "didnt": "did not",

        "can't": "cannot",
        "cant": "cannot",

        "couldn't": "could not",
        "couldnt": "could not",

        "isn't": "is not",
        "isnt": "is not",

        "aren't": "are not",
        "arent": "are not",

        "wasn't": "was not",
        "wasnt": "was not",

        "weren't": "were not",
        "werent": "were not",

        "haven't": "have not",
        "havent": "have not",

        "hasn't": "has not",
        "hasnt": "has not",

        "hadn't": "had not",
        "hadnt": "had not",

        "won't": "will not",
        "wont": "will not",

        "wouldn't": "would not",
        "wouldnt": "would not",
    }

    def __init__(self):

        try:

            self.nlp = spacy.load(
                "en_core_web_sm"
            )

        except OSError as exc:

            raise RuntimeError(
                "\n\nspaCy model "
                "'en_core_web_sm' is missing.\n\n"
                "Install it with:\n"
                "py -m spacy download en_core_web_sm\n"
            ) from exc

    # --------------------------------------------------------

    def normalize(
        self,
        text: str,
    ) -> str:

        text = str(
            text
        ).lower().strip()

        for old, new in self.CONTRACTIONS.items():

            text = re.sub(
                rf"\b{re.escape(old)}\b",
                new,
                text,
            )

        text = re.sub(
            r"[^a-z0-9\s]",
            " ",
            text,
        )

        text = re.sub(
            r"\s+",
            " ",
            text,
        )

        return text.strip()

    # --------------------------------------------------------

    def document(
        self,
        text: str,
    ):

        return self.nlp(
            self.normalize(text)
        )

    # --------------------------------------------------------

    def tokens(
        self,
        text: str,
    ) -> list[Token]:

        doc = self.document(
            text
        )

        result = []

        for token in doc:

            raw = (
                token.text
                .lower()
                .strip()
            )

            lemma = (
                token.lemma_
                .lower()
                .strip()
            )

            if not raw:
                continue

            if not re.search(
                r"[a-z]",
                raw,
            ):
                continue

            result.append(
                Token(
                    text=raw,
                    lemma=lemma,
                    pos=token.pos_,
                    dep=token.dep_,
                    index=token.i,
                )
            )

        return result

    # --------------------------------------------------------

    def concept_tokens(
        self,
        text: str,
    ) -> list[Token]:

        return [
            token
            for token in self.tokens(text)
            if token.lemma
            not in GRAMMAR_WORDS
        ]


# ============================================================
# SOUND / PHONETIC MATCHING
# ============================================================

class PhoneticMatcher:
    """
    Lightweight Soundex-style phonetic matching.

    This is intentionally used only as a secondary signal.

    Example:

        blud
        blood

    have similar phonetic representations even though their
    character similarity is not strong enough by itself.
    """

    @staticmethod
    def soundex(
        word: str,
    ) -> str:

        word = re.sub(
            r"[^a-z]",
            "",
            word.lower(),
        )

        if not word:
            return ""

        first = word[0]

        mapping = {
            "b": "1",
            "f": "1",
            "p": "1",
            "v": "1",

            "c": "2",
            "g": "2",
            "j": "2",
            "k": "2",
            "q": "2",
            "s": "2",
            "x": "2",
            "z": "2",

            "d": "3",
            "t": "3",

            "l": "4",

            "m": "5",
            "n": "5",

            "r": "6",
        }

        digits = []

        previous = None

        for char in word[1:]:

            digit = mapping.get(
                char
            )

            if digit is None:

                previous = None
                continue

            if digit != previous:

                digits.append(
                    digit
                )

            previous = digit

        return (
            first.upper()
            +
            "".join(
                digits
            )[:3]
            .ljust(
                3,
                "0",
            )
        )

    # --------------------------------------------------------

    @classmethod
    def similar(
        cls,
        a: str,
        b: str,
    ) -> bool:

        if (
            len(a)
            < MIN_PHONETIC_LENGTH
            or
            len(b)
            < MIN_PHONETIC_LENGTH
        ):
            return False

        if (
            a[0]
            !=
            b[0]
        ):
            return False

        if (
            cls.soundex(a)
            !=
            cls.soundex(b)
        ):
            return False

        # ----------------------------------------------------
        # FIX: classic 4-digit Soundex is extremely coarse for short
        # words -- it drops all vowels and several consonants (h, w,
        # y), so e.g. "weak" and "woozy" both collapse to "W200" even
        # though they sound and look nothing alike. This previously
        # let the matcher accept things like "i am weak" as evidence
        # for wheezing (E_214) or dizziness (E_82) purely by soundex
        # coincidence. We now require the raw character sequences to
        # also be reasonably similar (rapidfuzz ratio) before treating
        # a soundex collision as a genuine phonetic match. This keeps
        # the intended use case (misspellings like "blud" -> "blood",
        # which score highly on character similarity) while rejecting
        # coincidental soundex collisions between unrelated words.
        # ----------------------------------------------------

        return fuzz.ratio(a, b) >= 45.0


# ============================================================
# TOKEN SIMILARITY
# ============================================================

class TokenSimilarity:

    @staticmethod
    def edit_score(
        a: str,
        b: str,
    ) -> float:

        if not a or not b:
            return 0.0

        return (
            fuzz.ratio(
                a,
                b,
            )
            /
            100.0
        )

    # --------------------------------------------------------

    @staticmethod
    def partial_score(
        a: str,
        b: str,
    ) -> float:

        if not a or not b:
            return 0.0

        return (
            fuzz.WRatio(
                a,
                b,
            )
            /
            100.0
        )

    # --------------------------------------------------------

    @classmethod
    def score(
        cls,
        patient: Token,
        alias_raw: str,
        alias_lemma: str,
    ) -> tuple[float, str]:

        p_raw = patient.text
        p_lemma = patient.lemma

        # ----------------------------------------------------
        # 1. Exact raw
        # ----------------------------------------------------

        if p_raw == alias_raw:

            return 1.00, "exact"

        # ----------------------------------------------------
        # 2. Exact lemma
        # ----------------------------------------------------

        if (
            p_lemma == alias_lemma
            or
            p_lemma == alias_raw
            or
            p_raw == alias_lemma
        ):

            return 0.98, "lemma"

        # ----------------------------------------------------
        # 3. Normal fuzzy spelling
        # ----------------------------------------------------

        candidates = [
            cls.edit_score(
                p_raw,
                alias_raw,
            ),

            cls.edit_score(
                p_raw,
                alias_lemma,
            ),

            cls.edit_score(
                p_lemma,
                alias_raw,
            ),

            cls.edit_score(
                p_lemma,
                alias_lemma,
            ),

            # ------------------------------------------------
            # FIX: `partial_score` (fuzz.WRatio) was included here,
            # but WRatio treats one string being a near-total
            # substring of the other as a near-perfect match. That is
            # exactly wrong for single-token comparisons, where it
            # causes short, unrelated words to falsely "match" any
            # alias word that happens to contain them as a substring
            # -- e.g. "used" scored ~90%+ against "confused" via
            # WRatio (vs. only 67% on a plain edit-distance ratio),
            # which was enough to cross FUZZY_THRESHOLD and made
            # "i used to smoke" register false evidence for
            # confusion (E_39). Token-level matching should rely on
            # true edit-distance similarity; WRatio's substring
            # heuristics are appropriate for comparing whole phrases,
            # not single words, so it has been removed from this
            # per-token candidate list.
            # ------------------------------------------------
        ]

        best = max(
            candidates
        )

        # Long enough words can tolerate normal typos.
        if (
            len(p_raw)
            >= MIN_FUZZY_LENGTH
            and
            len(alias_raw)
            >= MIN_FUZZY_LENGTH
            and
            best
            >= FUZZY_THRESHOLD
        ):

            return (
                best,
                "fuzzy",
            )

        # ----------------------------------------------------
        # 4. Phonetic fallback
        # ----------------------------------------------------
        #
        # Important for:
        #
        #     blud -> blood
        #
        # This is deliberately restricted to reasonably long
        # words and matching first letters.
        #

        phonetic_pairs = [
            (
                p_raw,
                alias_raw,
            ),

            (
                p_raw,
                alias_lemma,
            ),

            (
                p_lemma,
                alias_raw,
            ),

            (
                p_lemma,
                alias_lemma,
            ),
        ]

        for left, right in phonetic_pairs:

            if PhoneticMatcher.similar(
                left,
                right,
            ):

                # Phonetic matches are weaker than exact/fuzzy
                # matches, but strong enough to rescue a typo.
                return (
                    0.82,
                    "phonetic",
                )

        return (
            0.0,
            "none",
        )


# ============================================================
# EVIDENCE CATALOG
# ============================================================

class EvidenceCatalog:

    def __init__(self):

        if not CATALOG_FILE.exists():

            raise FileNotFoundError(
                f"Missing catalog:\n"
                f"{CATALOG_FILE}"
            )

        with open(
            CATALOG_FILE,
            "r",
            encoding="utf-8",
        ) as file:

            self.items = json.load(
                file
            )

        self.by_code = {
            item[
                "evidence_code"
            ]: item

            for item
            in self.items

            if item.get(
                "evidence_code"
            )
        }

    # --------------------------------------------------------

    def get(
        self,
        code: str,
    ) -> Optional[dict]:

        return self.by_code.get(
            code
        )


# ============================================================
# ALIAS INDEX
# ============================================================

class AliasIndex:

    def __init__(
        self,
        processor: TextProcessor,
    ):

        if not ALIASES_FILE.exists():

            raise FileNotFoundError(
                f"Missing aliases:\n"
                f"{ALIASES_FILE}"
            )

        with open(
            ALIASES_FILE,
            "r",
            encoding="utf-8",
        ) as file:

            data = json.load(
                file
            )

        self.entries = []

        for key, item in data.items():

            evidence_code = item.get(
                "evidence_code"
            )

            if not evidence_code:
                continue

            if evidence_code in VALUE_BASED_EVIDENCE:
                continue

            aliases = item.get(
                "aliases",
                [],
            )

            for alias in aliases:

                alias = str(
                    alias
                ).strip()

                if not alias:
                    continue

                alias_tokens = (
                    processor.tokens(
                        alias
                    )
                )

                if not alias_tokens:
                    continue

                raw_tokens = [
                    token.text
                    for token
                    in alias_tokens
                    if token.lemma
                    not in GRAMMAR_WORDS
                ]

                lemmas = [
                    token.lemma
                    for token
                    in alias_tokens
                    if token.lemma
                    not in GRAMMAR_WORDS
                ]

                if not lemmas:
                    continue

                self.entries.append(
                    AliasEntry(
                        key=key,

                        evidence_code=
                            evidence_code,

                        alias=alias,

                        normalized=
                            processor.normalize(
                                alias
                            ),

                        raw_tokens=
                            raw_tokens,

                        lemmas=
                            lemmas,
                    )
                )

        print(
            f"✓ Loaded "
            f"{len(self.entries)} usable aliases"
        )


# ============================================================
# LOCAL SPAN ALIGNER
# ============================================================

class LocalSpanAligner:
    """
    This is the most important part of the final matcher.

    We do NOT compare:

        "fever cough sore throat"

    against:

        "fever"

    as one giant sentence.

    Instead we search for the best LOCAL span explaining the
    candidate evidence.

    Therefore:

        fever
        cough
        sore throat

    can all independently receive strong scores.
    """

    def __init__(
        self,
        processor: TextProcessor,
    ):

        self.processor = processor

    # --------------------------------------------------------

    def _token_weight(
        self,
        token: Token,
    ) -> float:

        if (
            token.lemma
            in LOW_INFORMATION_WORDS
        ):

            return 0.10

        if token.pos in {
            "NOUN",
            "PROPN",
        }:

            return 1.00

        if token.pos == "VERB":
            return 0.90

        if token.pos == "ADJ":
            return 0.75

        if token.pos == "ADV":
            return 0.50

        if token.pos == "PART":
            return 0.70

        if token.pos == "ADP":
            return 0.50

        return 0.60

    # --------------------------------------------------------

    def _align_window(
        self,
        window: list[Token],
        alias: AliasEntry,
    ) -> dict:

        used = set()

        matches = []

        for alias_index, (
            alias_raw,
            alias_lemma,
        ) in enumerate(
            zip(
                alias.raw_tokens,
                alias.lemmas,
            )
        ):

            best = None

            for patient_index, token in enumerate(
                window
            ):

                if patient_index in used:
                    continue

                score, match_type = (
                    TokenSimilarity.score(
                        token,
                        alias_raw,
                        alias_lemma,
                    )
                )

                if score <= 0:
                    continue

                if (
                    best is None
                    or
                    score
                    >
                    best["score"]
                ):

                    best = {
                        "patient_index":
                            patient_index,

                        "token":
                            token,

                        "alias_index":
                            alias_index,

                        "alias_token":
                            alias_lemma,

                        "score":
                            score,

                        "match_type":
                            match_type,
                    }

            if best is not None:

                used.add(
                    best[
                        "patient_index"
                    ]
                )

                matches.append(
                    best
                )

        alias_count = len(
            alias.lemmas
        )

        if alias_count == 0:

            return {
                "matches": [],
                "coverage": 0.0,
                "precision": 0.0,
                "quality": 0.0,
                "mean_token_score": 0.0,
            }

        coverage = (
            len(matches)
            /
            alias_count
        )

        # ----------------------------------------------------
        # LOCAL precision
        #
        # Only the current candidate span matters.
        # Other symptoms elsewhere in the sentence are not
        # treated as unexplained information.
        # ----------------------------------------------------

        weighted_total = sum(
            self._token_weight(
                token
            )
            for token
            in window
        )

        weighted_matched = sum(
            self._token_weight(
                item["token"]
            )
            for item
            in matches
        )

        precision = (
            weighted_matched
            /
            weighted_total
            if weighted_total
            else 0.0
        )

        mean_score = (
            sum(
                item["score"]
                for item
                in matches
            )
            /
            len(matches)
            if matches
            else 0.0
        )

        quality = (
            2
            * coverage
            * precision
            /
            (
                coverage
                + precision
            )
            if (
                coverage
                + precision
            )
            else 0.0
        )

        return {
            "matches":
                matches,

            "coverage":
                coverage,

            "precision":
                precision,

            "quality":
                quality,

            "mean_token_score":
                mean_score,
        }

    # --------------------------------------------------------

    def align(
        self,
        text: str,
        alias: AliasEntry,
    ) -> dict:

        all_tokens = (
            self.processor.tokens(
                text
            )
        )

        if not all_tokens:

            return {
                "window": [],
                "matches": [],
                "coverage": 0.0,
                "precision": 0.0,
                "quality": 0.0,
                "mean_token_score": 0.0,
                "span_start": None,
                "span_end": None,
                "match_types": [],
            }

        alias_length = len(
            alias.lemmas
        )

        # ----------------------------------------------------
        # Search local windows.
        #
        # Minimum size = alias length.
        # Maximum = alias length + a few grammar/context words.
        # ----------------------------------------------------

        max_window = min(
            len(all_tokens),
            alias_length
            +
            MAX_EXTRA_WINDOW,
        )

        best = None

        for window_size in range(
            1,
            max_window + 1,
        ):

            for start in range(
                0,
                len(all_tokens)
                -
                window_size
                +
                1,
            ):

                end = (
                    start
                    +
                    window_size
                )

                window = all_tokens[
                    start:end
                ]

                result = (
                    self._align_window(
                        window,
                        alias,
                    )
                )

                if not result[
                    "matches"
                ]:

                    continue

                # ------------------------------------------------
                # Prefer:
                #
                # 1. high coverage
                # 2. high mean token quality
                # 3. compact span
                #
                # This prevents a tiny portion of a long alias
                # from winning.
                # ------------------------------------------------

                span_penalty = (
                    max(
                        0,
                        window_size
                        -
                        alias_length,
                    )
                    * 0.035
                )

                local_score = (
                    0.50
                    *
                    result[
                        "coverage"
                    ]

                    +

                    0.30
                    *
                    result[
                        "mean_token_score"
                    ]

                    +

                    0.20
                    *
                    result[
                        "precision"
                    ]

                    -
                    span_penalty
                )

                # Exact/near-complete aliases are heavily
                # preferred.
                if (
                    result[
                        "coverage"
                    ]
                    >= 1.0
                ):

                    local_score += 0.08

                candidate = {
                    **result,

                    "window":
                        window,

                    "span_start":
                        start,

                    "span_end":
                        end,

                    "local_score":
                        local_score,
                }

                if (
                    best is None
                    or
                    local_score
                    >
                    best[
                        "local_score"
                    ]
                ):

                    best = candidate

        if best is None:

            return {
                "window": [],
                "matches": [],
                "coverage": 0.0,
                "precision": 0.0,
                "quality": 0.0,
                "mean_token_score": 0.0,
                "span_start": None,
                "span_end": None,
                "local_score": 0.0,
            }

        best["match_types"] = [
            item[
                "match_type"
            ]
            for item
            in best[
                "matches"
            ]
        ]

        return best


# ============================================================
# SEMANTIC ENGINE
# ============================================================

class SemanticEngine:

    def __init__(self):

        self.model = None

        if SentenceTransformer is None:

            print()
            print(
                "⚠ sentence-transformers "
                "not available."
            )

            print(
                "Semantic validation disabled."
            )

            return

        print()
        print(
            "Loading semantic model..."
        )

        self.model = (
            SentenceTransformer(
                "all-MiniLM-L6-v2"
            )
        )

        print(
            "✓ Semantic model loaded"
        )

    # --------------------------------------------------------

    def similarity(
        self,
        text: str,
        alias: str,
    ) -> float:

        if self.model is None:
            return 0.0

        if not text.strip():
            return 0.0

        if not alias.strip():
            return 0.0

        embeddings = (
            self.model.encode(
                [
                    text,
                    alias,
                ],
                normalize_embeddings=True,
            )
        )

        score = float(
            embeddings[0]
            @
            embeddings[1]
        )

        return max(
            0.0,
            min(
                1.0,
                score,
            ),
        )


# ============================================================
# SCORER
# ============================================================

class EvidenceScorer:

    def __init__(
        self,
        processor: TextProcessor,
        aligner: LocalSpanAligner,
        semantic: SemanticEngine,
    ):

        self.processor = processor
        self.aligner = aligner
        self.semantic = semantic

    # --------------------------------------------------------

    def score_alias(
        self,
        text: str,
        alias: AliasEntry,
    ) -> dict:

        alignment = (
            self.aligner.align(
                text,
                alias,
            )
        )

        matches = alignment[
            "matches"
        ]

        if not matches:

            return {
                "valid": False,
                "score": 0.0,
                "coverage": 0.0,
                "precision": 0.0,
                "quality": 0.0,
                "semantic": 0.0,
                "semantic_bonus": 0.0,
                "matched_indices": set(),
                "matched_tokens": [],
                "match_types": [],
                "window_text": "",
                "span_start": None,
                "span_end": None,
            }

        window = alignment[
            "window"
        ]

        window_text = " ".join(
            token.text
            for token
            in window
        )

        # ----------------------------------------------------
        # Semantic similarity is calculated against the LOCAL
        # span, not the entire patient sentence.
        # ----------------------------------------------------

        semantic = (
            self.semantic.similarity(
                window_text,
                alias.alias,
            )
        )

        coverage = alignment[
            "coverage"
        ]

        precision = alignment[
            "precision"
        ]

        quality = alignment[
            "quality"
        ]

        mean_token_score = alignment[
            "mean_token_score"
        ]

        # ----------------------------------------------------
        # Exact phrase check.
        # ----------------------------------------------------

        normalized_window = (
            self.processor.normalize(
                window_text
            )
        )

        normalized_alias = (
            alias.normalized
        )

        exact_phrase = (
            normalized_alias
            ==
            normalized_window
            or
            normalized_alias
            in
            normalized_window
        )

        # ----------------------------------------------------
        # Lexical base score
        # ----------------------------------------------------

        lexical_score = (
            0.40
            * coverage

            +

            0.25
            * precision

            +

            0.20
            * quality

            +

            0.15
            * mean_token_score
        )

        # ----------------------------------------------------
        # Exact phrase bonus
        # ----------------------------------------------------

        if exact_phrase:

            lexical_score = max(
                lexical_score,
                0.95,
            )

        # ----------------------------------------------------
        # Semantic rescue
        #
        # Semantic similarity cannot rescue an almost completely
        # unrelated lexical candidate.
        # ----------------------------------------------------

        semantic_bonus = 0.0

        if (
            coverage
            >= 0.50
        ):

            if (
                semantic
                >= 0.85
            ):

                semantic_bonus = 0.16

            elif (
                semantic
                >= 0.78
                and
                coverage
                >= 0.67
            ):

                semantic_bonus = 0.12

            elif (
                semantic
                >= SEMANTIC_RESCUE_THRESHOLD
                and
                coverage
                >= 0.67
            ):

                semantic_bonus = 0.07

        semantic_bonus = min(
            semantic_bonus,
            MAX_SEMANTIC_BONUS,
        )

        # ----------------------------------------------------
        # Final score
        # ----------------------------------------------------

        final_score = min(
            1.0,
            lexical_score
            +
            semantic_bonus,
        )

        # ----------------------------------------------------
        # Acceptance rules
        # ----------------------------------------------------
        #
        # 1. Exact phrase:
        #       accept.
        #
        # 2. Full alias coverage:
        #       accept if token matching is strong.
        #
        # 3. Partial alias:
        #       semantic support may rescue it.
        #
        # 4. A phonetic-only match is NOT automatically accepted
        #    unless the complete concept is recovered.
        # ----------------------------------------------------

        all_tokens_strong = all(
            item[
                "score"
            ]
            >= 0.80

            for item
            in matches
        )

        full_alias = (
            coverage
            >= 1.0
        )

        strong_partial = (
            coverage
            >= 0.67
            and
            mean_token_score
            >= 0.78
        )

        semantic_supported = (
            coverage
            >= 0.67
            and
            semantic
            >= SEMANTIC_RESCUE_THRESHOLD
        )

        valid = False

        if exact_phrase:

            valid = True

        elif (
            full_alias
            and
            all_tokens_strong
        ):

            valid = True

        elif strong_partial:

            # ----------------------------------------------------
            # FIX: strong_partial already requires >=67% alias-word
            # coverage AND a high mean per-token match confidence
            # (>=0.78). That is a strong signal on its own and must
            # not depend on `semantic_supported`.
            #
            # The original code required BOTH strong_partial AND
            # semantic_supported. Because semantic similarity is
            # computed by an OPTIONAL sentence-transformers model
            # (self.semantic.model), and that model is frequently
            # not installed, `semantic` silently evaluates to 0.0
            # in that case and `semantic_supported` is always False.
            # That silently disabled this entire acceptance pathway
            # any time sentence-transformers was missing, causing
            # legitimate partial matches (e.g. "trouble breathing"
            # against the "significant_shortness_of_breath" alias)
            # to be rejected outright.
            # ----------------------------------------------------

            valid = True

        elif semantic_supported:

            # Weaker lexical coverage (still >=0.67) rescued purely
            # by semantic closeness -- only reachable when the
            # optional embedding model is actually loaded.

            valid = True

        # ----------------------------------------------------
        # Special protection:
        #
        # A phonetic-only match must recover the whole alias.
        #
        # This is what allows:
        #
        #     blud -> blood
        #
        # but prevents weak accidental phonetic matches.
        # ----------------------------------------------------

        if (
            valid
            and
            any(
                item[
                    "match_type"
                ]
                == "phonetic"
                for item
                in matches
            )
            and
            not full_alias
        ):

            valid = False

        return {
            "valid":
                valid,

            "score":
                final_score,

            "coverage":
                coverage,

            "precision":
                precision,

            "quality":
                quality,

            "semantic":
                semantic,

            "semantic_bonus":
                semantic_bonus,

            "mean_token_score":
                mean_token_score,

            "matched_indices":
                {
                    item[
                        "token"
                    ].index
                    for item
                    in matches
                },

            "matched_tokens":
                [
                    item[
                        "token"
                    ].text
                    for item
                    in matches
                ],

            "match_types":
                [
                    item[
                        "match_type"
                    ]
                    for item
                    in matches
                ],

            "window_text":
                window_text,

            "span_start":
                alignment[
                    "span_start"
                ],

            "span_end":
                alignment[
                    "span_end"
                ],

            "exact_phrase":
                exact_phrase,
        }


# ============================================================
# CANDIDATE GENERATOR
# ============================================================

class CandidateGenerator:

    def __init__(
        self,
        scorer: EvidenceScorer,
    ):

        self.scorer = scorer

    # --------------------------------------------------------

    def generate(
        self,
        text: str,
        aliases: list[AliasEntry],
    ) -> list[dict]:

        grouped = defaultdict(
            list
        )

        for alias in aliases:

            result = (
                self.scorer.score_alias(
                    text,
                    alias,
                )
            )

            if (
                result[
                    "score"
                ]
                <= 0
            ):

                continue

            grouped[
                alias.evidence_code
            ].append(
                {
                    "alias_entry":
                        alias,

                    **result,
                }
            )

        candidates = []

        for evidence_code, results in (
            grouped.items()
        ):

            # ------------------------------------------------
            # Select the strongest alias.
            # ------------------------------------------------

            best = max(
                results,
                key=lambda x: (
                    x[
                        "valid"
                    ],

                    x[
                        "score"
                    ],

                    x[
                        "coverage"
                    ],

                    x[
                        "semantic"
                    ],
                ),
            )

            candidates.append(
                {
                    "evidence_code":
                        evidence_code,

                    "key":
                        best[
                            "alias_entry"
                        ].key,

                    "alias":
                        best[
                            "alias_entry"
                        ].alias,

                    "score":
                        best[
                            "score"
                        ],

                    "coverage":
                        best[
                            "coverage"
                        ],

                    "precision":
                        best[
                            "precision"
                        ],

                    "quality":
                        best[
                            "quality"
                        ],

                    "semantic":
                        best[
                            "semantic"
                        ],

                    "semantic_bonus":
                        best[
                            "semantic_bonus"
                        ],

                    "mean_token_score":
                        best[
                            "mean_token_score"
                        ],

                    "matched_indices":
                        best[
                            "matched_indices"
                        ],

                    "matched_tokens":
                        best[
                            "matched_tokens"
                        ],

                    "match_types":
                        best[
                            "match_types"
                        ],

                    "window_text":
                        best[
                            "window_text"
                        ],

                    "span_start":
                        best[
                            "span_start"
                        ],

                    "span_end":
                        best[
                            "span_end"
                        ],

                    "exact_phrase":
                        best[
                            "exact_phrase"
                        ],

                    "valid":
                        best[
                            "valid"
                        ],
                }
            )

        return sorted(
            candidates,
            key=lambda x: (
                x[
                    "valid"
                ],

                x[
                    "score"
                ],

                x[
                    "coverage"
                ],

                x[
                    "semantic"
                ],
            ),
            reverse=True,
        )


# ============================================================
# MULTI-EVIDENCE SELECTOR
# ============================================================

class EvidenceSelector:
    """
    Select independent evidence concepts while suppressing
    generic concepts that are completely explained by a more
    specific concept.

    Examples:

        fever + cough + sore throat

            E_91
            E_201
            E_97

        coughing up blood

            E_45

        NOT:

            E_45 + E_201

    because E_45 already contains the cough span.
    """

    # --------------------------------------------------------

    @staticmethod
    def is_subset(
        small: dict,
        large: dict,
    ) -> bool:

        small_indices = (
            small[
                "matched_indices"
            ]
        )

        large_indices = (
            large[
                "matched_indices"
            ]
        )

        return (
            bool(
                small_indices
            )
            and
            small_indices
            .issubset(
                large_indices
            )
        )

    # --------------------------------------------------------

    def select(
        self,
        candidates: list[dict],
    ) -> list[dict]:

        valid = [
            candidate
            for candidate
            in candidates
            if (
                candidate[
                    "valid"
                ]
                and
                candidate[
                    "score"
                ]
                >= ACCEPT_THRESHOLD
            )
        ]

        if not valid:
            return []

        selected = []

        for candidate in valid:

            suppress = False

            for other in valid:

                if (
                    candidate
                    is
                    other
                ):
                    continue

                # ------------------------------------------------
                # If candidate's entire span is contained inside
                # another stronger evidence span, candidate is
                # probably generic.
                # ------------------------------------------------

                if not self.is_subset(
                    candidate,
                    other,
                ):

                    continue

                candidate_size = len(
                    candidate[
                        "matched_indices"
                    ]
                )

                other_size = len(
                    other[
                        "matched_indices"
                    ]
                )

                if (
                    other_size
                    <= candidate_size
                ):
                    continue

                # ------------------------------------------------
                # Specific evidence wins.
                # ------------------------------------------------

                if (
                    other[
                        "score"
                    ]
                    >=
                    candidate[
                        "score"
                    ]
                    -
                    0.04
                ):

                    suppress = True
                    break

            if not suppress:

                selected.append(
                    candidate
                )

        # ----------------------------------------------------
        # Remove duplicate evidence codes.
        # ----------------------------------------------------

        final = {}

        for candidate in selected:

            code = candidate[
                "evidence_code"
            ]

            if (
                code not in final
                or
                candidate[
                    "score"
                ]
                >
                final[
                    code
                ][
                    "score"
                ]
            ):

                final[
                    code
                ] = candidate

        return sorted(
            final.values(),
            key=lambda x:
                x[
                    "score"
                ],
            reverse=True,
        )


# ============================================================
# NEGATION DETECTOR
# ============================================================

class NegationDetector:
    """
    Clause-aware negation detector.

    The matcher must return the evidence concept even when the
    user is denying it.  For example:

        "I don't have fever."
            -> E_91 is NEGATED

        "I do not have shortness of breath."
            -> E_66 is NEGATED

        "I don't have fever but I have cough."
            -> E_91 NEGATED
            -> E_201 POSITIVE

    Negation is therefore treated as a property of a matched
    evidence span, not as a global sentence flag.
    """

    WINDOW_BEFORE = 6
    WINDOW_AFTER = 4

    # A conjunction here usually starts a new semantic clause.
    CLAUSE_BOUNDARIES = {
        "but",
        "however",
        "although",
        "though",
        "except",
        "instead",
        "yet",
    }

    # Words that commonly express absence/denial.
    NEGATION_CUES = {
        "no",
        "not",
        "never",
        "without",
        "neither",
        "nor",
        "deny",
        "denies",
        "denied",
        "absent",
        "lack",
        "lacks",
        "lacking",
        "negative",
        "ruled",
    }

    # Positive words that should stop a broad negation scope.
    AFFIRMATIVE_CUES = {
        "have",
        "has",
        "having",
        "experience",
        "experiencing",
        "feel",
        "feeling",
        "report",
        "reports",
        "with",
    }

    def __init__(
        self,
        processor: TextProcessor,
    ):
        self.processor = processor

    # --------------------------------------------------------

    @staticmethod
    def _lemma(token: Token) -> str:
        return token.lemma or token.text

    # --------------------------------------------------------

    def _has_clause_boundary(
        self,
        tokens: list[Token],
        left_index: int,
        right_index: int,
    ) -> bool:
        """Return True if a clause boundary lies between indices."""
        lo = min(left_index, right_index)
        hi = max(left_index, right_index)

        for token in tokens:
            if lo < token.index < hi:
                if self._lemma(token) in self.CLAUSE_BOUNDARIES:
                    return True

        return False

    # --------------------------------------------------------

    def _previous_cue(
        self,
        tokens: list[Token],
        matched_start: int,
    ) -> Optional[Token]:
        """
        Find the closest negation cue before the matched span,
        respecting clause boundaries.
        """
        candidates = [
            token
            for token in tokens
            if token.index < matched_start
            and (
                self._lemma(token) in self.NEGATION_CUES
                or token.text in self.NEGATION_CUES
            )
        ]

        if not candidates:
            return None

        candidates.sort(
            key=lambda token: token.index,
            reverse=True,
        )

        cue = candidates[0]

        distance = matched_start - cue.index

        if distance > self.WINDOW_BEFORE:
            return None

        if self._has_clause_boundary(
            tokens,
            cue.index,
            matched_start,
        ):
            return None

        return cue

    # --------------------------------------------------------

    def _next_cue(
        self,
        tokens: list[Token],
        matched_end: int,
    ) -> Optional[Token]:
        """
        Detect post-positive constructions such as:

            fever is absent
            fever is not present
            fever was ruled out

        A plain "fever with cough" is NOT considered negated.
        """
        future = [
            token
            for token in tokens
            if token.index > matched_end
            and token.index - matched_end <= self.WINDOW_AFTER
        ]

        if not future:
            return None

        # Stop at a new clause.
        for token in future:
            if self._lemma(token) in self.CLAUSE_BOUNDARIES:
                break

            if self._lemma(token) in {
                "not",
                "absent",
                "negative",
            }:
                return token

        # Special phrase: "ruled out"
        for i, token in enumerate(future):
            if self._lemma(token) == "ruled":
                if (
                    i + 1 < len(future)
                    and self._lemma(future[i + 1]) == "out"
                ):
                    return token

        return None

    # --------------------------------------------------------

    def _detect_pattern(
        self,
        tokens: list[Token],
        matched_indices: set[int],
    ) -> Optional[str]:
        if not matched_indices:
            return None

        matched_sorted = sorted(matched_indices)
        matched_start = matched_sorted[0]
        matched_end = matched_sorted[-1]

        # ----------------------------------------------------
        # 1. Explicit negation before the evidence span.
        # ----------------------------------------------------
        cue = self._previous_cue(
            tokens,
            matched_start,
        )

        if cue is not None:
            return f"pre:{self._lemma(cue)}"

        # ----------------------------------------------------
        # 2. Explicit negation after the evidence span.
        # ----------------------------------------------------
        cue = self._next_cue(
            tokens,
            matched_end,
        )

        if cue is not None:
            return f"post:{self._lemma(cue)}"

        return None

    # --------------------------------------------------------

    def is_negated(
        self,
        text: str,
        matched_indices: set[int],
    ) -> bool:
        tokens = self.processor.tokens(text)

        if not tokens or not matched_indices:
            return False

        return (
            self._detect_pattern(
                tokens,
                matched_indices,
            )
            is not None
        )

    # --------------------------------------------------------

    def reason(
        self,
        text: str,
        matched_indices: set[int],
    ) -> Optional[str]:
        tokens = self.processor.tokens(text)

        if not tokens or not matched_indices:
            return None

        return self._detect_pattern(
            tokens,
            matched_indices,
        )


# ============================================================
# MAIN MATCHER
# ============================================================

class EvidenceMatcher:

    def __init__(self):

        print(
            "=" * 80
        )

        print(
            "MEDI TWIN - FINAL HYBRID "
            "CONCEPT EVIDENCE MATCHER"
        )

        print(
            "=" * 80
        )

        # ----------------------------------------------------
        # NLP
        # ----------------------------------------------------

        print()
        print(
            "Loading NLP processor..."
        )

        self.processor = (
            TextProcessor()
        )

        print(
            "✓ spaCy tokenizer + "
            "lemmatizer loaded"
        )

        # ----------------------------------------------------
        # Ontology
        # ----------------------------------------------------

        print()
        print(
            "Loading ontology..."
        )

        self.catalog = (
            EvidenceCatalog()
        )

        print(
            f"✓ Loaded "
            f"{len(self.catalog.items)} "
            f"evidence definitions"
        )

        # ----------------------------------------------------
        # Aliases
        # ----------------------------------------------------

        print()
        print(
            "Loading aliases..."
        )

        self.alias_index = (
            AliasIndex(
                self.processor
            )
        )

        # ----------------------------------------------------
        # Semantic model
        # ----------------------------------------------------

        self.semantic = (
            SemanticEngine()
        )

        # ----------------------------------------------------
        # Matcher components
        # ----------------------------------------------------

        self.aligner = (
            LocalSpanAligner(
                self.processor
            )
        )

        self.scorer = (
            EvidenceScorer(
                self.processor,
                self.aligner,
                self.semantic,
            )
        )

        self.generator = (
            CandidateGenerator(
                self.scorer
            )
        )

        self.selector = (
            EvidenceSelector()
        )

        self.negation = (
            NegationDetector(
                self.processor
            )
        )

    # ========================================================
    # MATCH
    # ========================================================

    def match(
        self,
        text: str,
    ) -> dict:

        normalized = (
            self.processor.normalize(
                text
            )
        )

        if not normalized:

            return {
                "status":
                    "unsupported",

                "confidence":
                    0.0,

                "evidence":
                    [],

                "negated":
                    [],

                "candidates":
                    [],
            }

        # ----------------------------------------------------
        # Generate candidates.
        # ----------------------------------------------------

        candidates = (
            self.generator.generate(
                text,
                self.alias_index.entries,
            )
        )

        # ----------------------------------------------------
        # Detect negation BEFORE multi-evidence suppression.
        #
        # This matters for mixed statements such as:
        #
        #   "I do not have fever but I have a cough."
        #
        # We must preserve:
        #   NEGATED  -> E_91
        #   POSITIVE -> E_201
        #
        # If suppression happens first, a generic or specific
        # candidate can accidentally hide the other polarity.
        # ----------------------------------------------------

        positive_candidates = []
        negated_candidates = []

        for candidate in candidates:

            if not candidate["valid"]:
                continue

            if candidate["score"] < ACCEPT_THRESHOLD:
                continue

            negation_reason = self.negation.reason(
                text,
                candidate["matched_indices"],
            )

            if negation_reason is not None:
                candidate = {
                    **candidate,
                    "negation_reason": negation_reason,
                }
                negated_candidates.append(candidate)
            else:
                positive_candidates.append(candidate)

        # Select independently inside each polarity.
        accepted = self.selector.select(
            positive_candidates
        )

        negated = self.selector.select(
            negated_candidates
        )

        # ----------------------------------------------------
        # Status
        # ----------------------------------------------------

        if accepted:

            status = "supported"

        elif negated:

            status = "negated"

        else:

            status = "unsupported"

        confidence = max(
            (
                candidate[
                    "score"
                ]
                for candidate
                in accepted
            ),
            default=0.0,
        )

        return {
            "input":
                text,

            "normalized":
                normalized,

            "status":
                status,

            "confidence":
                confidence,

            "evidence":
                accepted,

            "negated":
                negated,

            "candidates":
                candidates,
        }


# ============================================================
# DISPLAY
# ============================================================

def print_result(
    matcher: EvidenceMatcher,
    result: dict,
):

    print(
        f"Normalized: "
        f"{result['normalized']}"
    )

    print(
        f"Status: "
        f"{result['status']}"
    )

    print(
        f"Confidence: "
        f"{result['confidence']:.4f}"
    )

    # --------------------------------------------------------
    # Accepted
    # --------------------------------------------------------

    if result[
        "evidence"
    ]:

        print()
        print(
            "✓ ACCEPTED EVIDENCE:"
        )

        for evidence in result[
            "evidence"
        ]:

            code = evidence[
                "evidence_code"
            ]

            catalog_item = (
                matcher.catalog.get(
                    code
                )
            )

            question = (
                catalog_item.get(
                    "question_en"
                )
                if catalog_item
                else ""
            )

            print(
                f"  ✓ {code}"
            )

            print(
                f"      Question: "
                f"{question}"
            )

            print(
                f"      Alias: "
                f"{evidence['alias']}"
            )

            print(
                f"      Matched: "
                f"{evidence['matched_tokens']}"
            )

            print(
                f"      Score: "
                f"{evidence['score']:.3f}"
            )

            print(
                f"      Match type: "
                f"{evidence['match_types']}"
            )

    # --------------------------------------------------------
    # Negated
    # --------------------------------------------------------

    if result[
        "negated"
    ]:

        print()
        print(
            "✗ NEGATED EVIDENCE:"
        )

        for evidence in result[
            "negated"
        ]:

            print(
                f"  ✗ "
                f"{evidence['evidence_code']}"
                f" | "
                f"{evidence['score']:.3f}"
                f" | reason="
                f"{evidence.get('negation_reason', 'negated')}"
            )

    # --------------------------------------------------------
    # Candidates
    # --------------------------------------------------------

    print()
    print(
        "Top candidates:"
    )

    visible = [
        candidate
        for candidate
        in result[
            "candidates"
        ]
        if candidate[
            "score"
        ]
        >= DISPLAY_THRESHOLD
    ]

    for candidate in visible[:8]:

        print(
            f"  "
            f"{candidate['evidence_code']}"
            f" | score="
            f"{candidate['score']:.3f}"
            f" | coverage="
            f"{candidate['coverage']:.3f}"
            f" | precision="
            f"{candidate['precision']:.3f}"
            f" | semantic="
            f"{candidate['semantic']:.3f}"
            f" | valid="
            f"{candidate['valid']}"
            f" | alias="
            f"{candidate['alias']}"
        )


# ============================================================
# FINAL SMALL REGRESSION TEST SET
# ============================================================

TESTS = [
    "I have fever.",
    "I feel short of breath.",
    "I am having difficlty breathing.",
    "I have been coughing up blood.",
    "I have been caughing up blud.",
    "I have a cough with yellow sputum.",
    "I don't have fever.",
    "I do not have shortness of breath.",
    "I don't have fever but I have a cough.",
    "I have fever but I do not have a cough.",
    "Fever is absent.",
    "I have a headache.",
]


# ============================================================
# MAIN
# ============================================================

def main():

    matcher = (
        EvidenceMatcher()
    )

    print()
    print(
        "=" * 80
    )

    print(
        "FINAL SMALL REGRESSION TEST"
    )

    print(
        "=" * 80
    )

    print(
        f"Total test cases: "
        f"{len(TESTS)}"
    )

    for number, text in enumerate(
        TESTS,
        start=1,
    ):

        print()
        print(
            "-" * 80
        )

        print(
            f"TEST {number}"
        )

        print(
            f"Input: {text}"
        )

        try:

            result = matcher.match(
                text
            )

            print_result(
                matcher,
                result,
            )

        except Exception as exc:

            print()
            print(
                "❌ ERROR:"
            )

            print(
                repr(exc)
            )

    print()
    print(
        "=" * 80
    )

    print(
        "TESTING COMPLETE"
    )

    print(
        "=" * 80
    )


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    main()