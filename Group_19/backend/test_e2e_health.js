const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://127.0.0.1:5000/api';

async function runTests() {
  console.log('==========================================');
  console.log('MediTwin End-to-End Pipeline Verification');
  console.log('==========================================');

  // 1. Health check / ping
  try {
    const pingRes = await axios.get(`${API_BASE}/ping`);
    console.log('✓ Backend Health Check:', pingRes.data);
  } catch (e) {
    console.error('❌ Backend not reachable on port 5000:', e.message);
    process.exit(1);
  }

  // 2. Auth: Register / Login test patient
  let token = null;
  const testEmail = `test_patient_${Date.now()}@meditwin.local`;
  const testPassword = 'Password123!';

  try {
    const regRes = await axios.post(`${API_BASE}/auth/signup`, {
      name: 'Integration Test Patient',
      email: testEmail,
      password: testPassword,
      role: 'patient',
      gender: 'Male'
    });
    token = regRes.data.token;
    console.log('✓ Patient Registered. Token acquired.');
  } catch (e) {
    console.log('Register failed with:', e.response?.data || e.message);
    console.log('Attempting login fallback...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'john@example.com',
      password: 'password123'
    });
    token = loginRes.data.token;
    console.log('✓ Patient Logged In. Token acquired.');
  }

  const authHeaders = { Authorization: `Bearer ${token}` };

  // 3. Test PDF Upload & Medical Extraction
  const samplePdfPath = path.resolve(__dirname, '../Module_1/sample_lab_report.pdf');
  if (!fs.existsSync(samplePdfPath)) {
    console.error('❌ Sample PDF not found at:', samplePdfPath);
    process.exit(1);
  }

  console.log('\nTesting 1: PDF Upload & Automated Extraction...');
  const form = new FormData();
  form.append('pdf', fs.createReadStream(samplePdfPath));

  const pdfUploadRes = await axios.post(`${API_BASE}/health/upload-pdf`, form, {
    headers: { ...authHeaders, ...form.getHeaders() }
  });

  console.log('✓ PDF Extraction Response:');
  console.log('  - Success:', pdfUploadRes.data.success);
  console.log('  - Extracted Biomarker Count:', pdfUploadRes.data.extracted_count);
  console.log('  - Detected Report Date:', pdfUploadRes.data.report_date);
  console.log('  - Sample Extracted Biomarker:', pdfUploadRes.data.observations[0]);

  // 4. Test Confirmation of Extracted Observations -> Module 1 Analysis
  console.log('\nTesting 2: Confirm Extracted Observations -> Module 1 XGBoost Engine...');
  const confirmRes = await axios.post(`${API_BASE}/health/confirm-extracted`, {
    observations: pdfUploadRes.data.observations,
    reportDate: pdfUploadRes.data.report_date,
    fileName: 'sample_lab_report.pdf',
    isScanned: pdfUploadRes.data.is_scanned
  }, { headers: authHeaders });

  console.log('✓ Confirm & Module 1 Execution Result:');
  console.log('  - Message:', confirmRes.data.message);
  console.log('  - HealthRecord ID:', confirmRes.data.healthRecordId);
  console.log('  - 90-Day Acute Risk Category:', confirmRes.data.riskPrediction?.riskCategory);
  console.log('  - 90-Day Probability:', confirmRes.data.riskPrediction?.probabilityPercent?.toFixed(2) + '%');

  // 5. Test Manual Health Data Entry -> Module 1 Analysis
  console.log('\nTesting 3: Manual Clinical Form Submission -> Module 1 XGBoost Engine...');
  const manualObservations = [
    { name: 'Systolic Blood Pressure', value: 142, unit: 'mmHg' },
    { name: 'Diastolic Blood Pressure', value: 92, unit: 'mmHg' },
    { name: 'Heart rate', value: 84, unit: 'bpm' },
    { name: 'Respiratory rate', value: 18, unit: 'breaths/min' },
    { name: 'Glucose', value: 135, unit: 'mg/dL' },
    { name: 'Hemoglobin A1c/Hemoglobin.total in Blood', value: 7.1, unit: '%' },
    { name: 'Creatinine', value: 1.3, unit: 'mg/dL' },
    { name: 'Potassium', value: 4.6, unit: 'mmol/L' },
    { name: 'Total Cholesterol', value: 235, unit: 'mg/dL' },
  ];

  const manualRes = await axios.post(`${API_BASE}/health/manual-entry`, {
    observations: manualObservations,
    reportDate: new Date().toISOString(),
    title: 'Clinic Visit Manual Log'
  }, { headers: authHeaders });

  console.log('✓ Manual Entry & Module 1 Execution Result:');
  console.log('  - Message:', manualRes.data.message);
  console.log('  - HealthRecord ID:', manualRes.data.healthRecordId);
  console.log('  - 90-Day Acute Risk Category:', manualRes.data.riskPrediction?.riskCategory);
  console.log('  - 90-Day Probability:', manualRes.data.riskPrediction?.probabilityPercent?.toFixed(2) + '%');

  // 6. Test Risk History Retrieval
  console.log('\nTesting 4: Fetch Patient Risk History & Trajectory...');
  const historyRes = await axios.get(`${API_BASE}/health/risk-history`, { headers: authHeaders });
  console.log('✓ Risk History Milestones Stored in MongoDB:', historyRes.data.length);

  console.log('\n==========================================');
  console.log('ALL PIPELINE TESTS PASSED SUCCESSFULLY! 🚀');
  console.log('==========================================');
}

runTests().catch(err => {
  console.error('\n❌ Test execution error:', err.response?.data || err.message);
  process.exit(1);
});
