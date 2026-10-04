from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Optional


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


# ============================================================
# VALUE EXTRACTOR
# ============================================================

class ValueExtractor:

    PAIN_LOCATION_EVIDENCE = "E_55"
    PAIN_ONSET_EVIDENCE = "E_59"
    PAIN_INTENSITY_EVIDENCE = "E_56"
    PAIN_PRECISION_EVIDENCE = "E_58"

    def __init__(
        self,
        catalog_file: Path = CATALOG_FILE,
    ):

        self.catalog_file = Path(catalog_file)

        if not self.catalog_file.exists():
            raise FileNotFoundError(
                f"Symptom catalog not found:\n"
                f"{self.catalog_file}"
            )

        with open(
            self.catalog_file,
            "r",
            encoding="utf-8",
        ) as f:
            self.catalog = json.load(f)

        self.evidence_by_code = {
            item["evidence_code"]: item
            for item in self.catalog
        }

        self.location_values = (
            self._build_location_index()
        )

    # ========================================================
    # NORMALIZATION
    # ========================================================

    @staticmethod
    def normalize(text: str) -> str:

        text = text.lower()

        text = (
            text
            .replace("’", "'")
            .replace("`", "'")
        )

        text = text.replace("-", " ")

        text = re.sub(
            r"[^a-z0-9\s']",
            " ",
            text,
        )

        text = re.sub(
            r"\s+",
            " ",
            text,
        )

        return text.strip()

    # ========================================================
    # BUILD LOCATION INDEX
    # ========================================================

    def _build_location_index(self):

        item = self.evidence_by_code.get(
            self.PAIN_LOCATION_EVIDENCE
        )

        if not item:
            return []

        results = []

        for value in item.get(
            "possible_values",
            [],
        ):

            meaning = value.get(
                "meaning"
            )

            if not meaning:
                continue

            english = meaning.get(
                "en"
            )

            if not english:
                continue

            normalized = self.normalize(
                english
            )

            if not normalized:
                continue

            aliases = self._generate_location_aliases(
                english
            )

            results.append(
                {
                    "value": value["value"],
                    "meaning": english,
                    "atom": value["atom"],
                    "aliases": aliases,
                }
            )

        # ----------------------------------------------------
        # FIX: a handful of very common, genuinely ambiguous body
        # regions have no single matching catalog value -- only
        # specific sub-regions do (e.g. "upper chest"/"lower chest"
        # instead of plain "chest", "lumbar spine" instead of plain
        # "back", "thigh" instead of plain "leg", "forearm" instead of
        # plain "arm"). Rather than fail outright on the single most
        # common way people phrase these complaints, each is mapped
        # to the closest reasonable clinical default. This is a
        # deliberate, documented simplification: it may not be the
        # exact sub-region the user meant (that's inherent -- "leg
        # pain" alone genuinely doesn't say where on the leg), which
        # is still strictly better than recording nothing at all. For
        # locations with separate left/right entries, the alias is
        # added to both; the existing (R)-before-(L) tie-break in
        # `extract_pain_location` resolves it consistently.
        # ----------------------------------------------------

        DEFAULT_REGION_ALIASES = {
            "upper chest": ["chest"],
            "belly": ["abdomen", "stomach", "tummy"],
            "lumbar spine": ["back", "lower back", "back pain"],
            "thoracic spine": ["upper back", "mid back"],
            "thigh": ["leg", "upper leg"],
            "forearm": ["arm"],
            "dorsal aspect of the foot": ["foot"],
            "dorsal aspect of the wrist": ["wrist"],
            "dorsal aspect of the hand": ["hand"],
            "side of the neck": ["neck"],
            "big toe": ["toe"],
            "finger (index)": ["finger"],
        }

        for entry in results:
            base_meaning = (
                entry["meaning"]
                .replace("(R)", "")
                .replace("(L)", "")
                .strip()
            )

            extra = DEFAULT_REGION_ALIASES.get(base_meaning)

            if extra:
                entry["aliases"] = list(
                    dict.fromkeys(entry["aliases"] + extra)
                )

        return results

    # ========================================================
    # GENERATE NATURAL LOCATION ALIASES
    # ========================================================

    def _generate_location_aliases(
        self,
        meaning: str,
    ) -> list[str]:

        normalized = self.normalize(
            meaning
        )

        aliases = {
            normalized
        }

        # ----------------------------------------------------
        # Right / Left conversion
        #
        # biceps(R)
        # -> right biceps
        #
        # biceps(L)
        # -> left biceps
        # ----------------------------------------------------

        if "(r)" in meaning.lower():

            base = re.sub(
                r"\s*\(r\)",
                "",
                meaning,
                flags=re.IGNORECASE,
            ).strip()

            base = self.normalize(
                base
            )

            if base:
                aliases.add(
                    f"right {base}"
                )

                # ----------------------------------------------------
                # FIX: previously this method NEVER produced a plain,
                # non-lateral alias (e.g. just "knee") for any body
                # part that has a left/right pair -- only "right
                # knee" / "left knee" / "knee r" / "knee l". Since
                # most people just say "my knee hurts" without
                # specifying a side, every single one of the ~63
                # laterally-paired locations in this ontology (knee,
                # shoulder, ankle, forearm, biceps, hip, groin,
                # axilla, tonsil, and more) was completely unmatchable
                # through plain, natural phrasing.
                #
                # The base name is added as a plain alias to BOTH the
                # (R) and (L) entries. When the user doesn't specify a
                # side, both will match with an equal-length matched
                # phrase, and `extract_pain_location`'s tie-break
                # (first occurrence wins) deterministically resolves
                # to the (R) entry, since (R) always precedes (L) in
                # the catalog for every pair. This is a reasonable
                # default given the alternative (no match at all) --
                # it is documented here as a known simplification: the
                # side recorded may not match what the user actually
                # meant, since plain phrasing genuinely doesn't
                # specify one.
                # ----------------------------------------------------

                aliases.add(base)

        if "(l)" in meaning.lower():

            base = re.sub(
                r"\s*\(l\)",
                "",
                meaning,
                flags=re.IGNORECASE,
            ).strip()

            base = self.normalize(
                base
            )

            if base:
                aliases.add(
                    f"left {base}"
                )

                aliases.add(base)

        # ----------------------------------------------------
        # Common anatomical phrasing
        # ----------------------------------------------------

        replacements = {
            "biceps": [
                "biceps muscle"
            ],

            "forearm": [
                "forearm",
                "forearm muscle"
            ],

            "thigh": [
                "thigh",
                "upper leg"
            ],

            "hip": [
                "hip"
            ],

            "knee": [
                "knee"
            ],

            "ankle": [
                "ankle"
            ],

            "shoulder": [
                "shoulder"
            ]
        }

        for word, variants in replacements.items():

            if word in normalized:

                for variant in variants:

                    if "(r)" in meaning.lower():

                        aliases.add(
                            f"right {variant}"
                        )

                    elif "(l)" in meaning.lower():

                        aliases.add(
                            f"left {variant}"
                        )

        return list(aliases)

    # ========================================================
    # PHRASE MATCH
    # ========================================================

    @staticmethod
    def _contains_phrase(
        text: str,
        phrase: str,
    ) -> bool:

        pattern = (
            r"(?<!\w)"
            + re.escape(phrase)
            + r"(?!\w)"
        )

        return re.search(
            pattern,
            text,
        ) is not None

    # ========================================================
    # PAIN CONTEXT
    # ========================================================

    def _has_pain_context(
        self,
        text: str,
    ) -> bool:

        pain_terms = [
            "pain",
            "ache",
            "aching",
            "hurt",
            "hurts",
            "painful",
        ]

        return any(
            self._contains_phrase(
                text,
                term,
            )
            for term in pain_terms
        )

    # ========================================================
    # PAIN LOCATION
    # ========================================================

    def extract_pain_location(
        self,
        text: str,
    ) -> Optional[dict[str, Any]]:

        normalized = self.normalize(
            text
        )

        if not self._has_pain_context(
            normalized
        ):
            return None

        matches = []

        for location in self.location_values:

            for alias in location["aliases"]:

                if self._contains_phrase(
                    normalized,
                    alias,
                ):

                    matches.append(
                        {
                            **location,
                            "matched_text": alias,
                        }
                    )

        if not matches:
            return None

        best = max(
            matches,
            key=lambda x: len(
                x["matched_text"]
            ),
        )

        return {
            "evidence_code": (
                self.PAIN_LOCATION_EVIDENCE
            ),
            "value": best["value"],
            "meaning": best["meaning"],
            "atom": best["atom"],
            "match_type": "ontology_location",
            "matched_text": best[
                "matched_text"
            ],
        }

    # ========================================================
    # EXTRACT EXPLICIT 0-10
    # ========================================================

    @staticmethod
    def _extract_explicit_0_10(
        text: str,
    ) -> Optional[int]:

        patterns = [

            r"\b(10|[0-9])\s*/\s*10\b",

            r"\b(10|[0-9])\s+out\s+of\s+10\b",

            r"\b(10|[0-9])\s+on\s+a\s+scale\s+of\s+10\b",
        ]

        for pattern in patterns:

            match = re.search(
                pattern,
                text,
            )

            if match:

                value = int(
                    match.group(1)
                )

                if 0 <= value <= 10:
                    return value

        return None

    # ========================================================
    # PAIN INTENSITY
    # ========================================================

    def extract_pain_intensity(
        self,
        text: str,
    ) -> Optional[dict[str, Any]]:

        normalized = self.normalize(
            text
        )

        if not self._has_pain_context(
            normalized
        ):
            return None

        # IMPORTANT:
        #
        # Only match phrases that explicitly
        # identify INTENSITY.
        #
        # We do NOT allow:
        #
        # "pain location is 6"
        #
        # to become intensity.

        patterns = [

            r"\bpain\s+intensity\s+"
            r"(?:is|at|of)\s+"
            r"(10|[0-9])"
            r"(?:\s*/\s*10)?\b",

            r"\bintensity\s+of\s+the\s+pain\s+"
            r"(?:is|at|of)\s+"
            r"(10|[0-9])"
            r"(?:\s*/\s*10)?\b",

            r"\bpain\s+level\s+"
            r"(?:is|at|of)\s+"
            r"(10|[0-9])"
            r"(?:\s*/\s*10)?\b",

            r"\bpain\s+is\s+"
            r"(10|[0-9])"
            r"\s*(?:/10|out\s+of\s+10)\b",
        ]

        for pattern in patterns:

            match = re.search(
                pattern,
                normalized,
            )

            if match:

                value = int(
                    match.group(1)
                )

                return {
                    "evidence_code": (
                        self.PAIN_INTENSITY_EVIDENCE
                    ),
                    "value": str(value),
                    "atom": (
                        f"{self.PAIN_INTENSITY_EVIDENCE}"
                        f"_@_{value}"
                    ),
                    "match_type": (
                        "explicit_numeric"
                    ),
                }

        return None

    # ========================================================
    # PAIN ONSET
    # ========================================================

    def extract_pain_onset(
        self,
        text: str,
    ) -> Optional[dict[str, Any]]:

        normalized = self.normalize(
            text
        )

        if not self._has_pain_context(
            normalized
        ):
            return None

        patterns = [

            r"\bpain\s+onset\s+"
            r"(?:is|at|of)\s+"
            r"(10|[0-9])"
            r"(?:\s*/\s*10)?\b",

            r"\bpain\s+appeared\s+"
            r"(?:at|with)\s+"
            r"(10|[0-9])"
            r"(?:\s*/\s*10)?\b",

            r"\bpain\s+started\s+"
            r"(?:at|with)\s+"
            r"(10|[0-9])"
            r"(?:\s*/\s*10)?\b",
        ]

        for pattern in patterns:

            match = re.search(
                pattern,
                normalized,
            )

            if match:

                value = int(
                    match.group(1)
                )

                return {
                    "evidence_code": (
                        self.PAIN_ONSET_EVIDENCE
                    ),
                    "value": str(value),
                    "atom": (
                        f"{self.PAIN_ONSET_EVIDENCE}"
                        f"_@_{value}"
                    ),
                    "match_type": (
                        "explicit_numeric"
                    ),
                }

        return None

    # ========================================================
    # PAIN LOCALIZATION PRECISION
    # ========================================================

    def extract_pain_precision(
        self,
        text: str,
    ) -> Optional[dict[str, Any]]:

        normalized = self.normalize(
            text
        )

        if not self._has_pain_context(
            normalized
        ):
            return None

        patterns = [

            r"\bpain\s+locali[sz]ation\s+"
            r"(?:is|at|of)\s+"
            r"(10|[0-9])"
            r"(?:\s*/\s*10)?\b",

            r"\bpain\s+location\s+"
            r"(?:is|at|of)\s+"
            r"(10|[0-9])"
            r"(?:\s*/\s*10)?\b",

            r"\blocali[sz]ation\s+precision\s+"
            r"(?:is|at|of)\s+"
            r"(10|[0-9])"
            r"(?:\s*/\s*10)?\b",
        ]

        for pattern in patterns:

            match = re.search(
                pattern,
                normalized,
            )

            if match:

                value = int(
                    match.group(1)
                )

                return {
                    "evidence_code": (
                        self.PAIN_PRECISION_EVIDENCE
                    ),
                    "value": str(value),
                    "atom": (
                        f"{self.PAIN_PRECISION_EVIDENCE}"
                        f"_@_{value}"
                    ),
                    "match_type": (
                        "explicit_numeric"
                    ),
                }

        return None

    # ========================================================
    # EXTRACT EVERYTHING
    # ========================================================

    def extract(
        self,
        text: str,
    ) -> list[dict[str, Any]]:

        if not isinstance(
            text,
            str,
        ):
            raise TypeError(
                "text must be a string."
            )

        results = []

        location = (
            self.extract_pain_location(
                text
            )
        )

        if location:
            results.append(
                location
            )

        intensity = (
            self.extract_pain_intensity(
                text
            )
        )

        if intensity:
            results.append(
                intensity
            )

        onset = (
            self.extract_pain_onset(
                text
            )
        )

        if onset:
            results.append(
                onset
            )

        precision = (
            self.extract_pain_precision(
                text
            )
        )

        if precision:
            results.append(
                precision
            )

        return results

    # ========================================================
    # EXPLAIN
    # ========================================================

    def explain(
        self,
        text: str,
    ):

        print()
        print("=" * 80)
        print("DDXPLUS VALUE EXTRACTION")
        print("=" * 80)

        print(
            f"Input:\n{text}"
        )

        results = self.extract(
            text
        )

        print()

        if not results:

            print(
                "No value-based evidence detected."
            )

            return results

        print(
            f"Detected values: "
            f"{len(results)}"
        )

        print()

        for item in results:

            print(
                f"✓ Evidence : "
                f"{item['evidence_code']}"
            )

            if "meaning" in item:

                print(
                    f"  Meaning  : "
                    f"{item['meaning']}"
                )

            print(
                f"  Value    : "
                f"{item['value']}"
            )

            print(
                f"  Atom     : "
                f"{item['atom']}"
            )

            if "matched_text" in item:

                print(
                    f"  Matched  : "
                    f"{item['matched_text']}"
                )

            print(
                f"  Match    : "
                f"{item['match_type']}"
            )

            print()

        return results


# ============================================================
# TESTS
# ============================================================

def run_tests():

    extractor = ValueExtractor()

    test_cases = [

        "I have pain in my forehead.",

        "I have pain in my lower chest.",

        "I have pain in my right biceps.",

        "I have pain in my left biceps.",

        "I have pain in my right knee.",

        "My neck hurts.",

        "My pain is 8 out of 10.",

        "The pain intensity is 6/10.",

        "My pain level is 9 out of 10.",

        "My pain onset is 7/10.",

        "The pain appeared at 8/10.",

        "Pain localization is 8/10.",

        "Pain location is 6 out of 10.",

        "My forehead is itchy.",

        "I have severe pain in my chest.",

        "I have sudden pain in my abdomen.",
    ]

    print()
    print("=" * 80)
    print("MEDI TWIN - VALUE EXTRACTOR TEST")
    print("=" * 80)

    for number, text in enumerate(
        test_cases,
        start=1,
    ):

        print()
        print("-" * 80)
        print(
            f"TEST CASE {number}"
        )
        print("-" * 80)

        extractor.explain(
            text
        )


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    run_tests()