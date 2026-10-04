from __future__ import annotations

import json
import math
import re

import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, Iterable

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass



# =============================================================================
# PATHS
# =============================================================================

BASE_DIR = Path(__file__).resolve().parent.parent

CATALOG_FILE = BASE_DIR / "symptom_catalog.json"
GRAPH_FILE = BASE_DIR / "module2_data_clean" / "evidence_graph.json"


# =============================================================================
# CONFIGURATION
# =============================================================================

# -----------------------------
# Conversation limits
# -----------------------------

MAX_FOLLOW_UP_QUESTIONS = 6
MAX_QUESTION_REPEATS = 0

# If a user answers a previously asked yes/no question with a short reply
# such as "yes", "no", "I do", or "I don't", bind that answer to the
# pending evidence code instead of sending it through the symptom matcher.
ENABLE_PENDING_QUESTION_ANSWERS = True

# -----------------------------
# Evidence sufficiency
# -----------------------------

MIN_POSITIVE_EVIDENCE = 2

# FIX: previously a single piece of evidence could trigger a full
# model prediction if it scored above SINGLE_EVIDENCE_MIN_CONFIDENCE
# and wasn't "broad" (see BROAD_PREVALENCE_THRESHOLD below). In
# practice this model is trained on a synthetic dataset with
# near-deterministic symptom -> diagnosis rules (99.69% test accuracy,
# 100% top-3), so a single symptom is often enough to make the model
# extremely (and misleadingly) confident -- e.g. "weakness in both
# legs" alone produced 99.58% for Guillain-Barre syndrome, with no
# opportunity to rule out anything else first. Per explicit request,
# this shortcut is now disabled: a prediction is only generated once
# MIN_POSITIVE_EVIDENCE distinct pieces of evidence have been
# gathered, regardless of how confident any single one looks. Set
# this back to True if you want the old single-evidence behavior.
ALLOW_SINGLE_EVIDENCE_PREDICTION = False

# A single evidence item is allowed to trigger prediction only if it is
# relatively specific in the training graph (only used when
# ALLOW_SINGLE_EVIDENCE_PREDICTION is True).
SINGLE_EVIDENCE_MIN_CONFIDENCE = 0.92

# A symptom that occurs in a large percentage of the training population
# should not by itself trigger a strong prediction.
BROAD_PREVALENCE_THRESHOLD = 0.20

# -----------------------------
# Question generation
# -----------------------------

MIN_GRAPH_ASSOCIATION = 0.03
MIN_GRAPH_PAIR_COUNT = 10

TOP_QUESTION_COUNT = 5

# -----------------------------
# Question scoring weights
# -----------------------------

# Graph evidence remains the most important source, but it is NOT the only
# source anymore.
WEIGHT_ASSOCIATION = 0.24
WEIGHT_CONDITIONAL = 0.20
WEIGHT_JACCARD = 0.08
WEIGHT_MULTI_SUPPORT = 0.12
WEIGHT_NOVELTY = 0.10
WEIGHT_SPECIFICITY = 0.10
WEIGHT_ROLE = 0.08
WEIGHT_BALANCE = 0.04
WEIGHT_RELEVANCE = 0.04

# -----------------------------
# Penalties
# -----------------------------

GENERIC_PENALTY = 0.16
ANTECEDENT_PENALTY = 0.18
VALUE_ATOM_PENALTY = 0.20
REDUNDANCY_PENALTY = 0.25
LOW_INFORMATION_PENALTY = 0.08

# -----------------------------
# Prediction safety
# -----------------------------

MIN_MODEL_PREDICTION_CONFIDENCE = 0.0


# =============================================================================
# STATUS VALUES
# =============================================================================

STATUS_PREDICTION = "prediction_generated"
STATUS_NEEDS_MORE = "needs_more_information"
STATUS_NEGATED = "negated_only"
STATUS_UNSUPPORTED = "unsupported"
STATUS_INSUFFICIENT = "insufficient_evidence"
STATUS_INVALID = "invalid_input"


# =============================================================================
# SMALL TEXT UTILITIES
# =============================================================================

STOPWORDS = {
    "a", "an", "the",
    "do", "does", "did",
    "you", "your",
    "have", "has", "had",
    "are", "is", "was", "were",
    "be", "been",
    "to", "of", "in", "on", "at",
    "for", "with", "without",
    "and", "or", "but",
    "that", "this", "these", "those",
    "any", "some",
    "ever", "recently", "currently",
    "feel", "feeling",
    "experiencing",
    "related", "reason",
    "consulting",
}

NEGATION_WORDS = {
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


def normalize_text(text: str) -> str:
    text = str(text).lower()

    contractions = {
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
        "i'm": "i am",
        "im": "i am",
        "i've": "i have",
        "ive": "i have",
    }

    for old, new in contractions.items():
        text = re.sub(
            rf"\b{re.escape(old)}\b",
            new,
            text,
        )

    text = re.sub(r"[^a-z0-9\s]", " ", text)

    return re.sub(r"\s+", " ", text).strip()


def content_tokens(text: str) -> set[str]:
    tokens = normalize_text(text).split()

    return {
        token
        for token in tokens
        if token not in STOPWORDS
        and len(token) > 2
    }


def token_overlap(a: str, b: str) -> float:
    ta = content_tokens(a)
    tb = content_tokens(b)

    if not ta or not tb:
        return 0.0

    return len(ta & tb) / max(
        1,
        min(len(ta), len(tb)),
    )


def contains_negation(text: str) -> bool:
    tokens = normalize_text(text).split()

    return any(
        token in NEGATION_WORDS
        for token in tokens
    )


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class EvidenceRecord:
    code: str
    confidence: float
    source_text: str
    turn: int

    alias: Optional[str] = None

    matched_tokens: list[str] = field(
        default_factory=list
    )

    question: Optional[str] = None


@dataclass
class QuestionRecord:
    code: str
    turn: int
    question: str
    score: float


@dataclass
class ConversationState:

    positive: dict[str, EvidenceRecord] = field(
        default_factory=dict
    )

    negated: dict[str, EvidenceRecord] = field(
        default_factory=dict
    )

    asked_questions: dict[str, QuestionRecord] = field(
        default_factory=dict
    )

    user_messages: list[str] = field(
        default_factory=list
    )

    turns: int = 0

    follow_ups: int = 0

    finished: bool = False

    # The evidence code represented by the last question shown to the user.
    # This lets us correctly interpret replies such as "yes" / "no".
    pending_question_code: Optional[str] = None

    # FIX: codes most recently offered as "did you mean" suggestions
    # (CASE 3), and codes the user has explicitly rejected. Without
    # this, a generic rejection like "no issues related to throat"
    # would be re-run through the matcher, which finds the literal
    # word "throat" in the REJECTION text itself and suggests another
    # throat-adjacent code -- a self-reinforcing loop that never
    # escapes the topic the user just said "no" to.
    last_suggested_codes: list[str] = field(
        default_factory=list
    )

    declined_codes: set[str] = field(
        default_factory=set
    )

    # FIX: maps a value-based base code (e.g. "E_55") to the specific
    # atom the user's text resolved to (e.g. "E_55_@_V_29"). The
    # training/question graph is keyed entirely by full atoms for
    # categorical evidence -- a bare base code has no entry in it at
    # all -- so without this, the question ranker can never find
    # follow-up questions related to a pain/location description,
    # and the conversation dead-ends after a single turn.
    positive_atoms: dict[str, str] = field(
        default_factory=dict
    )


# =============================================================================
# ONTOLOGY
# =============================================================================

class EvidenceOntology:

    def __init__(
        self,
        path: Path = CATALOG_FILE,
    ):

        if not path.exists():

            raise FileNotFoundError(
                f"Missing symptom catalog:\n{path}"
            )

        with open(
            path,
            "r",
            encoding="utf-8",
        ) as f:

            data = json.load(f)

        # ---------------------------------------------------------
        # Your current catalog is a LIST.
        #
        # We nevertheless keep support for wrapped dictionaries.
        # ---------------------------------------------------------

        if isinstance(data, list):

            items = data

        elif isinstance(data, dict):

            if isinstance(
                data.get("evidences"),
                list,
            ):

                items = data["evidences"]

            elif isinstance(
                data.get("evidence"),
                list,
            ):

                items = data["evidence"]

            else:

                items = []

                for value in data.values():

                    if isinstance(value, dict):

                        items.append(value)

        else:

            items = []

        self.items = [
            item
            for item in items
            if isinstance(item, dict)
            and item.get("evidence_code")
        ]

        self.by_code = {
            item["evidence_code"]: item
            for item in self.items
        }

    # -----------------------------------------------------------------

    def get(
        self,
        code: str,
    ) -> Optional[dict]:

        item = self.by_code.get(code)

        if item is not None:
            return item

        # FIX: this previously only did an exact-key lookup, which
        # fails for a full value atom like "E_55_@_V_29" (the catalog
        # is keyed by the bare base code "E_55"). Once value-based
        # evidence atoms started flowing through the conversation
        # engine (see MediTwinConversationEngine's value-extractor
        # wiring), the question ranker's graph can legitimately
        # suggest a *value atom* as the next follow-up target (e.g.
        # "E_56_@_V_3" for pain intensity) -- resolving that back to
        # its base code's question text needs to work, or the
        # follow-up question would silently come back empty.
        if code and "_@_" in code:
            base = code.split("_@_", 1)[0]
            return self.by_code.get(base)

        return None

    # -----------------------------------------------------------------

    def question(
        self,
        code: str,
    ) -> Optional[str]:

        item = self.get(code)

        if not item:
            return None

        return (
            item.get("question_en")
            or item.get("question")
        )

    # -----------------------------------------------------------------

    def name(
        self,
        code: str,
    ) -> str:

        item = self.get(code)

        if not item:
            return code

        return (
            item.get("name")
            or item.get("label")
            or code
        )

    # -----------------------------------------------------------------

    def data_type(
        self,
        code: str,
    ) -> Optional[str]:

        item = self.get(code)

        if not item:
            return None

        return item.get("data_type")

    # -----------------------------------------------------------------

    def is_antecedent(
        self,
        code: str,
    ) -> bool:

        item = self.get(code)

        if not item:
            return False

        return bool(
            item.get(
                "is_antecedent",
                False,
            )
        )

    # -----------------------------------------------------------------

    def possible_values(
        self,
        code: str,
    ) -> list:

        item = self.get(code)

        if not item:
            return []

        values = (
            item.get("possible_values")
            or item.get("possible-values")
            or []
        )

        return (
            values
            if isinstance(values, list)
            else []
        )

    # -----------------------------------------------------------------

    def code_question(
        self,
        code: str,
    ) -> Optional[str]:

        item = self.get(code)

        if not item:
            return None

        return item.get(
            "code_question"
        )


# =============================================================================
# GRAPH
# =============================================================================

class EvidenceGraph:

    """
    Loads the already-built training-only evidence graph.

    IMPORTANT:

    We do NOT rebuild the graph here.

    evidence_graph.json already contains:

        frequency
        prevalence
        related
        pair_count
        conditional_probability
        reverse_probability
        jaccard
        association
        other_frequency

    Therefore this conversational layer is cheap at runtime and does not
    depend on initial_evidence.npy.
    """

    def __init__(
        self,
        ontology: EvidenceOntology,
        path: Path = GRAPH_FILE,
    ):

        self.ontology = ontology
        self.path = path

        self.patient_count = 0
        self.unique_evidence_atoms = 0
        self.unique_evidence_pairs = 0

        self.evidence_frequency = {}
        self.evidence_prevalence = {}
        self.related = {}

        self._load()

    # -----------------------------------------------------------------

    def _load(self):

        if not self.path.exists():

            raise FileNotFoundError(
                "Missing evidence graph:\n"
                f"{self.path}\n\n"
                "Build evidence_graph.json before running "
                "the conversational engine."
            )

        with open(
            self.path,
            "r",
            encoding="utf-8",
        ) as f:

            data = json.load(f)

        if not isinstance(data, dict):

            raise ValueError(
                "evidence_graph.json must contain a JSON object."
            )

        self.patient_count = int(
            data.get(
                "patient_count",
                0,
            )
        )

        self.unique_evidence_atoms = int(
            data.get(
                "unique_evidence_atoms",
                0,
            )
        )

        self.unique_evidence_pairs = int(
            data.get(
                "unique_evidence_pairs",
                0,
            )
        )

        evidence = data.get(
            "evidence",
            {},
        )

        if not isinstance(
            evidence,
            dict,
        ):

            raise ValueError(
                "evidence_graph.json['evidence'] "
                "must be an object."
            )

        for code, item in evidence.items():

            if not isinstance(
                item,
                dict,
            ):

                continue

            self.evidence_frequency[
                code
            ] = int(
                item.get(
                    "frequency",
                    0,
                )
            )

            self.evidence_prevalence[
                code
            ] = float(
                item.get(
                    "prevalence",
                    0.0,
                )
            )

            related = item.get(
                "related",
                {},
            )

            if isinstance(
                related,
                dict,
            ):

                self.related[
                    code
                ] = related

        edge_count = sum(
            len(value)
            for value in self.related.values()
        )

        print(
            f"✓ Evidence graph loaded: "
            f"{edge_count} edges"
        )

    # -----------------------------------------------------------------

    def neighbors(
        self,
        code: str,
    ) -> dict:

        return self.related.get(
            code,
            {},
        )

    # -----------------------------------------------------------------

    def association(
        self,
        source: str,
        target: str,
    ) -> float:

        edge = (
            self.neighbors(source)
            .get(target)
        )

        if edge is None:

            # Graph is normally directional in JSON.
            # Try reverse direction too.
            edge = (
                self.neighbors(target)
                .get(source)
            )

        if not edge:

            return 0.0

        return float(
            edge.get(
                "association",
                0.0,
            )
        )

    # -----------------------------------------------------------------

    def edge(
        self,
        source: str,
        target: str,
    ) -> Optional[dict]:

        edge = (
            self.neighbors(source)
            .get(target)
        )

        if edge is not None:
            return edge

        return (
            self.neighbors(target)
            .get(source)
        )

    # -----------------------------------------------------------------

    def conditional_probability(
        self,
        source: str,
        target: str,
    ) -> float:

        # Prefer source -> target.
        edge = (
            self.neighbors(source)
            .get(target)
        )

        if edge:

            return float(
                edge.get(
                    "conditional_probability",
                    0.0,
                )
            )

        # Reverse edge exists but its conditional probability is the
        # opposite direction. In that case use reverse_probability.
        edge = (
            self.neighbors(target)
            .get(source)
        )

        if edge:

            return float(
                edge.get(
                    "reverse_probability",
                    0.0,
                )
            )

        return 0.0


# =============================================================================
# QUESTION ROLE
# =============================================================================

class QuestionRole:

    SYMPTOM = "symptom"
    DETAIL = "symptom_detail"
    CONTEXT = "context"
    HISTORY = "history"
    RISK = "risk"
    GENERIC = "generic"
    VALUE = "value"


class QuestionClassifier:

    """
    Classifies evidence questions using ontology metadata + question wording.

    This is deliberately generic.

    We do NOT write:

        if E_79: ...
        if E_53: ...

    Instead we infer the role from the catalog.
    """

    HISTORY_TERMS = {
        "ever",
        "history",
        "previously",
        "diagnosed",
        "past",
        "had",
        "disease",
        "medication",
        "medications",
        "bronchodilator",
        "hypertension",
        "diabetes",
        "asthma",
        "heart",
        "attack",
        "surgery",
    }

    RISK_TERMS = {
        "smoke",
        "smoking",
        "cigarette",
        "alcohol",
        "drink",
        "drugs",
        "daycare",
        "contact",
        "exposure",
        "live",
        "work",
        "occupation",
    }

    DETAIL_TERMS = {
        "colored",
        "colour",
        "abundant",
        "intense",
        "worse",
        "increased",
        "improves",
        "improved",
        "rest",
        "exertion",
        "breath",
        "cough",
        "sputum",
        "mucus",
        "pain",
        "severity",
        "duration",
        "night",
        "morning",
        "radiate",
    }

    GENERIC_TERMS = {
        "somewhere",
        "related",
        "reason",
        "consulting",
        "general",
        "overall",
        "anything",
        "something",
    }

    # -----------------------------------------------------------------

    def classify(
        self,
        item: dict,
    ) -> str:

        if item is None:

            return QuestionRole.GENERIC

        data_type = (
            item.get("data_type")
        )

        possible_values = (
            item.get("possible_values")
            or item.get("possible-values")
            or []
        )

        if (
            data_type != "B"
            and possible_values
        ):

            return QuestionRole.VALUE

        question = (
            item.get("question_en")
            or ""
        )

        text = set(
            normalize_text(
                question
            ).split()
        )

        if (
            text & self.GENERIC_TERMS
        ):

            return QuestionRole.GENERIC

        if bool(
            item.get(
                "is_antecedent",
                False,
            )
        ):

            if text & self.RISK_TERMS:

                return QuestionRole.RISK

            return QuestionRole.HISTORY

        if text & self.RISK_TERMS:

            return QuestionRole.RISK

        if text & self.DETAIL_TERMS:

            return QuestionRole.DETAIL

        return QuestionRole.SYMPTOM


# =============================================================================
# QUESTION RANKER
# =============================================================================

class ConversationalQuestionRanker:

    """
    Main conversational ranking layer.

    Pipeline:

        known evidence
              ↓
        graph candidate generation
              ↓
        hard filtering
              ↓
        multi-evidence support
              ↓
        specificity / redundancy
              ↓
        role classification
              ↓
        final ranking
    """

    def __init__(
        self,
        ontology: EvidenceOntology,
        graph: EvidenceGraph,
    ):

        self.ontology = ontology
        self.graph = graph

        self.classifier = (
            QuestionClassifier()
        )

    # -----------------------------------------------------------------
    # Graph candidate generation
    # -----------------------------------------------------------------

    def _generate_candidates(
        self,
        current_codes: set[str],
    ) -> dict[str, dict]:

        candidates = {}

        if not current_codes:

            return candidates

        for source in current_codes:

            neighbors = (
                self.graph.neighbors(
                    source
                )
            )

            for target, edge in neighbors.items():

                if target in current_codes:

                    continue

                if not isinstance(
                    edge,
                    dict,
                ):

                    continue

                association = float(
                    edge.get(
                        "association",
                        0.0,
                    )
                )

                conditional = float(
                    edge.get(
                        "conditional_probability",
                        0.0,
                    )
                )

                pair_count = int(
                    edge.get(
                        "pair_count",
                        0,
                    )
                )

                if (
                    association
                    < MIN_GRAPH_ASSOCIATION
                ):

                    continue

                if (
                    pair_count
                    < MIN_GRAPH_PAIR_COUNT
                ):

                    continue

                if target not in candidates:

                    candidates[target] = {
                        "evidence_code":
                            target,

                        "supporting":
                            [],

                        "association_sum":
                            0.0,

                        "conditional_sum":
                            0.0,

                        "jaccard_sum":
                            0.0,

                        "pair_count_sum":
                            0,

                        "edge_count":
                            0,
                    }

                row = candidates[target]

                row[
                    "supporting"
                ].append(source)

                row[
                    "association_sum"
                ] += association

                row[
                    "conditional_sum"
                ] += conditional

                row[
                    "jaccard_sum"
                ] += float(
                    edge.get(
                        "jaccard",
                        0.0,
                    )
                )

                row[
                    "pair_count_sum"
                ] += pair_count

                row[
                    "edge_count"
                ] += 1

        return candidates

    # -----------------------------------------------------------------
    # Normalized graph scores
    # -----------------------------------------------------------------

    @staticmethod
    def _mean(
        value: float,
        count: int,
    ) -> float:

        if count <= 0:

            return 0.0

        return value / count

    # -----------------------------------------------------------------

    def _multi_support_score(
        self,
        support_count: int,
        total_current: int,
    ) -> float:

        if total_current <= 0:

            return 0.0

        coverage = (
            support_count
            /
            total_current
        )

        # Diminishing returns.
        return min(
            1.0,
            math.sqrt(
                max(
                    0.0,
                    coverage,
                )
            ),
        )

    # -----------------------------------------------------------------
    # Novelty
    # -----------------------------------------------------------------

    def _novelty_score(
        self,
        code: str,
        current_codes: set[str],
    ) -> float:

        """
        A question is novel if it is not simply another representation of
        something already known.

        We use graph + question metadata instead of hard-coded medical rules.
        """

        if code in current_codes:

            return 0.0

        item = self.ontology.get(
            code
        )

        if not item:

            return 0.0

        question = (
            item.get("question_en")
            or ""
        )

        # Generic questions are inherently less novel.
        if (
            self.classifier.classify(
                item
            )
            == QuestionRole.GENERIC
        ):

            return 0.35

        # More specific question text gets a higher novelty score.
        tokens = content_tokens(
            question
        )

        if not tokens:

            return 0.25

        # If many of the current evidence names appear in the question,
        # it may simply be repeating existing information.
        overlap_values = []

        for known in current_codes:

            known_name = (
                self.ontology.name(
                    known
                )
            )

            overlap_values.append(
                token_overlap(
                    known_name,
                    question,
                )
            )

        max_overlap = max(
            overlap_values,
            default=0.0,
        )

        return max(
            0.0,
            1.0 - max_overlap,
        )

    # -----------------------------------------------------------------
    # Redundancy detection
    # -----------------------------------------------------------------

    def _redundancy_score(
        self,
        code: str,
        current_codes: set[str],
    ) -> float:

        """
        Estimate whether asking this question is redundant.

        Example:

            known E_45 = coughing up blood

        candidate E_201 = cough

        The candidate is semantically contained in the known concept and
        should therefore receive a strong penalty.

        This is not E_45-specific.
        """

        item = self.ontology.get(
            code
        )

        if not item:

            return 0.0

        question = (
            item.get("question_en")
            or ""
        )

        candidate_tokens = (
            content_tokens(
                question
            )
        )

        if not candidate_tokens:

            return 0.0

        maximum = 0.0

        for known in current_codes:

            known_item = (
                self.ontology.get(
                    known
                )
            )

            if not known_item:

                continue

            known_question = (
                known_item.get(
                    "question_en"
                )
                or ""
            )

            known_tokens = (
                content_tokens(
                    known_question
                )
            )

            if not known_tokens:

                continue

            # Candidate is mostly contained in an already-known concept.
            containment = (
                len(
                    candidate_tokens
                    &
                    known_tokens
                )
                /
                max(
                    1,
                    len(candidate_tokens),
                )
            )

            maximum = max(
                maximum,
                containment,
            )

        return maximum

    # -----------------------------------------------------------------
    # Role score
    # -----------------------------------------------------------------

    def _role_score(
        self,
        role: str,
        current_codes: set[str],
    ) -> float:

        symptom_count = len(
            current_codes
        )

        if role == QuestionRole.SYMPTOM:

            return 1.00

        if role == QuestionRole.DETAIL:

            return 0.95

        if role == QuestionRole.CONTEXT:

            return 0.75

        if role == QuestionRole.HISTORY:

            # History becomes more useful once multiple symptom concepts
            # are already present.
            if symptom_count >= 3:
                return 0.85

            return 0.62

        if role == QuestionRole.RISK:

            if symptom_count >= 3:
                return 0.78

            if symptom_count == 2:
                return 0.58

            return 0.42

        if role == QuestionRole.VALUE:

            # Value questions are useful when their parent concept is known,
            # otherwise they are poor conversational candidates.
            return 0.55

        return 0.35

    # -----------------------------------------------------------------
    # Specificity score
    # -----------------------------------------------------------------

    def _specificity_score(
        self,
        code: str,
    ) -> float:

        item = self.ontology.get(
            code
        )

        if not item:

            return 0.0

        question = (
            item.get("question_en")
            or ""
        )

        tokens = content_tokens(
            question
        )

        if not tokens:

            return 0.0

        role = self.classifier.classify(
            item
        )

        # Generic questions contain few meaningful discriminative words.
        if role == QuestionRole.GENERIC:

            return 0.20

        # A moderate number of clinical terms usually means a more specific
        # question.
        size_score = min(
            1.0,
            len(tokens) / 7.0,
        )

        return (
            0.45
            +
            0.55 * size_score
        )

    # -----------------------------------------------------------------
    # Balance / usefulness
    # -----------------------------------------------------------------

    def _balance_score(
        self,
        conditional: float,
    ) -> float:

        """
        A question that is true for almost everyone gives little branching
        information.

        A question that is almost always true given the current evidence also
        has limited discriminative value.

        We therefore reward a useful middle range while still allowing strong
        conditional evidence.
        """

        if conditional <= 0:

            return 0.0

        if conditional < 0.05:

            return 0.20

        if conditional < 0.15:

            return 0.55

        if conditional < 0.75:

            return 1.00

        if conditional < 0.95:

            return 0.80

        return 0.55

    # -----------------------------------------------------------------
    # Rank
    # -----------------------------------------------------------------

    def rank(
        self,
        current_codes: Iterable[str],
        known_codes: Iterable[str],
        asked_codes: Iterable[str],
    ) -> list[dict]:

        current = set(
            current_codes
        )

        known = set(
            known_codes
        )

        asked = set(
            asked_codes
        )

        if not current:

            return []

        raw_candidates = (
            self._generate_candidates(
                current
            )
        )

        ranked = []

        for code, row in (
            raw_candidates.items()
        ):

            # ---------------------------------------------------------
            # Hard filters
            # ---------------------------------------------------------

            if code in known:
                continue

            if code in asked:
                continue

            item = (
                self.ontology.get(
                    code
                )
            )

            if not item:
                continue

            question = (
                item.get("question_en")
                or ""
            )

            if not question:
                continue

            # ---------------------------------------------------------
            # Value atoms need special handling.
            #
            # Example:
            #
            # E_55_@_V_29
            #
            # should not appear as an unanswered conversational question
            # when the user has not yet established E_55.
            # ---------------------------------------------------------

            if "_@_" in code:

                parent = code.split(
                    "_@_",
                    1
                )[0]

                if (
                    parent not in known
                    and parent not in current
                ):

                    continue

            # ---------------------------------------------------------
            # Aggregate graph information
            # ---------------------------------------------------------

            support_count = len(
                set(
                    row[
                        "supporting"
                    ]
                )
            )

            edge_count = int(
                row[
                    "edge_count"
                ]
            )

            association = self._mean(
                row[
                    "association_sum"
                ],
                edge_count,
            )

            conditional = self._mean(
                row[
                    "conditional_sum"
                ],
                edge_count,
            )

            jaccard = self._mean(
                row[
                    "jaccard_sum"
                ],
                edge_count,
            )

            multi_support = (
                self._multi_support_score(
                    support_count,
                    len(current),
                )
            )

            # ---------------------------------------------------------
            # Metadata scores
            # ---------------------------------------------------------

            role = self.classifier.classify(
                item
            )

            role_score = (
                self._role_score(
                    role,
                    current,
                )
            )

            specificity = (
                self._specificity_score(
                    code
                )
            )

            novelty = (
                self._novelty_score(
                    code,
                    current,
                )
            )

            redundancy = (
                self._redundancy_score(
                    code,
                    current,
                )
            )

            balance = (
                self._balance_score(
                    conditional
                )
            )

            # ---------------------------------------------------------
            # Question relevance
            #
            # Compare question wording with currently known concepts.
            # This is only a supplementary signal. The graph remains the
            # primary source.
            # ---------------------------------------------------------

            relevance_values = []

            for known in current:

                known_name = (
                    self.ontology.name(
                        known
                    )
                )

                relevance_values.append(
                    token_overlap(
                        known_name,
                        question,
                    )
                )

            relevance = max(
                relevance_values,
                default=0.0,
            )

            # ---------------------------------------------------------
            # Generic penalty
            # ---------------------------------------------------------

            generic_penalty = (
                1.0
                if role == QuestionRole.GENERIC
                else 0.0
            )

            antecedent_penalty = (
                1.0
                if role in {
                    QuestionRole.HISTORY,
                    QuestionRole.RISK,
                }
                else 0.0
            )

            value_penalty = (
                1.0
                if role == QuestionRole.VALUE
                else 0.0
            )

            low_information_penalty = (
                1.0
                if len(
                    content_tokens(
                        question
                    )
                ) <= 2
                else 0.0
            )

            # ---------------------------------------------------------
            # Final score
            # ---------------------------------------------------------

            score = (

                WEIGHT_ASSOCIATION
                * min(
                    1.0,
                    association,
                )

                +

                WEIGHT_CONDITIONAL
                * min(
                    1.0,
                    conditional,
                )

                +

                WEIGHT_JACCARD
                * min(
                    1.0,
                    jaccard,
                )

                +

                WEIGHT_MULTI_SUPPORT
                * multi_support

                +

                WEIGHT_NOVELTY
                * novelty

                +

                WEIGHT_SPECIFICITY
                * specificity

                +

                WEIGHT_ROLE
                * role_score

                +

                WEIGHT_BALANCE
                * balance

                +

                WEIGHT_RELEVANCE
                * relevance

                -

                GENERIC_PENALTY
                * generic_penalty

                -

                ANTECEDENT_PENALTY
                * antecedent_penalty

                -

                VALUE_ATOM_PENALTY
                * value_penalty

                -

                REDUNDANCY_PENALTY
                * redundancy

                -

                LOW_INFORMATION_PENALTY
                * low_information_penalty
            )

            # ---------------------------------------------------------
            # Stronger multi-evidence boost
            #
            # A question supported by multiple current evidence concepts
            # should generally beat a question supported by only one.
            # ---------------------------------------------------------

            if support_count >= 2:

                score += min(
                    0.10,
                    0.04
                    * (
                        support_count - 1
                    )
                )

            # ---------------------------------------------------------
            # If there are still very direct symptom questions available,
            # keep risk/history questions below them.
            #
            # This is a general role-based rule, NOT a disease-specific
            # rule.
            # ---------------------------------------------------------

            symptom_candidates_exist = any(
                self.classifier.classify(
                    self.ontology.get(
                        other_code
                    )
                )
                in {
                    QuestionRole.SYMPTOM,
                    QuestionRole.DETAIL,
                }

                for other_code
                in raw_candidates.keys()

                if (
                    other_code
                    not in known
                    and other_code
                    not in asked
                    and self.ontology.get(
                        other_code
                    )
                )
            )

            if (
                symptom_candidates_exist
                and role
                in {
                    QuestionRole.HISTORY,
                    QuestionRole.RISK,
                }
            ):

                score -= 0.10

            # ---------------------------------------------------------
            # Final clamp
            # ---------------------------------------------------------

            score = max(
                0.0,
                min(
                    1.0,
                    score,
                ),
            )

            ranked.append(
                {
                    "evidence_code":
                        code,

                    "question":
                        question,

                    "score":
                        score,

                    "association":
                        association,

                    "conditional":
                        conditional,

                    "jaccard":
                        jaccard,

                    "support_count":
                        support_count,

                    "supporting":
                        sorted(
                            set(
                                row[
                                    "supporting"
                                ]
                            )
                        ),

                    "pair_count":
                        row[
                            "pair_count_sum"
                        ],

                    "role":
                        role,

                    "specificity":
                        specificity,

                    "novelty":
                        novelty,

                    "redundancy":
                        redundancy,

                    "balance":
                        balance,

                    "relevance":
                        relevance,
                }
            )

        ranked.sort(
            key=lambda x: (
                x["score"],
                x["support_count"],
                x["conditional"],
                x["association"],
            ),
            reverse=True,
        )

        return ranked[
            :TOP_QUESTION_COUNT
        ]


# =============================================================================
# RESPONSE BUILDER
# =============================================================================

class ResponseBuilder:

    @staticmethod
    def unsupported(
        near_misses: Optional[list[str]] = None,
    ) -> str:

        # ----------------------------------------------------
        # FIX: previously this message was a hard dead end that
        # discarded evidence_matcher's `candidates` list entirely,
        # even when it contained plausible near-miss matches (e.g.
        # "difficulty to walk" scoring 0.73 against
        # "weakness in both arms or legs" but falling just short of
        # ACCEPT_THRESHOLD). We now surface those as a clarifying
        # "did you mean" prompt so the conversation can continue
        # instead of stalling.
        # ----------------------------------------------------

        base = (
            "I couldn't confidently match that to a specific symptom "
            "in my checklist."
        )

        if near_misses:

            options = "\n".join(
                f"• {item}" for item in near_misses
            )

            return (
                f"{base}\n\n"
                "Did you mean one of these?\n\n"
                f"{options}\n\n"
                "You can reply with one of the options above, or "
                "describe it differently."
            )

        return (
            f"{base}\n\n"
            "Please describe what you are experiencing in a little more "
            "detail.\n\n"
            "For example:\n"
            "• I have a fever.\n"
            "• I've been coughing.\n"
            "• I feel short of breath.\n"
            "• I have pain in my chest."
        )

    @staticmethod
    def negated_only() -> str:

        return (
            "I understood that you are not experiencing the reported "
            "symptom, but I need at least one supported symptom or "
            "relevant health detail to continue the assessment."
        )

    @staticmethod
    def pain_needs_location() -> str:

        # ----------------------------------------------------
        # FIX: dedicated response for "I have pain/an ache somewhere"
        # where the value extractor couldn't resolve a specific
        # location. Its location list is a fixed, fairly granular
        # anatomical checklist (specific joints, sub-regions of the
        # chest, etc.) rather than broad terms like "back" or "chest"
        # on their own, so this asks the person to be more specific
        # instead of showing unrelated binary "did you mean" options.
        # ----------------------------------------------------

        return (
            "It sounds like you're describing pain or discomfort, but "
            "I couldn't pin down the exact location from what you "
            "wrote.\n\n"
            "Could you be a bit more specific about where it is? For "
            "example: chest, abdomen, a specific joint (knee, "
            "shoulder, ankle...), one of your limbs, or the back of "
            "your neck/head."
        )

    @staticmethod
    def needs_more(
        question: str,
    ) -> str:

        return (
            "I've recorded the information you provided, but I need "
            "a little more information before generating a condition "
            "ranking.\n\n"
            f"To narrow this down, {question}"
        )

    @staticmethod
    def no_more_questions() -> str:

        return (
            "I've recorded the supported information you provided, "
            "but there still isn't enough evidence for a reliable "
            "condition ranking.\n\n"
            "Please provide any additional symptoms, their duration, "
            "severity, or other relevant health information."
        )

    @staticmethod
    def prediction_intro() -> str:

        return (
            "I have enough supported information to generate a "
            "condition ranking. These are model predictions, not "
            "a diagnosis."
        )


# =============================================================================
# CONVERSATION ENGINE
# =============================================================================

class MediTwinConversationEngine:

    def __init__(
        self,
        age: float,
        sex: str,
        matcher=None,
        pipeline=None,
    ):

        self.age = float(
            age
        )

        self.sex = str(
            sex
        )

        # -------------------------------------------------------------
        # Model pipeline
        #
        # FIX: this used to be built LAST, after a fresh EvidenceMatcher
        # and ValueExtractor were already constructed directly by this
        # class. But MediTwinInferencePipeline builds its OWN internal
        # EvidenceMatcher (which loads spaCy + rebuilds the entire
        # alias index -- the single most expensive part of startup)
        # and its own ValueExtractor, completely independently. The
        # result was silently loading spaCy and the alias index TWICE
        # on every startup, which is most of why loading was slow.
        #
        # The pipeline is now built FIRST, and the matcher/value
        # extractor below are reused from it whenever it loaded
        # successfully, instead of building a second copy of either.
        # -------------------------------------------------------------

        self.pipeline = pipeline

        if self.pipeline is None:

            try:

                from inference_pipeline import (
                    MediTwinInferencePipeline
                )

                print(
                    "\nLoading model pipeline..."
                )

                self.pipeline = (
                    MediTwinInferencePipeline()
                )

            except Exception as exc:

                print(
                    "⚠ Model pipeline could not be loaded."
                )

                print(
                    f"  {exc}"
                )

                self.pipeline = None

        # -------------------------------------------------------------
        # Matcher
        # -------------------------------------------------------------

        if matcher is None:
            matcher = getattr(
                self.pipeline,
                "matcher",
                None,
            )

        if matcher is None:

            from evidence_matcher import (
                EvidenceMatcher
            )

            matcher = EvidenceMatcher()

        self.matcher = matcher

        # -------------------------------------------------------------
        # Value extractor (pain / lesion location, intensity, onset,
        # precision)
        #
        # FIX: this already existed and was fully implemented
        # (value_extractor.py), and inference_pipeline.py already
        # loaded it and knew how to combine its atoms with the
        # matcher's binary evidence -- but conversation_engine.py
        # never called it during a live conversation. It only ever
        # ran, by accident, inside `self.pipeline.predict(text=...)`
        # at final model-invocation time, and only on turns whose
        # text had ALREADY produced binary evidence (see `_run_model`,
        # which only forwards `self.state.positive` source texts).
        # A turn that was PURELY a pain/location description (e.g.
        # "I am having back pain") never registered any binary
        # evidence, so its text was silently dropped and the value
        # extractor never got a chance to see it at all.
        #
        # We now run it directly on every turn, the same way the
        # matcher is run, so pain/location descriptions are captured
        # immediately instead of only in the lucky case where the
        # same sentence also happens to contain separate binary
        # evidence.
        # -------------------------------------------------------------

        self.value_extractor = (
            getattr(self.pipeline, "value_extractor", None)
        )

        if self.value_extractor is None:

            try:
                from value_extractor import ValueExtractor
            except ImportError:
                from inference.value_extractor import ValueExtractor

            self.value_extractor = ValueExtractor()

        # -------------------------------------------------------------
        # Ontology
        # -------------------------------------------------------------

        print(
            "\nLoading evidence catalog..."
        )

        self.ontology = (
            EvidenceOntology()
        )

        print(
            f"✓ Evidence catalog loaded: "
            f"{len(self.ontology.items)} entries"
        )

        # -------------------------------------------------------------
        # Graph
        # -------------------------------------------------------------

        print(
            "\nLoading evidence graph..."
        )

        self.graph = (
            EvidenceGraph(
                self.ontology
            )
        )

        # -------------------------------------------------------------
        # Question ranker
        # -------------------------------------------------------------

        print(
            "\nBuilding conversational question ranker..."
        )

        self.question_ranker = (
            ConversationalQuestionRanker(
                self.ontology,
                self.graph,
            )
        )

        # -------------------------------------------------------------
        # Conversation state
        # -------------------------------------------------------------

        self.state = (
            ConversationState()
        )

        self._last_value_hits: list = []

        print(
            "\n✓ Conversational evidence engine ready"
        )

    # =========================================================================
    # RESET
    # =========================================================================

    def reset(self):

        self.state = (
            ConversationState()
        )

        self._last_value_hits = []

    # =========================================================================
    # CURRENT EVIDENCE
    # =========================================================================

    @property
    def positive_codes(self):

        return set(
            self.state.positive.keys()
        )

    @property
    def negated_codes(self):

        return set(
            self.state.negated.keys()
        )

    @property
    def known_codes(self):

        return (
            self.positive_codes
            |
            self.negated_codes
        )

    # =========================================================================
    # SAVE POSITIVE
    # =========================================================================

    def _save_positive(
        self,
        item: dict,
        text: str,
    ):

        code = item.get(
            "evidence_code"
        )

        if not code:

            return

        # Different matcher generations used different field names:
        #   final matcher -> score
        #   older matcher -> confidence
        # Keep the conversation layer independent of that detail.
        confidence = float(
            item.get(
                "confidence",
                item.get("score", 0.0),
            ) or 0.0
        )

        record = EvidenceRecord(
            code=code,
            confidence=confidence,
            source_text=text,
            turn=self.state.turns,
            alias=item.get("alias"),
            matched_tokens=item.get("matched_tokens", []),
            question=(
                item.get("question_en")
                or item.get("question")
                or self.ontology.question(code)
            ),
        )

        # Latest explicit positive state wins.
        self.state.positive[
            code
        ] = record

        self.state.negated.pop(
            code,
            None,
        )

    # =========================================================================
    # SAVE NEGATIVE
    # =========================================================================

    def _save_negated(
        self,
        item: dict,
        text: str,
    ):

        code = item.get(
            "evidence_code"
        )

        if not code:

            return

        confidence = float(
            item.get(
                "confidence",
                item.get("score", 0.0),
            ) or 0.0
        )

        record = EvidenceRecord(
            code=code,
            confidence=confidence,
            source_text=text,
            turn=self.state.turns,
            alias=item.get("alias"),
            matched_tokens=item.get("matched_tokens", []),
            question=(
                item.get("question_en")
                or item.get("question")
                or self.ontology.question(code)
            ),
        )

        # Latest explicit negative state wins.
        self.state.positive.pop(
            code,
            None,
        )

        self.state.negated[
            code
        ] = record

    # =========================================================================
    # MATCHER RESULT NORMALIZATION
    # =========================================================================

    @staticmethod
    def _as_list(value):
        if value is None:
            return []
        if isinstance(value, list):
            return value
        if isinstance(value, tuple):
            return list(value)
        if isinstance(value, dict):
            return [value]
        return []

    def _normalize_match_item(self, item):
        """
        Normalize output from all matcher generations used in this project.

        Supported positive keys:
            evidence
            accepted_evidence
            supported_evidence

        Supported negative keys:
            negated
            negated_evidence
            negative_evidence

        Score compatibility:
            confidence
            score
        """
        if isinstance(item, str):
            return {
                "evidence_code": item,
                "confidence": 1.0,
                "question_en": self.ontology.question(item),
            }

        if not isinstance(item, dict):
            return None

        code = (
            item.get("evidence_code")
            or item.get("code")
            or item.get("evidence_code_id")
        )

        if not code:
            return None

        normalized = dict(item)
        normalized["evidence_code"] = code
        normalized["confidence"] = float(
            item.get(
                "confidence",
                item.get("score", 0.0),
            ) or 0.0
        )

        if not normalized.get("question_en"):
            normalized["question_en"] = (
                item.get("question")
                or self.ontology.question(code)
            )

        return normalized

    def _extract_match_result(self, result):
        """
        Convert matcher output to:

            positive_items, negated_items

        The current final matcher returns:
            result["evidence"]
            result["negated"]

        Older versions returned:
            result["evidence"]
            result["negated_evidence"]

        This adapter prevents the conversation engine from depending on
        one exact matcher implementation.
        """
        if not isinstance(result, dict):
            return [], []

        positive_keys = (
            "evidence",
            "accepted_evidence",
            "supported_evidence",
            "positive_evidence",
        )

        negative_keys = (
            "negated",
            "negated_evidence",
            "negative_evidence",
            "rejected_evidence",
        )

        positive = []
        negative = []

        for key in positive_keys:
            values = self._as_list(result.get(key))
            if values:
                positive.extend(values)
                break

        for key in negative_keys:
            values = self._as_list(result.get(key))
            if values:
                negative.extend(values)
                break

        positive = [
            x for x in
            (
                self._normalize_match_item(v)
                for v in positive
            )
            if x is not None
        ]

        negative = [
            x for x in
            (
                self._normalize_match_item(v)
                for v in negative
            )
            if x is not None
        ]

        # Deduplicate by evidence code while preserving the strongest match.
        def strongest(items):
            out = {}
            for item in items:
                code = item["evidence_code"]
                if (
                    code not in out
                    or item["confidence"]
                    > out[code]["confidence"]
                ):
                    out[code] = item
            return list(out.values())

        return strongest(positive), strongest(negative)

    # =========================================================================
    # PENDING QUESTION ANSWERS
    # =========================================================================

    YES_PATTERNS = (
        "yes",
        "yes i do",
        "yes i have",
        "yes i am",
        "i do",
        "i have",
        "i am",
        "correct",
        "yeah",
        "yep",
        "yup",
        "sure",
    )

    NO_PATTERNS = (
        "no",
        "no i do not",
        "no i don't",
        "no i dont",
        "i do not",
        "i don't",
        "i dont",
        "not really",
        "negative",
        "nope",
    )

    @staticmethod
    def _short_answer_type(text: str):
        normalized = normalize_text(text)

        if not normalized:
            return None

        # Only use this mechanism for short conversational replies. A full
        # symptom sentence should always go through the real matcher.
        words = normalized.split()
        if len(words) > 7:
            return None

        if normalized in MediTwinConversationEngine.YES_PATTERNS:
            return "yes"

        if normalized in MediTwinConversationEngine.NO_PATTERNS:
            return "no"

        if re.match(
            r"^(yes|yeah|yep|yup|sure)\b",
            normalized,
        ):
            return "yes"

        if re.match(
            r"^(no|nope)\b",
            normalized,
        ):
            return "no"

        return None

    def _apply_pending_answer(self, text: str) -> bool:
        """
        Bind a short yes/no answer to the exact question previously asked.

        Returns True when the input was consumed as an answer.
        """
        if not ENABLE_PENDING_QUESTION_ANSWERS:
            return False

        code = self.state.pending_question_code
        if not code:
            return False

        answer = self._short_answer_type(text)
        if answer is None:
            return False

        item = {
            "evidence_code": code,
            "confidence": 1.0,
            "question_en": self.ontology.question(code),
            "alias": None,
            "matched_tokens": [],
        }

        if answer == "yes":
            self._save_positive(item, text)
        else:
            self._save_negated(item, text)

        # The question has now been answered. It must not be asked again.
        self.state.pending_question_code = None
        return True

    # =========================================================================
    # UPDATE STATE
    # =========================================================================

    def _update_state(
        self,
        result: dict,
        text: str,
    ):
        positive_items, negative_items = (
            self._extract_match_result(result)
        )

        for item in positive_items:
            self._save_positive(item, text)

        for item in negative_items:
            self._save_negated(item, text)

        # If a previously asked question has now been answered explicitly,
        # clear its pending slot. This also works for full sentences such as:
        #   "No, I do not have shortness of breath."
        pending = self.state.pending_question_code

        if pending and (
            pending in self.positive_codes
            or pending in self.negated_codes
        ):
            self.state.pending_question_code = None

        return positive_items, negative_items

    # =========================================================================
    # DISPLAY NAMES
    # =========================================================================

    def _detected_names(self):

        names = []

        for code in sorted(
            self.positive_codes
        ):

            names.append(
                self.ontology.name(
                    code
                )
            )

        return names

    # =========================================================================
    # SUFFICIENCY
    # =========================================================================

    # =========================================================================
    # GENERIC REJECTION / PAIN-CONTEXT DETECTION
    # =========================================================================

    _REJECTION_PATTERN = re.compile(
        r"^(no|nope|nah|none|not really|nothing like that|"
        r"no issues?( related to .*)?|none of (these|those|the above)|"
        r"not that|doesn'?t apply|not applicable|negative)\b",
        re.IGNORECASE,
    )

    _PAIN_CONTEXT_TERMS = (
        "pain", "ache", "aches", "aching", "hurt", "hurts", "painful",
    )

    @classmethod
    def _is_generic_rejection(
        cls,
        text: str,
    ) -> bool:

        stripped = text.strip()

        # Long, descriptive replies are never a bare rejection, even if
        # they start with "no" (e.g. "no, but I do have a fever").
        if len(stripped.split()) > 6:
            return False

        return bool(
            cls._REJECTION_PATTERN.match(stripped)
        )

    @classmethod
    def _mentions_pain_context(
        cls,
        text: str,
    ) -> bool:

        lowered = text.lower()

        return any(
            re.search(rf"\b{re.escape(term)}\b", lowered)
            for term in cls._PAIN_CONTEXT_TERMS
        )

    def _sufficient(
        self,
    ) -> tuple[bool, str]:

        positive = (
            self.positive_codes
        )

        if not positive:

            return (
                False,
                "no_positive_evidence",
            )

        # -------------------------------------------------------------
        # Multiple positive evidence concepts.
        # -------------------------------------------------------------

        if len(
            positive
        ) >= MIN_POSITIVE_EVIDENCE:

            return (
                True,
                "multiple_supported_evidence",
            )

        # -------------------------------------------------------------
        # One evidence concept.
        # -------------------------------------------------------------

        if not ALLOW_SINGLE_EVIDENCE_PREDICTION:

            return (
                False,
                "single_evidence_insufficient_by_policy",
            )

        code = next(
            iter(
                positive
            )
        )

        record = (
            self.state.positive[
                code
            ]
        )

        prevalence = (
            self.graph.evidence_prevalence.get(
                code,
                0.0,
            )
        )

        broad = (
            prevalence
            >= BROAD_PREVALENCE_THRESHOLD
        )

        if (
            record.confidence
            >= SINGLE_EVIDENCE_MIN_CONFIDENCE
            and not broad
        ):

            return (
                True,
                "high_confidence_specific_single_evidence",
            )

        return (
            False,
            "single_broad_or_insufficient_evidence",
        )

    # =========================================================================
    # QUESTION RANKING
    # =========================================================================

    def _question_candidates(self):

        # FIX: translate any bare value-based code (e.g. "E_55") to
        # the specific atom the user actually gave (e.g.
        # "E_55_@_V_29") before asking the graph for neighbors -- the
        # graph is keyed entirely by atoms for categorical evidence,
        # so passing the bare code through unchanged would silently
        # return zero neighbors every time.
        graph_codes = set()

        for code in self.positive_codes:
            atom = self.state.positive_atoms.get(code)
            graph_codes.add(atom if atom else code)

        return self.question_ranker.rank(
            current_codes=graph_codes,
            known_codes=self.known_codes,
            asked_codes=self.state.asked_questions.keys(),
        )

    # =========================================================================
    # NEXT QUESTION
    # =========================================================================

    def _next_question(self):

        candidates = (
            self._question_candidates()
        )

        # ----------------------------------------------------
        # FIX: skip candidates whose role is VALUE (categorical
        # evidence like pain intensity/radiation/onset-speed). The
        # existing "pending question -> yes/no answer" mechanism
        # (_apply_pending_answer) only knows how to bind a simple
        # yes/no reply to a BINARY evidence code; it has no way to
        # parse a reply like "7 out of 10" or "it spreads to my arm"
        # against a categorical question. Suggesting one as the next
        # question would silently mishandle the user's answer. Binary
        # follow-ups (the vast majority of the graph) are unaffected.
        # ----------------------------------------------------

        for candidate in candidates:

            if candidate.get("role") == QuestionRole.VALUE:
                continue

            return candidate

        return None

    # =========================================================================
    # RUN MODEL
    # =========================================================================

    def _run_model(self):

        if self.pipeline is None:

            return None

        # -------------------------------------------------------------
        # FIX: this previously reconstructed a single blob of text by
        # concatenating every positive turn's original source text,
        # then called `self.pipeline.predict(text=model_text, ...)` --
        # the pipeline's NATURAL-LANGUAGE entry point, which
        # internally re-runs its own independent extraction
        # (`extract_evidence`) on that reconstructed text from
        # scratch, discarding everything the conversation engine had
        # already correctly and carefully determined turn-by-turn.
        #
        # This was fragile in practice: concatenating several turns'
        # text back-to-back does not reliably re-extract the same
        # evidence a per-turn pass found (sentence-boundary and
        # phrase-matching assumptions do not hold the same way against
        # a run-on merge of unrelated sentences), so this could
        # silently come back with zero evidence atoms and an empty
        # prediction list -- even though the conversation state
        # already had solid, verified evidence.
        #
        # `inference_pipeline.py` already documents the fix directly
        # in `predict_from_evidence`'s own docstring: "This is the
        # method the conversational engine should use." It accepts
        # already-resolved evidence codes/atoms directly, skipping the
        # fragile text round-trip entirely. We now use exactly that,
        # translating any value-based bare code (e.g. "E_55") to the
        # specific atom already resolved for it this conversation
        # (e.g. "E_55_@_V_40"), the same translation already used for
        # the question-ranker graph lookups.
        # -------------------------------------------------------------

        atoms = []

        for code in self.positive_codes:

            atom = self.state.positive_atoms.get(code)

            atoms.append(
                atom if atom else code
            )

        if not atoms:

            return None

        try:

            return self.pipeline.predict_from_evidence(
                evidence_codes=atoms,
                age=self.age,
                sex=self.sex,
                top_k=5,
            )

        except Exception as exc:

            print(
                "⚠ Model inference failed:"
            )

            print(
                f"  {exc}"
            )

            return None

    # =========================================================================
    # PREDICTION RESPONSE
    # =========================================================================

    def _prediction_response(
        self,
        model_result,
    ):

        if model_result is None:

            return {
                "status":
                    STATUS_INSUFFICIENT,

                "message":
                    (
                        "I have enough supported information to "
                        "continue the assessment, but the condition "
                        "ranking model is currently unavailable."
                    ),

                "predictions":
                    [],
            }

        # -------------------------------------------------------------
        # Pipeline may return:
        #
        # {
        #   "predictions": [...]
        # }
        #
        # or directly a list.
        # -------------------------------------------------------------

        if isinstance(
            model_result,
            dict
        ):

            predictions = (
                model_result.get(
                    "predictions",
                    []
                )
            )

        elif isinstance(
            model_result,
            list
        ):

            predictions = (
                model_result
            )

        else:

            predictions = []

        if not isinstance(
            predictions,
            list
        ):

            predictions = []

        if not predictions:

            # FIX: surface the pipeline's actual reason (if it gave
            # one) instead of a vague catch-all message. This mostly
            # matters for debugging/support -- the underlying cause is
            # now much rarer since _run_model passes pre-resolved
            # atoms directly via predict_from_evidence instead of
            # re-deriving them from reconstructed text.
            detail = None

            if isinstance(model_result, dict):
                detail = (
                    model_result.get("warning")
                    or model_result.get("status")
                )

            message = (
                "I have enough supported information to continue "
                "the assessment, but the model did not return a "
                "reliable condition ranking."
            )

            if detail:
                message += f" (reason: {detail})"

            return {
                "status": STATUS_INSUFFICIENT,
                "message": message,
                "predictions": [],
                "model": model_result,
            }

        return {
            "status":
                STATUS_PREDICTION,

            "message":
                ResponseBuilder.prediction_intro(),

            "predictions":
                predictions,

            "model":
                model_result,
        }

    # =========================================================================
    # STATE PAYLOAD
    # =========================================================================

    def _state_payload(self):

        return {
            "positive_evidence":
                sorted(
                    self.positive_codes
                ),

            "negated_evidence":
                sorted(
                    self.negated_codes
                ),

            "known_evidence":
                sorted(
                    self.known_codes
                ),

            "asked_evidence":
                sorted(
                    self.state.asked_questions.keys()
                ),

            "turn":
                self.state.turns,

            "follow_ups":
                self.state.follow_ups,

            "pending_question_code":
                self.state.pending_question_code,
        }

    # =========================================================================
    # MAIN PROCESSOR
    # =========================================================================

    def process(
        self,
        text: str,
    ) -> dict:

        text = str(
            text
        ).strip()

        # -------------------------------------------------------------
        # Invalid input
        # -------------------------------------------------------------

        if not text:

            return {
                "status":
                    STATUS_INVALID,

                "message":
                    "Please describe what you are experiencing.",

                "positive_evidence":
                    sorted(
                        self.positive_codes
                    ),

                "negated_evidence":
                    sorted(
                        self.negated_codes
                    ),
            }

        # -------------------------------------------------------------
        # Conversation finished
        # -------------------------------------------------------------

        if self.state.finished:

            return {
                "status":
                    STATUS_INSUFFICIENT,

                "message":
                    (
                        "This assessment has reached its current "
                        "stopping point. Please start a new assessment "
                        "if you want to provide a different case."
                    ),
            }

        self.state.turns += 1

        self.state.user_messages.append(
            text
        )

        # -------------------------------------------------------------
        # FIX: interpret a generic rejection of the last "did you
        # mean" suggestions (CASE 3) BEFORE re-running the matcher.
        #
        # Without this, a reply like "no issues related to throat" is
        # matched fresh against every alias -- and since it literally
        # contains the word "throat" (echoed back from the suggestion
        # it's rejecting), the matcher proposes another throat-themed
        # candidate, creating a loop the conversation can never escape
        # on its own. Recognizing the rejection, remembering which
        # codes were declined, and clearing them from future
        # suggestions breaks that loop.
        # -------------------------------------------------------------

        previously_suggested = self.state.last_suggested_codes
        self.state.last_suggested_codes = []

        if previously_suggested and self._is_generic_rejection(text):

            self.state.declined_codes.update(
                previously_suggested
            )

            response = {
                "status":
                    STATUS_UNSUPPORTED,

                "message":
                    ResponseBuilder.unsupported(
                        near_misses=None,
                    ),
            }

            response.update(
                self._state_payload()
            )

            return response


        # -------------------------------------------------------------
        # First resolve a short answer to the question we just asked.
        # This is essential for a conversational system:
        #
        #   "Do you have fever?"
        #   "No."
        #
        # "No" has no symptom words for the matcher to discover, so it
        # must be bound to the pending evidence code.
        # -------------------------------------------------------------

        consumed_pending_answer = (
            self._apply_pending_answer(text)
        )

        if consumed_pending_answer:
            self._last_value_hits = []
            result = {
                "status": (
                    "supported"
                    if self.positive_codes
                    else "negated"
                ),
                "evidence": [],
                "negated": [],
            }
        else:
            result = self.matcher.match(text)

            self._update_state(
                result,
                text,
            )

            # ---------------------------------------------------------
            # FIX: also run the value extractor on every turn (pain
            # location / intensity / onset / precision). This is what
            # lets a pure pain/location description like "back pain"
            # or "pain in my knee" register as real evidence even when
            # the binary matcher has nothing to say about it -- see
            # the note in __init__ for why this was previously dead
            # code in practice.
            # ---------------------------------------------------------

            try:
                value_hits = self.value_extractor.extract(text)
            except Exception:
                value_hits = []

            self._last_value_hits = value_hits

            for value_item in value_hits:
                enriched = dict(value_item)
                enriched.setdefault("confidence", 0.9)
                enriched.setdefault("alias", value_item.get("matched_text"))
                self._save_positive(enriched, text)

                base_code = value_item.get("evidence_code")
                atom = value_item.get("atom")

                if base_code and atom:
                    self.state.positive_atoms[base_code] = atom



        # =============================================================
        # CASE 1:
        # POSITIVE EVIDENCE EXISTS
        # =============================================================

        if self.positive_codes:

            sufficient, reason = (
                self._sufficient()
            )

            # ---------------------------------------------------------
            # Enough evidence
            # ---------------------------------------------------------

            if sufficient:

                model_result = (
                    self._run_model()
                )

                response = (
                    self._prediction_response(
                        model_result
                    )
                )

                response[
                    "sufficiency_reason"
                ] = reason

                response.update(
                    self._state_payload()
                )

                return response

            # ---------------------------------------------------------
            # Not enough evidence.
            #
            # Select the best unanswered question.
            # ---------------------------------------------------------

            if (
                self.state.follow_ups
                < MAX_FOLLOW_UP_QUESTIONS
            ):

                question = (
                    self._next_question()
                )

                if question:

                    code = (
                        question[
                            "evidence_code"
                        ]
                    )

                    self.state.asked_questions[
                        code
                    ] = QuestionRecord(
                        code=code,

                        turn=self.state.turns,

                        question=question[
                            "question"
                        ],

                        score=question[
                            "score"
                        ],
                    )

                    self.state.follow_ups += 1

                    # Keep exactly one pending question. The next short
                    # yes/no answer is interpreted against this code.
                    self.state.pending_question_code = code

                    message = (
                        ResponseBuilder.needs_more(
                            question[
                                "question"
                            ]
                        )
                    )

                    response = {
                        "status":
                            STATUS_NEEDS_MORE,

                        "message":
                            message,

                        "next_question":
                            question[
                                "question"
                            ],

                        "next_evidence_code":
                            code,

                        "question_score":
                            round(
                                question[
                                    "score"
                                ],
                                4,
                            ),

                        "question_association":
                            round(
                                question[
                                    "association"
                                ],
                                4,
                            ),

                        "question_conditional":
                            round(
                                question[
                                    "conditional"
                                ],
                                4,
                            ),

                        "question_role":
                            question[
                                "role"
                            ],

                        "question_supporting":
                            question[
                                "supporting"
                            ],

                        "question_support_count":
                            question[
                                "support_count"
                            ],

                        "question_reason":
                            (
                                "graph + "
                                "specificity + "
                                "novelty + "
                                "conversational relevance"
                            ),

                        "current_sufficiency_reason":
                            reason,
                    }

                    response.update(
                        self._state_payload()
                    )

                    return response

            # ---------------------------------------------------------
            # No useful follow-up remains.
            # ---------------------------------------------------------

            response = {
                "status":
                    STATUS_INSUFFICIENT,

                "message":
                    ResponseBuilder.no_more_questions(),

                "sufficiency_reason":
                    reason,
            }

            response.update(
                self._state_payload()
            )

            return response

        # =============================================================
        # CASE 2:
        # ONLY NEGATED EVIDENCE
        # =============================================================

        if self.negated_codes:

            response = {
                "status":
                    STATUS_NEGATED,

                "message":
                    ResponseBuilder.negated_only(),
            }

            response.update(
                self._state_payload()
            )

            return response

        # =============================================================
        # CASE 3:
        # NOTHING SUPPORTED
        # =============================================================

        # ----------------------------------------------------
        # FIX 3a: if the user is clearly describing pain/aching but
        # the value extractor couldn't pin down a specific location
        # from its checklist (its location vocabulary is a fixed
        # anatomical list -- it doesn't have a generic "back" or
        # generic "chest", only specific sub-regions), ask a targeted
        # open question about location instead of showing unrelated
        # binary "did you mean" suggestions like sore throat or loss
        # of consciousness.
        # ----------------------------------------------------

        if (
            self._mentions_pain_context(text)
            and not getattr(self, "_last_value_hits", None)
        ):

            response = {
                "status":
                    STATUS_UNSUPPORTED,

                "message":
                    ResponseBuilder.pain_needs_location(),
            }

            response.update(
                self._state_payload()
            )

            return response

        # ----------------------------------------------------
        # FIX 3b: surface near-miss candidates instead of dead-ending
        # -- but only genuinely plausible ones. `result["candidates"]`
        # holds every scored candidate the matcher considered, but
        # score alone is not a reliable filter: a single coincidental
        # shared word (e.g. "pain" in "back pain" matching the "sore
        # throat" alias, which also contains the word "pain"-adjacent
        # tokens) can still score 0.70+. What actually distinguishes
        # noise from a real near-miss is `coverage` -- the fraction of
        # the alias's own words that were found in the input. Noise
        # sits at ~0.5 (one word out of two); genuine near-misses sit
        # at >=0.67, the same bar used for a real partial-match accept
        # elsewhere in the matcher. Declined codes (see
        # _is_generic_rejection) are also excluded so a rejected
        # suggestion never comes back.
        # ----------------------------------------------------

        near_misses: list[str] = []
        near_miss_codes: list[str] = []
        seen_codes: set[str] = set()

        candidates = (
            result.get("candidates", [])
            if isinstance(result, dict)
            else []
        )

        ranked_candidates = sorted(
            [
                c for c in candidates
                if c.get("score", 0.0) >= 0.55
                and c.get("coverage", 0.0) >= 0.67
                and c.get("evidence_code") not in self.state.declined_codes
            ],
            key=lambda c: c.get("score", 0.0),
            reverse=True,
        )

        for candidate in ranked_candidates:

            code = candidate.get("evidence_code")

            if not code or code in seen_codes:
                continue

            seen_codes.add(code)

            question = self.ontology.question(code)

            if question:
                near_misses.append(question)
                near_miss_codes.append(code)

            if len(near_misses) >= 3:
                break

        self.state.last_suggested_codes = near_miss_codes

        response = {
            "status":
                STATUS_UNSUPPORTED,

            "message":
                ResponseBuilder.unsupported(
                    near_misses=near_misses or None,
                ),
        }

        response.update(
            self._state_payload()
        )

        return response

    # =========================================================================
    # DEBUG QUESTION RANKING
    # =========================================================================

    def debug_questions(
        self,
        limit: int = 10,
    ):

        print()
        print("=" * 80)
        print("CURRENT CONVERSATIONAL QUESTION RANKING")
        print("=" * 80)

        questions = (
            self.question_ranker.rank(
                current_codes=self.positive_codes,
                known_codes=self.known_codes,
                asked_codes=self.state.asked_questions.keys(),
            )
        )

        if not questions:

            print(
                "No candidate questions."
            )

            return

        for index, question in enumerate(
            questions[:limit],
            1,
        ):

            print()
            print(
                f"{index}. "
                f"{question['evidence_code']}"
            )

            print(
                f"   {question['question']}"
            )

            print(
                f"   Final score     : "
                f"{question['score']:.4f}"
            )

            print(
                f"   Association     : "
                f"{question['association']:.4f}"
            )

            print(
                f"   Conditional     : "
                f"{question['conditional']:.4f}"
            )

            print(
                f"   Support count   : "
                f"{question['support_count']}"
            )

            print(
                f"   Role            : "
                f"{question['role']}"
            )

            print(
                f"   Specificity     : "
                f"{question['specificity']:.4f}"
            )

            print(
                f"   Novelty         : "
                f"{question['novelty']:.4f}"
            )

            print(
                f"   Redundancy      : "
                f"{question['redundancy']:.4f}"
            )

            print(
                f"   Supporting      : "
                f"{question['supporting']}"
            )

    # =========================================================================
    # DEBUG STATE
    # =========================================================================

    def debug_state(self):

        print()
        print("=" * 80)
        print("MEDI TWIN CONVERSATION STATE")
        print("=" * 80)

        print(
            "Positive:",
            sorted(
                self.positive_codes
            ),
        )

        print(
            "Negated:",
            sorted(
                self.negated_codes
            ),
        )

        print(
            "Asked:",
            sorted(
                self.state.asked_questions.keys()
            ),
        )

        print(
            "Turns:",
            self.state.turns,
        )

        print(
            "Follow-ups:",
            self.state.follow_ups,
        )

        print(
            "Pending question:",
            self.state.pending_question_code,
        )


# =============================================================================
# REGRESSION TESTS
# =============================================================================

def run_regression():

    print()
    print("=" * 80)
    print(
        "MEDI TWIN - FINAL CONVERSATIONAL "
        "QUESTION RANKING"
    )
    print("=" * 80)

    engine = MediTwinConversationEngine(
        age=35,
        sex="Male",
    )

    # -------------------------------------------------------------------------
    # TEST 1
    # -------------------------------------------------------------------------

    print()
    print("#" * 80)
    print(
        "TEST 1 - SHORTNESS OF BREATH"
    )
    print("#" * 80)

    tests = [
        "I feel short of breath.",
        "I also have a cough.",
        "I have fever.",
    ]

    for text in tests:

        print()
        print(
            "USER:"
        )

        print(
            text
        )

        result = (
            engine.process(
                text
            )
        )

        print()
        print(
            "STATUS:",
            result.get(
                "status"
            ),
        )

        print(
            "MESSAGE:"
        )

        print(
            result.get(
                "message"
            )
        )

        if result.get(
            "next_question"
        ):

            print()
            print(
                "NEXT QUESTION:",
                result[
                    "next_question"
                ],
            )

            print(
                "CODE:",
                result[
                    "next_evidence_code"
                ],
            )

            print(
                "SCORE:",
                result[
                    "question_score"
                ],
            )

        print()
        print(
            "POSITIVE:",
            result.get(
                "positive_evidence",
                [],
            ),
        )

        print(
            "NEGATED:",
            result.get(
                "negated_evidence",
                [],
            ),
        )

        if result.get(
            "predictions"
        ):

            print()
            print(
                "PREDICTIONS:"
            )

            for prediction in result[
                "predictions"
            ]:

                print(
                    prediction
                )

        print()
        print(
            "CURRENT QUESTION RANKING"
        )

        engine.debug_questions()

    # -------------------------------------------------------------------------
    # TEST 2
    # -------------------------------------------------------------------------

    print()
    print("#" * 80)
    print(
        "TEST 2 - NEGATION"
    )
    print("#" * 80)

    engine.reset()

    tests = [
        "I don't have fever.",
        "I have a cough.",
        "I do not have shortness of breath.",
    ]

    for text in tests:

        print()
        print(
            "USER:",
            text,
        )

        result = (
            engine.process(
                text
            )
        )

        print(
            "STATUS:",
            result.get(
                "status"
            ),
        )

        print(
            "MESSAGE:",
            result.get(
                "message"
            ),
        )

        print(
            "POSITIVE:",
            result.get(
                "positive_evidence",
                [],
            ),
        )

        print(
            "NEGATED:",
            result.get(
                "negated_evidence",
                [],
            ),
        )

    # -------------------------------------------------------------------------
    # TEST 3
    # -------------------------------------------------------------------------

    print()
    print("#" * 80)
    print(
        "TEST 3 - UNSUPPORTED"
    )
    print("#" * 80)

    engine.reset()

    tests = [
        "I don't feel well.",
        "I have a headache.",
        "I have cough.",
    ]

    for text in tests:

        print()
        print(
            "USER:",
            text,
        )

        result = (
            engine.process(
                text
            )
        )

        print(
            "STATUS:",
            result.get(
                "status"
            ),
        )

        print(
            "MESSAGE:",
            result.get(
                "message"
            ),
        )

        print(
            "POSITIVE:",
            result.get(
                "positive_evidence",
                [],
            ),
        )

        print(
            "NEGATED:",
            result.get(
                "negated_evidence",
                [],
            ),
        )

    # -------------------------------------------------------------------------
    # TEST 4
    # -------------------------------------------------------------------------

    print()
    print("#" * 80)
    print(
        "TEST 4 - COUGHING BLOOD"
    )
    print("#" * 80)

    engine.reset()

    tests = [
        "I have been coughing up blood.",
        "I also have fever.",
    ]

    for text in tests:

        print()
        print(
            "USER:",
            text,
        )

        result = (
            engine.process(
                text
            )
        )

        print(
            "STATUS:",
            result.get(
                "status"
            ),
        )

        print(
            "MESSAGE:",
            result.get(
                "message"
            ),
        )

        if result.get(
            "next_question"
        ):

            print(
                "NEXT QUESTION:",
                result[
                    "next_question"
                ],
            )

            print(
                "CODE:",
                result[
                    "next_evidence_code"
                ],
            )

        print(
            "POSITIVE:",
            result.get(
                "positive_evidence",
                [],
            ),
        )

        print(
            "NEGATED:",
            result.get(
                "negated_evidence",
                [],
            ),
        )

        print()
        print(
            "CURRENT QUESTION RANKING"
        )

        engine.debug_questions()

    # -------------------------------------------------------------------------
    # TEST 5
    # -------------------------------------------------------------------------

    print()
    print("#" * 80)
    print(
        "TEST 5 - MIXED NEGATION + YES/NO ANSWER"
    )
    print("#" * 80)

    engine.reset()

    tests = [
        "I don't have fever but I have a cough.",
    ]

    for text in tests:
        print()
        print("USER:", text)

        result = engine.process(text)

        print("STATUS:", result.get("status"))
        print("MESSAGE:", result.get("message"))
        print("POSITIVE:", result.get("positive_evidence", []))
        print("NEGATED:", result.get("negated_evidence", []))

    # Directly test the conversational binding:
    # if the engine asks about a code and the user replies "no", that code
    # must enter negated evidence rather than being reported as unsupported.
    engine.reset()

    first = engine.process("I feel short of breath.")

    print()
    print("USER:", "I feel short of breath.")
    print("STATUS:", first.get("status"))
    print("NEXT QUESTION:", first.get("next_question"))
    print("PENDING:", first.get("pending_question_code"))

    if first.get("next_question"):
        answer = engine.process("no")

        print()
        print("USER:", "no")
        print("STATUS:", answer.get("status"))
        print("POSITIVE:", answer.get("positive_evidence", []))
        print("NEGATED:", answer.get("negated_evidence", []))
        print("PENDING:", answer.get("pending_question_code"))

    print()
    print("=" * 80)
    print(
        "CONVERSATIONAL REGRESSION TEST COMPLETE"
    )
    print("=" * 80)


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":

    run_regression()