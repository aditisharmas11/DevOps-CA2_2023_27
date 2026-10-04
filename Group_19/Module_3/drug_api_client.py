"""
MediTwin — Module 3 — Drug information client

Wraps two free, no-key-required public APIs:

  1. RxNorm (NLM)        -> normalizes a drug name to its standardized
                             RxCUI concept, confirming it's a real,
                             recognized medication name.
  2. openFDA Drug Label   -> pulls manufacturer-submitted label sections
                             (indications, warnings, contraindications)
                             for a drug name, when available.

Design goals, per project requirements:
  - Never crash the app if a network call fails or times out.
  - Always tell the caller (and eventually the report) whether the
    information came from a live API or was unavailable, so the
    report never silently presents missing data as if it were found.
  - Cache successful lookups to disk so repeated runs / repeated drug
    names across a report don't repeatedly hit the network.
"""

from __future__ import annotations

import json
import time
import urllib.request
import urllib.parse
import urllib.error
from typing import Optional

import config


# ============================================================
# CACHE
# ============================================================

def _load_cache() -> dict:
    if config.DRUG_CACHE_FILE.exists():
        try:
            with open(config.DRUG_CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def _save_cache(cache: dict) -> None:
    try:
        with open(config.DRUG_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2)
    except OSError:
        # Cache is a convenience, not a requirement -- never fail the
        # app because the cache couldn't be written.
        pass


_CACHE = _load_cache()


# ============================================================
# LOW-LEVEL HTTP HELPER
# ============================================================

def _http_get_json(url: str) -> Optional[dict]:
    """
    GET a URL and parse JSON. Returns None (never raises) on any
    network error, timeout, non-200 response, or malformed JSON.
    """

    if config.OFFLINE_MODE:
        return None

    attempts = 0
    last_error = None

    while attempts <= config.API_MAX_RETRIES:
        attempts += 1
        try:
            request = urllib.request.Request(
                url,
                headers={"User-Agent": "MediTwin-Module3/1.0 (academic project)"},
            )
            with urllib.request.urlopen(
                request, timeout=config.API_TIMEOUT_SECONDS
            ) as response:
                if response.status != 200:
                    last_error = f"HTTP {response.status}"
                    continue
                body = response.read()
                return json.loads(body)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
            last_error = str(exc)
            time.sleep(0.2)
            continue

    # All attempts failed -- caller treats None as "unavailable".
    return None


# ============================================================
# RXNORM
# ============================================================

def lookup_rxnorm(drug_name: str) -> dict:
    """
    Normalize a drug name via RxNorm's approximate-match endpoint.

    Returns a dict:
        {
            "source": "rxnorm",
            "status": "found" | "not_found" | "unavailable",
            "query": drug_name,
            "rxcui": str | None,
            "normalized_name": str | None,
        }
    """

    cache_key = f"rxnorm::{drug_name.strip().lower()}"
    if cache_key in _CACHE:
        return _CACHE[cache_key]

    encoded = urllib.parse.quote(drug_name)
    url = f"{config.RXNORM_BASE_URL}/approximateTerm.json?term={encoded}&maxEntries=1"

    data = _http_get_json(url)

    if data is None:
        result = {
            "source": "rxnorm",
            "status": "unavailable",
            "query": drug_name,
            "rxcui": None,
            "normalized_name": None,
        }
        # Don't cache network failures -- retry next run.
        return result

    candidates = (
        data.get("approximateGroup", {}).get("candidate", [])
        if isinstance(data, dict)
        else []
    )

    if not candidates:
        result = {
            "source": "rxnorm",
            "status": "not_found",
            "query": drug_name,
            "rxcui": None,
            "normalized_name": None,
        }
    else:
        top = candidates[0]
        result = {
            "source": "rxnorm",
            "status": "found",
            "query": drug_name,
            "rxcui": top.get("rxcui"),
            "normalized_name": top.get("name") or drug_name,
        }

    _CACHE[cache_key] = result
    _save_cache(_CACHE)
    return result


# ============================================================
# OPENFDA DRUG LABEL
# ============================================================

_LABEL_FIELDS = [
    "indications_and_usage",
    "warnings",
    "contraindications",
    "warnings_and_cautions",
    "boxed_warning",
]


def lookup_openfda_label(drug_name: str) -> dict:
    """
    Fetch label sections for a drug from openFDA.

    Returns a dict:
        {
            "source": "openfda",
            "status": "found" | "not_found" | "unavailable",
            "query": drug_name,
            "brand_name": str | None,
            "sections": {field: [text, ...]} for whichever fields
                        the label actually included,
        }

    Text is truncated to a reasonable length per section -- this is a
    decision-support summary aid, not a full label reproduction.
    """

    cache_key = f"openfda::{drug_name.strip().lower()}"
    if cache_key in _CACHE:
        return _CACHE[cache_key]

    encoded = urllib.parse.quote(f'openfda.generic_name:"{drug_name}"')
    url = f"{config.OPENFDA_BASE_URL}?search={encoded}&limit=1"

    data = _http_get_json(url)

    if data is None or "results" not in data or not data["results"]:
        # Retry with brand name search before giving up.
        encoded_brand = urllib.parse.quote(f'openfda.brand_name:"{drug_name}"')
        url_brand = f"{config.OPENFDA_BASE_URL}?search={encoded_brand}&limit=1"
        data = _http_get_json(url_brand)

    if data is None:
        result = {
            "source": "openfda",
            "status": "unavailable",
            "query": drug_name,
            "brand_name": None,
            "sections": {},
        }
        return result

    results = data.get("results", [])
    if not results:
        result = {
            "source": "openfda",
            "status": "not_found",
            "query": drug_name,
            "brand_name": None,
            "sections": {},
        }
        _CACHE[cache_key] = result
        _save_cache(_CACHE)
        return result

    record = results[0]
    openfda_meta = record.get("openfda", {}) if isinstance(record, dict) else {}
    brand_names = openfda_meta.get("brand_name", [])

    sections = {}
    for field in _LABEL_FIELDS:
        value = record.get(field)
        if value:
            # Field values are lists of strings in the openFDA schema.
            truncated = [str(v)[:600] for v in value[:1]]
            sections[field] = truncated

    result = {
        "source": "openfda",
        "status": "found",
        "query": drug_name,
        "brand_name": brand_names[0] if brand_names else None,
        "sections": sections,
    }

    _CACHE[cache_key] = result
    _save_cache(_CACHE)
    return result


# ============================================================
# COMBINED LOOKUP (used by the engine)
# ============================================================

def get_drug_information(drug_name: str) -> dict:
    """
    Combined RxNorm + openFDA lookup for a single drug/example
    medicine name. Always returns a dict describing what was found
    and what was not -- never raises, never silently fabricates data.
    """

    rxnorm_result = lookup_rxnorm(drug_name)
    openfda_result = lookup_openfda_label(drug_name)

    any_live_data = (
        rxnorm_result["status"] == "found"
        or openfda_result["status"] == "found"
    )

    return {
        "drug_name": drug_name,
        "rxnorm": rxnorm_result,
        "openfda": openfda_result,
        "external_data_available": any_live_data,
    }
