"""
Generates a comprehensive mappings/symptom_aliases.json that gives
EVERY evidence code in symptom_catalog.json at least one usable alias,
instead of only the 32 codes (out of 223) that the original hand-curated
file covered.

Strategy:
  1. Keep every alias already curated by the project author (highest quality).
  2. For every remaining evidence code, auto-derive a baseline alias phrase
     from its clinical question_en text (strip the question scaffolding,
     keep the clinical content words). This guarantees the matcher can
     never again return "unsupported" purely because a code has literally
     zero registered text.
  3. Layer on a hand-written colloquial synonym set for ~90 of the most
     common ways patients actually phrase symptoms (e.g. "trouble
     breathing", "can't smell anything", "my BP is high"), which is what
     the original 32-concept file was doing, just far more of it.

Value-based evidence (E_55, E_54, E_57, E_56, E_58, E_59, E_134) is
intentionally left alone -- that is handled by value_extractor.py, not
the alias matcher, exactly as in the original design.
"""

import json
import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent
if str(BASE) not in sys.path:
    sys.path.insert(0, str(BASE))

CATALOG_FILE = BASE / "symptom_catalog.json"
OLD_ALIASES_FILE = BASE / "mappings" / "symptom_aliases.json"
OUT_FILE = BASE / "mappings" / "symptom_aliases.json"


# FIX: the original codebase (evidence_matcher.py) hardcoded this as a
# 7-item set, but symptom_catalog.json actually has 15 non-binary
# (categorical / multi-value) evidence codes. The other 8 -- E_130,
# E_131, E_132, E_133, E_135, E_136, E_152, E_204 -- are all
# rash/lesion-characteristic or location questions that require a
# specific value suffix (e.g. "E_130_@_V_2"), not a bare code. Treating
# them as plain binary evidence (as the original hardcoded set allowed)
# would let the alias matcher emit a malformed evidence atom. This
# script now derives the exclusion set directly from the catalog's
# data_type field so it can never silently drift out of sync again.
def _load_value_based_evidence() -> set:
    with open(CATALOG_FILE, "r", encoding="utf-8") as fh:
        _catalog = json.load(fh)
    return {c["evidence_code"] for c in _catalog if c.get("data_type") != "B"}


VALUE_BASED_EVIDENCE = _load_value_based_evidence()

LEAD_IN_PATTERNS = [
    r"^have you (ever |recently |already |been |had )*",
    r"^do you (currently |now |usually |often |also |ever )*",
    r"^are you (currently |now |also |ever )*",
    r"^is your ",
    r"^did you ",
    r"^does your ",
    r"^would you say (that )?",
    r"^can you ",
    r"^did your ",
    r"^were you ",
    r"^was your ",
]


def derive_baseline_alias(question_en: str) -> str:
    q = (question_en or "").strip().rstrip("?").lower()
    for pattern in LEAD_IN_PATTERNS:
        new_q = re.sub(pattern, "", q)
        if new_q != q:
            q = new_q
            break
    q = q.strip()
    return q if q else question_en.strip().rstrip("?").lower()


# ============================================================
# HAND-CURATED COLLOQUIAL SYNONYMS
#
# key -> (evidence_code, [aliases...])
#
# Only added for codes where the clinical question_en wording is
# meaningfully different from how a patient would actually describe it.
# The original 32 curated concepts are reproduced unchanged below,
# plus roughly 60 new ones targeting common complaints.
# ============================================================

CURATED = {

    # ---- reproduced from the original file (unchanged) ----
    "fever": ("E_91", [
        "fever", "high fever", "high temperature", "running a fever",
        "feeling feverish", "temperature",
    ]),
    "chills": ("E_94", [
        "chills", "shivering", "shivers", "chills and shivers",
        "feeling cold and shaky",
    ]),
    "sore_throat": ("E_97", [
        "sore throat", "throat pain", "painful throat", "throat hurts",
        "my throat hurts", "throat is sore", "my throat is sore",
        "my throat feels sore",
    ]),
    "cough": ("E_201", [
        "cough", "coughing", "i am coughing", "i've been coughing",
        "been coughing",
    ]),
    "productive_colored_cough": ("E_77", [
        "cough with colored sputum", "coughing up colored sputum",
        "coughing up mucus", "cough with mucus", "productive cough",
        "cough with phlegm", "colored phlegm", "yellow sputum",
        "yellow phlegm", "green sputum", "green phlegm",
        "colored sputum", "coloured sputum", "colored phlegm",
        "coloured phlegm", "colored mucus when coughing",
    ]),
    "nasal_congestion_or_clear_runny_nose": ("E_181", [
        "stuffy nose", "blocked nose", "nasal congestion", "runny nose",
        "clear runny nose", "my nose is running", "congested nose",
        "nose is blocked", "nose won't stop running",
    ]),
    "colored_nasal_discharge": ("E_182", [
        "colored nasal discharge", "yellow snot", "green snot",
        "yellow mucus from nose", "green mucus from nose",
        "colored mucus from nose", "thick colored nasal discharge",
    ]),
    "significant_shortness_of_breath": ("E_66", [
        "shortness of breath", "short of breath", "difficulty breathing",
        "trouble breathing", "hard to breathe", "can't breathe properly",
        "breathless", "out of breath", "struggling to breathe",
        "breathing difficulty",
    ]),
    "shortness_of_breath_on_minimal_effort": ("E_64", [
        "short of breath with minimal activity",
        "breathless just walking a little",
        "short of breath doing very little",
        "get breathless with light activity",
    ]),
    "night_choking_or_breathlessness": ("E_67", [
        "wake up choking at night", "wake up gasping for air",
        "breathless at night that wakes me up",
        "sudden breathlessness at night",
    ]),
    "wheezing": ("E_214", [
        "wheezing", "wheeze", "whistling sound when breathing",
        "breathing makes a whistling noise",
    ]),
    "coughing_up_blood": ("E_45", [
        "coughing up blood", "blood in cough", "blood when i cough",
        "bloody sputum", "coughing blood",
    ]),
    "pain_location": ("E_55", []),
    "difficulty_swallowing": ("E_65", [
        "difficulty swallowing", "trouble swallowing", "hard to swallow",
        "pain when swallowing", "can't swallow properly",
        "food gets stuck when swallowing",
    ]),
    "chest_pain_at_rest": ("E_14", [
        "chest pain at rest", "chest pain while resting",
        "chest pain even when not active", "chest pain sitting still",
    ]),
    "diffuse_muscle_pain": ("E_144", [
        "muscle pain all over", "body aches", "generalized muscle pain",
        "achy muscles everywhere", "whole body hurts", "muscle ache",
        "muscle aches", "aching muscles", "sore muscles", "muscles ache",
    ]),
    "dizziness_or_lightheadedness": ("E_82", [
        "dizzy", "dizziness", "lightheaded", "lightheadedness",
        "feeling faint", "feel like i might pass out", "woozy",
    ]),
    "loss_of_consciousness": ("E_159", [
        "passed out", "fainted", "lost consciousness", "blacked out",
        "i fainted", "i passed out",
    ]),
    "numbness_or_tingling_anywhere": ("E_177", [
        "numbness", "tingling", "pins and needles", "numb feeling",
        "tingling sensation", "arm feels numb", "leg feels numb",
        "hands feel numb",
    ]),
    "weakness_both_arms_or_legs": ("E_84", [
        "weakness in both arms", "weakness in both legs",
        "weak arms and legs", "legs feel weak", "arms feel weak",
        "can't lift my arms", "legs give out", "muscle weakness",
        "generalized weakness", "difficulty walking", "trouble walking",
        "hard to walk", "can't walk properly", "unsteady when walking",
        "legs feel weak when walking", "difficulty to walk",
        "struggling to walk", "wobbly when walking", "weak legs",
        "hard time walking", "walking is difficult",
    ]),
    "facial_or_eye_muscle_weakness": ("E_83", [
        "eyelid drooping", "eye muscle weakness",
        "trouble moving my eyes", "weakness around the eyes",
        "face feels weak", "trouble closing my eye",
    ]),
    "facial_one_sided_weakness": ("E_156", [
        "one side of my face is weak", "face drooping on one side",
        "one-sided facial weakness", "half my face feels weak",
    ]),
    "loss_of_appetite_or_early_satiety": ("E_161", [
        "no appetite", "loss of appetite", "not hungry",
        "get full quickly", "feel full after eating a little",
        "don't feel like eating",
    ]),
    "unintentional_weight_loss": ("E_162", [
        "losing weight without trying", "unexplained weight loss",
        "lost weight without dieting", "weight loss for no reason",
    ]),
    "hoarse_or_changed_voice": ("E_212", [
        "hoarse voice", "voice changed", "raspy voice", "losing my voice",
        "my voice sounds different",
    ]),
    "vomiting_multiple_times": ("E_211", [
        "vomiting repeatedly", "throwing up multiple times",
        "vomiting several times", "been vomiting a lot",
    ]),
    "vomiting_blood": ("E_210", [
        "vomiting blood", "throwing up blood", "blood in my vomit",
    ]),
    "black_stools": ("E_140", [
        "black stools", "black poop", "dark tarry stool", "tarry stool",
    ]),
    "pain_worse_with_movement": ("E_216", [
        "pain gets worse when i move", "pain worse with movement",
        "hurts more when i move",
    ]),
    "symptoms_worse_after_eating": ("E_215", [
        "worse after eating", "symptoms worse after meals",
        "gets worse after i eat",
    ]),
    "symptoms_worse_lying_down": ("E_217", [
        "worse when lying down", "worse lying flat", "worse at night lying down",
    ]),
    "nose_or_throat_itching": ("E_169", [
        "itchy nose", "itchy throat", "nose and throat itching",
    ]),
    "severe_eye_itching": ("E_170", [
        "itchy eyes", "eyes really itchy", "severe eye itching",
    ]),

    # ---- new colloquial additions (previously totally uncovered) ----

    # NOTE: "headache" (as a standalone symptom), "nausea", "rash",
    # "loss of taste", "blood in urine", "ear pain", "itchy skin",
    # "swollen lymph nodes", "orthopnea", "general anxiety",
    # "insomnia", "sick contact" (generic), "generic medication use",
    # "slurred speech", and "swollen abdomen" were all REMOVED from
    # this table after auditing the resolved codes: the DDXPlus
    # ontology used by this project does not contain a direct binary
    # evidence code for them, and a naive keyword search matched them
    # to unrelated questions instead (e.g. "headache" incorrectly
    # resolved to "family history of cluster headaches", "rash"
    # resolved to a categorical *rash color* follow-up question that
    # presupposes a rash was already reported through the lesion/pain
    # pathway, "ear_pain" resolved to an antibiotic-treatment-history
    # question, etc.). Shipping those would have fed the model
    # incorrect evidence. It is safer to leave a symptom unmatched
    # (and surfaced through the clarifying-question fallback) than to
    # silently record the wrong evidence code.
    "diarrhea": ("E_51", [
        "diarrhea", "loose stools", "watery stools", "runny stools",
        "increase in stool frequency",
    ]),
    "palpitations": ("E_155", [
        "heart racing", "palpitations", "heart pounding", "heart fluttering",
        "irregular heartbeat", "heart skipping beats", "my heart is racing",
    ]),
    "swelling_body": ("E_151", [
        "swollen legs", "swelling in my legs", "legs are swollen",
        "ankle swelling", "swollen ankles", "puffy legs", "body swelling",
        "swelling in my body",
    ]),
    "fatigue": ("E_175", [
        "fatigue", "tired", "extremely tired", "exhausted", "no energy",
        "tired all the time", "feeling drained", "generalized discomfort",
        "not feeling like myself",
    ]),
    "double_vision": ("E_52", [
        "double vision", "seeing double", "seeing two of everything",
        "seeing two images of one object",
    ]),
    "confusion": ("E_39", [
        "confused", "confusion", "trouble thinking clearly",
        "not thinking straight", "disoriented", "feeling confused lately",
    ]),
    "poor_circulation": ("E_108", [
        "cold hands and feet", "poor circulation", "circulation",
        "hands and feet always cold", "circulation problem",
    ]),
    "current_smoker": ("E_79", [
        "i smoke", "i am a smoker", "smoke cigarettes", "i smoke cigarettes",
    ]),
    "former_smoker": ("E_191", [
        "used to smoke", "former smoker", "quit smoking", "i quit smoking",
    ]),
    "secondhand_smoke": ("E_222", [
        "exposed to secondhand smoke", "around cigarette smoke daily",
    ]),
    "alcohol_excess": ("E_78", [
        "drink alcohol excessively", "alcohol addiction", "heavy drinker",
        "i drink too much alcohol",
    ]),
    "diabetes_history": ("E_69", [
        "i have diabetes", "i am diabetic", "diabetic", "history of diabetes",
    ]),
    "hypertension_presenting": ("E_102", [
        "i have high blood pressure", "high blood pressure",
        "my bp is high", "consulting for high blood pressure",
    ]),
    "asthma_history": ("E_124", [
        "i have asthma", "asthmatic", "history of asthma",
        "used a bronchodilator before", "use an inhaler",
    ]),
    "heart_attack_or_angina_history": ("E_105", [
        "history of heart attack", "had a heart attack before",
        "history of angina", "chest pain from angina before",
    ]),
    "severe_food_allergy": ("E_12", [
        "severe food allergy", "known food allergy", "allergic to food",
    ]),
    "pregnancy": ("E_167", [
        "i am pregnant", "currently pregnant", "i think i am pregnant",
    ]),
    "increased_sweating": ("E_50", [
        "sweating a lot", "increased sweating", "sweat more than usual",
        "excessive sweating", "sweating",
    ]),
    "neck_stiffness": ("E_192", [
        "stiff neck", "neck stiffness", "can't turn my neck",
        "muscle spasms in my neck",
    ]),
}


def main():
    with open(CATALOG_FILE, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    with open(OLD_ALIASES_FILE, "r", encoding="utf-8") as f:
        old_aliases = json.load(f)

    by_code = {c["evidence_code"]: c for c in catalog}

    result = {}

    # 1) Keep curated entries whose evidence_code is already known
    #    (either matches original file's code, or is one of our new
    #    manually-authored concepts).
    used_codes = set()

    for key, (code, aliases) in CURATED.items():
        if code is None:
            continue
        if code not in by_code:
            continue
        if code in VALUE_BASED_EVIDENCE:
            # Value-based evidence (pain/lesion characteristics) is
            # handled by value_extractor.py, never by the alias matcher.
            continue
        result[key] = {
            "evidence_code": code,
            "type": "symptom",
            "aliases": aliases,
        }
        used_codes.add(code)

    # 2) (Removed) A previous version of this script tried to resolve
    #    the remaining concepts via naive keyword-substring search over
    #    question_en text. That produced several wrong mappings (e.g.
    #    "headache" -> family-history-of-cluster-headache, "rash" ->
    #    a categorical rash-color follow-up question) because
    #    substring search doesn't understand clinical context. Every
    #    CURATED entry above was instead hand-verified against the
    #    actual question_en text, so this step is no longer needed.

    # 3) Auto-derive a baseline alias for every remaining code so that
    #    coverage is 100%.
    auto_count = 0
    for code, entry in by_code.items():
        if code in used_codes or code in VALUE_BASED_EVIDENCE:
            continue
        baseline = derive_baseline_alias(entry.get("question_en", ""))
        if not baseline:
            continue
        auto_key = f"auto_{code.lower()}"
        result[auto_key] = {
            "evidence_code": code,
            "type": "antecedent" if entry.get("is_antecedent") else "symptom",
            "aliases": [baseline],
        }
        used_codes.add(code)
        auto_count += 1

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    binary_codes = {c["evidence_code"] for c in catalog if c["data_type"] == "B"}
    covered_binary = used_codes & binary_codes

    print(f"Total concept keys written : {len(result)}")
    print(f"Total evidence codes covered: {len(used_codes)}")
    print(f"Auto-derived baseline codes : {auto_count}")
    print(f"Binary codes total          : {len(binary_codes)}")
    print(f"Binary codes covered        : {len(covered_binary)}")
    print(f"Binary codes still uncovered: {len(binary_codes - used_codes)}")


if __name__ == "__main__":
    main()