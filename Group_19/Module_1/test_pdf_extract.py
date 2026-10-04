import os
import pymupdf
from extract_pdf_report import process_pdf

doc = pymupdf.open()
page = doc.new_page()
sample_text = """
CENTRAL METROPOLITAN CLINICAL LABORATORY
Patient Name: John Doe    Specimen Date: 2025-06-15
Age: 52   Gender: Male

DIAGNOSTIC LAB & VITALS REPORT
Blood Pressure: 135/88 mmHg
Heart rate: 78 bpm
Respiratory rate: 16 breaths/min
Body Mass Index: 26.4 kg/m²
Body Weight: 78.5 kg

COMPREHENSIVE METABOLIC & LIPID PANEL
Glucose: 108 mg/dL (70-99) High
Hemoglobin A1c: 6.2 % (4.0-5.6)
Serum Creatinine: 1.1 mg/dL (0.7-1.3)
Urea Nitrogen (BUN): 18 mg/dL (7-20)
Potassium: 4.4 mmol/L (3.5-5.0)
Sodium: 141 mmol/L (135-145)
Total Cholesterol: 215 mg/dL (<200)
HDL Cholesterol: 44 mg/dL (>40)
LDL Cholesterol: 142 mg/dL (<100)
Triglycerides: 165 mg/dL (<150)
Hemoglobin: 14.8 g/dL (13.5-17.5)
WBC: 6.8 10³/µL (4.5-11.0)
Platelets: 240 10³/µL (150-450)
"""
page.insert_text((50, 50), sample_text, fontsize=11)
pdf_path = os.path.join(os.path.dirname(__file__), 'sample_lab_report.pdf')
doc.save(pdf_path)
doc.close()

res = process_pdf(pdf_path)
print("Extraction Success:", res.get("success"))
print("Report Date:", res.get("report_date"))
print("Extracted Observations Count:", res.get("extracted_count"))
for obs in res.get("observations", []):
    print(f"  * {obs['canonical_name']}: {obs['value']} {obs['unit']} (Plausible: {obs['plausible']}, Conf: {obs['confidence']})")
