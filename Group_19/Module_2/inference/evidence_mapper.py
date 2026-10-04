from __future__ import annotations

import json
from pathlib import Path
from typing import Optional


BASE = Path(__file__).resolve().parent.parent
ONTOLOGY_FILE = BASE / "release_evidences.json"


class EvidenceMapper:
    """
    DDXPlus evidence ontology helper.

    Converts human-readable evidence descriptions / values
    into valid DDXPlus evidence atoms.

    Examples:
        E_91
        E_55_@_V_194
        E_56_@_7
    """

    def __init__(self, ontology_path: Path = ONTOLOGY_FILE):

        if not ontology_path.exists():
            raise FileNotFoundError(
                f"Ontology not found:\n{ontology_path}"
            )

        with open(
            ontology_path,
            "r",
            encoding="utf-8",
        ) as f:
            self.ontology = json.load(f)

        self.binary = {}
        self.categorical = {}
        self.all_codes = set()

        self._build_index()

    # ========================================================
    # BUILD INDEX
    # ========================================================

    def _build_index(self):

        for code, info in self.ontology.items():

            self.all_codes.add(code)

            evidence_type = info.get(
                "data_type"
            )

            possible_values = [
                str(v)
                for v in info.get(
                    "possible-values",
                    []
                )
            ]

            entry = {
                "code": code,
                "name": info.get("name"),
                "question_en": info.get(
                    "question_en"
                ),
                "question_fr": info.get(
                    "question_fr"
                ),
                "code_question": info.get(
                    "code_question"
                ),
                "data_type": evidence_type,
                "possible_values": possible_values,
                "value_meaning": info.get(
                    "value_meaning",
                    {}
                ),
                "is_antecedent": info.get(
                    "is_antecedent",
                    False
                ),
            }

            if evidence_type == "B":

                self.binary[code] = entry

            else:

                self.categorical[code] = entry

    # ========================================================
    # BASIC LOOKUPS
    # ========================================================

    def get(self, code: str) -> Optional[dict]:

        return self.ontology.get(code)

    def exists(self, code: str) -> bool:

        return code in self.ontology

    def describe(self, code: str):

        if code not in self.ontology:
            raise ValueError(
                f"Unknown evidence code: {code}"
            )

        info = self.ontology[code]

        print()
        print("=" * 70)
        print(f"EVIDENCE: {code}")
        print("=" * 70)

        print(
            f"Name       : {info.get('name')}"
        )

        print(
            f"Type       : {info.get('data_type')}"
        )

        print(
            f"Question   : "
            f"{info.get('question_en')}"
        )

        values = info.get(
            "possible-values",
            []
        )

        if values:

            print(
                f"Values     : {values}"
            )

        meanings = info.get(
            "value_meaning",
            {}
        )

        if meanings:

            print(
                "Value meanings:"
            )

            for key, value in meanings.items():

                print(
                    f"  {key} → {value}"
                )

    # ========================================================
    # CREATE EVIDENCE ATOM
    # ========================================================

    def make_atom(
        self,
        code: str,
        value=None,
    ) -> str:

        if code not in self.ontology:

            raise ValueError(
                f"Unknown evidence code: {code}"
            )

        info = self.ontology[code]

        data_type = info.get(
            "data_type"
        )

        possible_values = [
            str(v)
            for v in info.get(
                "possible-values",
                []
            )
        ]

        # ----------------------------------------------------
        # Binary evidence
        # ----------------------------------------------------

        if data_type == "B":

            if value is not None:

                raise ValueError(
                    f"{code} is binary. "
                    f"It must not have a value."
                )

            return code

        # ----------------------------------------------------
        # Categorical / multi-valued
        # ----------------------------------------------------

        if value is None:

            raise ValueError(
                f"{code} requires a value."
            )

        value = str(value)

        if (
            possible_values
            and value not in possible_values
        ):

            raise ValueError(
                f"Invalid value '{value}' "
                f"for {code}.\n"
                f"Allowed values: "
                f"{possible_values}"
            )

        return f"{code}_@_{value}"

    # ========================================================
    # SEARCH ONTOLOGY
    # ========================================================

    def search(
        self,
        text: str,
    ):

        text = text.lower().strip()

        results = []

        for code, info in self.ontology.items():

            searchable = " ".join(
                [
                    str(info.get("name", "")),
                    str(
                        info.get(
                            "question_en",
                            ""
                        )
                    ),
                    str(
                        info.get(
                            "code_question",
                            ""
                        )
                    ),
                ]
            ).lower()

            if text in searchable:

                results.append(
                    {
                        "code": code,
                        "name": info.get(
                            "name"
                        ),
                        "question_en": info.get(
                            "question_en"
                        ),
                        "data_type": info.get(
                            "data_type"
                        ),
                        "possible_values": [
                            str(v)
                            for v in info.get(
                                "possible-values",
                                []
                            )
                        ],
                    }
                )

        return results

    # ========================================================
    # PRINT SUMMARY
    # ========================================================

    def summary(self):

        print("=" * 70)
        print("DDXPLUS EVIDENCE ONTOLOGY")
        print("=" * 70)

        print(
            f"Total evidence codes : "
            f"{len(self.all_codes)}"
        )

        print(
            f"Binary evidence      : "
            f"{len(self.binary)}"
        )

        print(
            f"Value-based evidence : "
            f"{len(self.categorical)}"
        )

        print("=" * 70)


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    mapper = EvidenceMapper()

    mapper.summary()

    # --------------------------------------------------------
    # Search examples
    # --------------------------------------------------------

    print()
    print("=" * 70)
    print("SEARCH: fever")
    print("=" * 70)

    results = mapper.search("fever")

    for item in results[:10]:

        print(
            f"{item['code']:8s} | "
            f"{item['name']} | "
            f"{item['question_en']}"
        )

    # --------------------------------------------------------
    # Direct evidence examples
    # --------------------------------------------------------

    print()
    print("=" * 70)
    print("DIRECT ATOM TESTS")
    print("=" * 70)

    # These are examples only.
    # We don't assume every human symptom has a direct
    # one-to-one mapping yet.

    for code in ["E_91", "E_66", "E_77"]:

        if mapper.exists(code):

            print(
                f"{code} → "
                f"{mapper.ontology[code].get('question_en')}"
            )

    # --------------------------------------------------------
    # Interactive search
    # --------------------------------------------------------

    print()
    print("=" * 70)
    print("INTERACTIVE SEARCH")
    print("Type a symptom/concept, or 'quit'.")
    print("=" * 70)

    while True:

        query = input(
            "\nSearch: "
        ).strip()

        if query.lower() in {
            "quit",
            "exit",
            "q",
        }:

            break

        results = mapper.search(
            query
        )

        if not results:

            print(
                "No matching DDXPlus evidence found."
            )

            continue

        for item in results:

            print()
            print(
                f"Code       : {item['code']}"
            )

            print(
                f"Name       : {item['name']}"
            )

            print(
                f"Question   : "
                f"{item['question_en']}"
            )

            print(
                f"Type       : "
                f"{item['data_type']}"
            )

            if item["possible_values"]:

                print(
                    f"Values     : "
                    f"{item['possible_values']}"
                )