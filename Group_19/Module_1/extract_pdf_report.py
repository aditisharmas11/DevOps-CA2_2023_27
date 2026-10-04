#!/usr/bin/env python3
"""
MediTwin Module 1 - PDF Health & Lab Report Extractor with OCR Fallback
Extracts medical observations and maps them to the 29 canonical Module 1 biomarkers.
"""

import sys
import os
import re
import json
from datetime import datetime
from pathlib import Path

# Ensure Module_1 is on sys.path
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

try:
    from config import OBSERVATION_CONFIG, OBSERVATION_ALIASES, SUPPORTED_OBSERVATIONS
except ImportError:
    # Fallback minimal definitions if imported standalone
    OBSERVATION_CONFIG = {}
    OBSERVATION_ALIASES = {}
    SUPPORTED_OBSERVATIONS = []


def extract_text_from_pdf(pdf_path: str) -> tuple[str, bool, int]:
    """
    Extracts text from a PDF file using pymupdf (fitz).
    If text density is extremely low, attempts OCR fallback.
    Returns (extracted_text, is_scanned, page_count).
    """
    import pymupdf

    doc = pymupdf.open(pdf_path)
    page_count = len(doc)
    all_text = []
    total_chars = 0

    for page_idx in range(page_count):
        page = doc[page_idx]
        text = page.get_text("text")
        all_text.append(text)
        total_chars += len(text.strip())

    combined_text = "\n".join(all_text)
    is_scanned = total_chars < 50 * max(1, page_count)

    # If scanned/image-based, attempt OCR fallback
    if is_scanned:
        ocr_text = []
        try:
            import pytesseract
            from PIL import Image
            import io

            for page_idx in range(page_count):
                page = doc[page_idx]
                pix = page.get_pixmap(dpi=200)
                img_data = pix.tobytes("png")
                image = Image.open(io.BytesIO(img_data))
                text = pytesseract.image_to_string(image)
                ocr_text.append(text)
            
            ocr_combined = "\n".join(ocr_text)
            if len(ocr_combined.strip()) > total_chars:
                combined_text = ocr_combined
        except Exception as ocr_err:
            # Fallback gracefully if pytesseract/tesseract binary is not installed
            pass

    doc.close()
    return combined_text, is_scanned, page_count


def extract_report_date(text: str) -> str:
    """
    Extracts the most probable report or collection date from text.
    Returns ISO 8601 formatted string or today's date.
    """
    # Look for common date patterns near keywords
    date_patterns = [
        r'(?:report\s*date|collected|collection\s*date|date\s*of\s*collection|specimen\s*date|test\s*date|date)[:\s]+(\d{4}[-/]\d{1,2}[-/]\d{1,2})',
        r'(?:report\s*date|collected|collection\s*date|date\s*of\s*collection|specimen\s*date|test\s*date|date)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
        r'(?:report\s*date|collected|date)[:\s]+([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})',
        r'(\d{4}-\d{2}-\d{2})',
        r'(\d{1,2}/\d{1,2}/\d{4})',
    ]

    for pat in date_patterns:
        match = re.search(pat, text, re.IGNORECASE)
        if match:
            date_str = match.group(1).strip()
            # Try parsing various date formats
            for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%m-%d-%Y", "%B %d, %Y", "%b %d, %Y", "%B %d %Y", "%b %d %Y"):
                try:
                    dt = datetime.strptime(date_str, fmt)
                    # Plausibility check: between year 1990 and current year + 1
                    if 1990 <= dt.year <= datetime.now().year + 1:
                        return dt.strftime("%Y-%m-%dT09:00:00+00:00")
                except ValueError:
                    continue

    return datetime.now().strftime("%Y-%m-%dT09:00:00+00:00")


def normalize_observation_name(raw_name: str) -> tuple[str, str, float]:
    """
    Matches raw extracted observation text to one of the 29 canonical Module 1 biomarkers.
    Returns (canonical_name, display_label, match_confidence).
    """
    cleaned = raw_name.strip().lower()
    cleaned = re.sub(r'[^a-z0-9\s/]', '', cleaned)

    # 1. Exact alias match
    if cleaned in OBSERVATION_ALIASES:
        canonical = OBSERVATION_ALIASES[cleaned]
        info = OBSERVATION_CONFIG.get(canonical, {})
        return canonical, info.get("label", canonical), 1.0

    # 2. Substring / Token matching
    best_match = None
    highest_score = 0.0

    for alias, canonical in OBSERVATION_ALIASES.items():
        if alias in cleaned or cleaned in alias:
            score = len(alias) / max(len(cleaned), len(alias))
            if score > highest_score:
                highest_score = score
                best_match = canonical

    if best_match and highest_score >= 0.6:
        info = OBSERVATION_CONFIG.get(best_match, {})
        return best_match, info.get("label", best_match), round(0.85 * highest_score, 2)

    return None, None, 0.0


def validate_plausibility(canonical_name: str, value: float) -> tuple[bool, str]:
    """
    Checks if extracted numeric value falls into the physiological plausibility range.
    """
    info = OBSERVATION_CONFIG.get(canonical_name, {})
    bounds = info.get("plausibility_range", (0, 10000))
    low, high = bounds
    if low <= value <= high:
        return True, "Within plausible physiological range"
    return False, f"Value {value} is outside plausible range ({low} - {high})"


def extract_observations_from_text(text: str, report_date: str) -> list[dict]:
    """
    Extracts lab and vital sign observations from text using medical patterns.
    """
    extracted = []
    seen_canonicals = {}

    lines = text.splitlines()

    # 1. First pass: Handle Blood Pressure composite formats (e.g., BP: 120/80 mmHg, SBP/DBP 135 / 85)
    bp_patterns = [
        r'(?:blood\s*pressure|bp|b\.p\.)[:\s]+(\d{2,3})\s*[/\\-]\s*(\d{2,3})',
        r'(\d{2,3})\s*[/\\-]\s*(\d{2,3})\s*mm\s*hg',
        r'systolic[/_]diastolic[:\s]+(\d{2,3})\s*[/\\-]\s*(\d{2,3})'
    ]
    for line in lines:
        for pat in bp_patterns:
            bp_match = re.search(pat, line, re.IGNORECASE)
            if bp_match:
                sbp_val = float(bp_match.group(1))
                dbp_val = float(bp_match.group(2))
                
                # Check SBP
                sbp_plausible, sbp_msg = validate_plausibility("Systolic Blood Pressure", sbp_val)
                if sbp_plausible and "Systolic Blood Pressure" not in seen_canonicals:
                    seen_canonicals["Systolic Blood Pressure"] = {
                        "name": "Systolic Blood Pressure",
                        "canonical_name": "Systolic Blood Pressure",
                        "label": OBSERVATION_CONFIG["Systolic Blood Pressure"]["label"],
                        "value": sbp_val,
                        "unit": OBSERVATION_CONFIG["Systolic Blood Pressure"]["unit"],
                        "date": report_date,
                        "confidence": 0.95,
                        "plausible": sbp_plausible,
                        "plausibility_note": sbp_msg,
                        "raw_match": line.strip()
                    }

                # Check DBP
                dbp_plausible, dbp_msg = validate_plausibility("Diastolic Blood Pressure", dbp_val)
                if dbp_plausible and "Diastolic Blood Pressure" not in seen_canonicals:
                    seen_canonicals["Diastolic Blood Pressure"] = {
                        "name": "Diastolic Blood Pressure",
                        "canonical_name": "Diastolic Blood Pressure",
                        "label": OBSERVATION_CONFIG["Diastolic Blood Pressure"]["label"],
                        "value": dbp_val,
                        "unit": OBSERVATION_CONFIG["Diastolic Blood Pressure"]["unit"],
                        "date": report_date,
                        "confidence": 0.95,
                        "plausible": dbp_plausible,
                        "plausibility_note": dbp_msg,
                        "raw_match": line.strip()
                    }
                break

    # 2. General Observation Pattern Matching
    # Common format: <Observation Name> <separator> <Value> <optional Unit> <optional Ref Range>
    general_patterns = [
        # Name: 12.3 mg/dL
        r'([A-Za-z0-9\s/().\-]+?)[:=\t|]+\s*([<>]?\s*\d+(?:\.\d+)?)\s*([A-Za-z%µ³\/\^0-9\-\*]*)(?:\s+[\d.\-<>]+|\s+Normal|\s+High|\s+Low)?',
        # Name 12.3 mg/dL (whitespace separated tabular)
        r'^([A-Za-z\s/().\-]{3,40})\s{2,}([<>]?\s*\d+(?:\.\d+)?)\s*([A-Za-z%µ³\/\^0-9\-\*]*)',
    ]

    for line in lines:
        cleaned_line = line.strip()
        if not cleaned_line or len(cleaned_line) < 4:
            continue

        for pat in general_patterns:
            matches = re.finditer(pat, cleaned_line)
            for m in matches:
                raw_name = m.group(1).strip()
                raw_val = m.group(2).strip().replace('<', '').replace('>', '').strip()
                raw_unit = m.group(3).strip() if len(m.groups()) >= 3 else ""

                try:
                    num_val = float(raw_val)
                except ValueError:
                    continue

                canonical, label, confidence = normalize_observation_name(raw_name)
                if canonical and canonical not in seen_canonicals:
                    info = OBSERVATION_CONFIG.get(canonical, {})
                    expected_unit = info.get("unit", raw_unit)
                    is_plausible, plaus_msg = validate_plausibility(canonical, num_val)

                    seen_canonicals[canonical] = {
                        "name": canonical,
                        "canonical_name": canonical,
                        "label": label or canonical,
                        "value": num_val,
                        "unit": expected_unit,
                        "date": report_date,
                        "confidence": confidence,
                        "plausible": is_plausible,
                        "plausibility_note": plaus_msg,
                        "raw_match": cleaned_line
                    }

    extracted = list(seen_canonicals.values())
    return extracted


def process_pdf(pdf_path: str) -> dict:
    """
    Main entry point to extract, parse, and validate lab report data from a PDF file.
    """
    if not os.path.exists(pdf_path):
        return {
            "success": False,
            "error": f"File not found: {pdf_path}",
            "observations": []
        }

    try:
        raw_text, is_scanned, page_count = extract_text_from_pdf(pdf_path)
        report_date = extract_report_date(raw_text)
        observations = extract_observations_from_text(raw_text, report_date)

        return {
            "success": True,
            "file_name": os.path.basename(pdf_path),
            "page_count": page_count,
            "is_scanned": is_scanned,
            "raw_text_length": len(raw_text),
            "report_date": report_date,
            "extracted_count": len(observations),
            "observations": observations,
            "preview_text": raw_text[:1200] if raw_text else ""
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to extract PDF: {str(e)}",
            "observations": []
        }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: extract_pdf_report.py <pdf_path>"}))
        sys.exit(1)

    pdf_file = sys.argv[1]
    result = process_pdf(pdf_file)
    print(json.dumps(result, indent=2, ensure_ascii=False))
