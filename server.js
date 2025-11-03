const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
// Prevent stale caching in browser so UI updates reflect immediately
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(express.static(__dirname)); // Serve files from root directory

// MySQL connection - using .env or fallback to hardcoded values
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'clinic_db',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  multipleStatements: true
});

db.connect(err => {
  if (err) {
    console.error('❌ MySQL connection error:', err.message);
    console.error('Please check your database credentials and ensure MySQL is running');
    return;
  }
  console.log('✅ Connected to MySQL (clinic_db)');
});

// Helper function with proper error handling
function handleQuery(res, sql, params = []) {
  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Query Error:', err);
      return res.status(400).json({ error: err.code || 'QUERY_ERROR', message: err.sqlMessage || String(err) });
    }
    res.json(results?.insertId ? { insertId: results.insertId, message: 'Success' } : results);
  });
}

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== DEPARTMENTS CRUD ==========
app.post('/add-department', (req, res) => {
  const { name } = req.body;
  handleQuery(res, 'INSERT INTO departments (name) VALUES (?)', [name]);
});

app.get('/departments', (req, res) => {
  handleQuery(res, 'SELECT * FROM departments ORDER BY department_id DESC');
});

app.put('/departments/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  handleQuery(res, 'UPDATE departments SET name=? WHERE department_id=?', [name, id]);
});

app.delete('/delete-department/:id', (req, res) => {
  const { id } = req.params;
  handleQuery(res, 'DELETE FROM departments WHERE department_id=?', [id]);
});

// ========== PATIENTS CRUD ==========
app.post('/add-patient', (req, res) => {
  const { name, age, gender, phone } = req.body;
  handleQuery(res, 'INSERT INTO patients (name, age, gender, phone) VALUES (?, ?, ?, ?)', 
    [name, age || null, gender || null, phone || null]);
});

app.get('/patients', (req, res) => {
  handleQuery(res, 'SELECT * FROM patients ORDER BY patient_id DESC');
});

app.put('/patients/:id', (req, res) => {
  const { id } = req.params;
  const { name, age, gender, phone } = req.body;
  handleQuery(res, 'UPDATE patients SET name=?, age=?, gender=?, phone=? WHERE patient_id=?', 
    [name, age || null, gender || null, phone || null, id]);
});

app.delete('/delete-patient/:id', (req, res) => {
  const { id } = req.params;
  handleQuery(res, 'DELETE FROM patients WHERE patient_id=?', [id]);
});

// ========== DOCTORS CRUD ==========
app.post('/add-doctor', (req, res) => {
  const { name, specialization, contact, phone, room_no, department_id } = req.body;
  const phoneNum = phone || contact || null;
  // Ensure room_no is null if empty string
  const roomNum = (room_no && room_no.trim() !== '') ? room_no.trim() : null;
  handleQuery(res, 'INSERT INTO doctors (name, specialization, phone, room_no, department_id) VALUES (?, ?, ?, ?, ?)', 
    [name, specialization || null, phoneNum, roomNum, department_id || null]);
});

app.get('/doctors', (req, res) => {
  const sql = `
    SELECT d.doctor_id, d.name, d.specialization, d.phone, d.room_no, d.department_id, dep.name AS department
    FROM doctors d
    LEFT JOIN departments dep ON d.department_id = dep.department_id
    ORDER BY d.doctor_id DESC
  `;
  handleQuery(res, sql);
});

app.put('/doctors/:id', (req, res) => {
  const { id } = req.params;
  const { name, specialization, contact, phone, room_no, department_id } = req.body;
  const phoneNum = phone || contact || null;
  // Ensure room_no is null if empty string
  const roomNum = (room_no && room_no.trim() !== '') ? room_no.trim() : null;
  handleQuery(res, 'UPDATE doctors SET name=?, specialization=?, phone=?, room_no=?, department_id=? WHERE doctor_id=?', 
    [name, specialization || null, phoneNum, roomNum, department_id || null, id]);
});

app.delete('/delete-doctor/:id', (req, res) => {
  const { id } = req.params;
  handleQuery(res, 'DELETE FROM doctors WHERE doctor_id=?', [id]);
});

// ========== APPOINTMENTS CRUD ==========
app.post('/add-appointment', (req, res) => {
  const { patient_id, doctor_id, date, time, appointment_date, appointment_time, reason } = req.body;
  const apptDate = appointment_date || date;
  const apptTime = appointment_time || time;
  handleQuery(res, 'INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, reason) VALUES (?, ?, ?, ?, ?)', 
    [patient_id, doctor_id, apptDate, apptTime, reason || null]);
});

app.get('/appointments', (req, res) => {
  const sql = `
    SELECT a.appointment_id, a.patient_id, a.doctor_id, a.appointment_date AS date, 
           a.appointment_time AS time, a.reason,
           p.name AS patient, d.name AS doctor
    FROM appointments a
    JOIN patients p ON a.patient_id = p.patient_id
    JOIN doctors d ON a.doctor_id = d.doctor_id
    ORDER BY a.appointment_id DESC
  `;
  handleQuery(res, sql);
});

app.put('/appointments/:id', (req, res) => {
  const { id } = req.params;
  const { patient_id, doctor_id, date, time, appointment_date, appointment_time, reason } = req.body;
  const apptDate = appointment_date || date;
  const apptTime = appointment_time || time;
  handleQuery(res, 'UPDATE appointments SET patient_id=?, doctor_id=?, appointment_date=?, appointment_time=?, reason=? WHERE appointment_id=?', 
    [patient_id, doctor_id, apptDate, apptTime, reason || null, id]);
});

app.delete('/delete-appointment/:id', (req, res) => {
  const { id } = req.params;
  handleQuery(res, 'DELETE FROM appointments WHERE appointment_id=?', [id]);
});

// ========== MEDICATIONS CRUD ==========
app.post('/add-medication', (req, res) => {
  const { patient_id, doctor_id, name, dosage } = req.body;
  handleQuery(res, 'INSERT INTO medications (patient_id, doctor_id, name, dosage) VALUES (?, ?, ?, ?)', 
    [patient_id, doctor_id, name, dosage || '']);
});

app.get('/medications', (req, res) => {
  const sql = `
    SELECT m.medication_id, m.patient_id, m.doctor_id, m.name, m.dosage,
           p.name AS patient, d.name AS doctor
    FROM medications m
    JOIN patients p ON m.patient_id = p.patient_id
    JOIN doctors d ON m.doctor_id = d.doctor_id
    ORDER BY m.medication_id DESC
  `;
  handleQuery(res, sql);
});

app.put('/medications/:id', (req, res) => {
  const { id } = req.params;
  const { patient_id, doctor_id, name, dosage } = req.body;
  handleQuery(res, 'UPDATE medications SET patient_id=?, doctor_id=?, name=?, dosage=? WHERE medication_id=?', 
    [patient_id, doctor_id, name, dosage || '', id]);
});

app.delete('/delete-medication/:id', (req, res) => {
  const { id } = req.params;
  handleQuery(res, 'DELETE FROM medications WHERE medication_id=?', [id]);
});

// ========== BILLING CRUD (bill_id, pat_id, amount, date_of_bill, payment_method) ==========
app.post('/add-billing', (req, res) => {
  const { pat_id, patient_id, amount, date_of_bill, payment_method } = req.body;
  handleQuery(res, 'INSERT INTO billing (pat_id, amount, date_of_bill, payment_method) VALUES (?, ?, ?, ?)', 
    [pat_id || patient_id, amount || 0, date_of_bill || null, payment_method || null]);
});

app.get('/billing', (req, res) => {
  const sql = `
    SELECT b.bill_id, b.pat_id, b.amount, b.date_of_bill, b.payment_method,
           p.name AS patient
    FROM billing b
    JOIN patients p ON b.pat_id = p.patient_id
    ORDER BY b.bill_id DESC
  `;
  handleQuery(res, sql);
});

app.put('/billing/:id', (req, res) => {
  const { id } = req.params;
  const { pat_id, patient_id, amount, date_of_bill, payment_method } = req.body;
  handleQuery(res, 'UPDATE billing SET pat_id=?, amount=?, date_of_bill=?, payment_method=? WHERE bill_id=?', 
    [pat_id || patient_id, amount || 0, date_of_bill || null, payment_method || null, id]);
});

app.delete('/delete-billing/:id', (req, res) => {
  const { id } = req.params;
  handleQuery(res, 'DELETE FROM billing WHERE bill_id=?', [id]);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${__dirname}`);
});
