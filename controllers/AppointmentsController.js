import db from '../config/db.js';

// ══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/** Simple email regex check */
const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/** Phone: digits, spaces, dashes, +, parens — min 7 chars */
const isValidPhone = (phone) =>
  /^[\d\s\-+().]{7,20}$/.test(phone);

/** Date string YYYY-MM-DD and must be a real calendar date */
const isValidDate = (str) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
};

/** Time string HH:MM (24-hour) */
const isValidTime = (str) => /^([01]\d|2[0-3]):[0-5]\d$/.test(str);

/** Allowed gender values */
const GENDERS = ['male', 'female', 'other'];

/** Allowed visit reasons — must match your DB enum / FE options */
const REASONS = [
  'routine_checkup',
  'follow_up',
  'emergency',
  'consultation',
  'lab_results',
  'other',
];

// ══════════════════════════════════════════════════════════════════════════════
//  VALIDATION — returns { errors: string[] }
// ══════════════════════════════════════════════════════════════════════════════

const validateBooking = (body) => {
  const errors = [];
  const {
    full_name,
    date_of_birth,
    phone_number,
    email,
    gender,
    address,
    medical_history,
    department_id,
    doctor_id,
    preferred_date,
    preferred_time,
    reason_for_visit,
    additional_notes,
  } = body;

  // ── full_name ──────────────────────────────────────────────────────────────
  if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
    errors.push('full_name: مطلوب ويجب أن يكون حرفين على الأقل');
  } else if (full_name.trim().length > 150) {
    errors.push('full_name: لا يتجاوز 150 حرفاً');
  }

  // ── date_of_birth (optional) ───────────────────────────────────────────────
  if (date_of_birth) {
    if (!isValidDate(date_of_birth)) {
      errors.push('date_of_birth: صيغة غير صحيحة، المطلوب YYYY-MM-DD');
    } else {
      const dob = new Date(date_of_birth);
      const today = new Date();
      if (dob >= today) {
        errors.push('date_of_birth: يجب أن يكون في الماضي');
      }
      const age = (today - dob) / (1000 * 60 * 60 * 24 * 365.25);
      if (age > 120) {
        errors.push('date_of_birth: تاريخ غير واقعي');
      }
    }
  }

  // ── phone_number ───────────────────────────────────────────────────────────
  if (!phone_number || typeof phone_number !== 'string' || !phone_number.trim()) {
    errors.push('phone_number: مطلوب');
  } else if (!isValidPhone(phone_number.trim())) {
    errors.push('phone_number: صيغة غير صحيحة');
  }

  // ── email ──────────────────────────────────────────────────────────────────
  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.push('email: مطلوب');
  } else if (!isValidEmail(email.trim())) {
    errors.push('email: صيغة البريد الإلكتروني غير صحيحة');
  } else if (email.trim().length > 150) {
    errors.push('email: لا يتجاوز 150 حرفاً');
  }

  // ── gender ─────────────────────────────────────────────────────────────────
  if (!gender || typeof gender !== 'string' || !gender.trim()) {
    errors.push('gender: مطلوب');
  } else if (!GENDERS.includes(gender.trim().toLowerCase())) {
    errors.push(`gender: القيم المسموحة هي (${GENDERS.join(' | ')})`);
  }

  // ── address (optional) ─────────────────────────────────────────────────────
  if (address && typeof address === 'string' && address.trim().length > 300) {
    errors.push('address: لا يتجاوز 300 حرف');
  }

  // ── medical_history (optional) ────────────────────────────────────────────
  if (medical_history && typeof medical_history === 'string' && medical_history.length > 2000) {
    errors.push('medical_history: لا يتجاوز 2000 حرف');
  }

  // ── department_id ──────────────────────────────────────────────────────────
  const deptId = parseInt(department_id, 10);
  if (!department_id || isNaN(deptId) || deptId < 1) {
    errors.push('department_id: مطلوب ويجب أن يكون رقماً صحيحاً');
  }

  // ── doctor_id ──────────────────────────────────────────────────────────────
  const docId = parseInt(doctor_id, 10);
  if (!doctor_id || isNaN(docId) || docId < 1) {
    errors.push('doctor_id: مطلوب ويجب أن يكون رقماً صحيحاً');
  }

  // ── preferred_date ─────────────────────────────────────────────────────────
  if (!preferred_date || typeof preferred_date !== 'string') {
    errors.push('preferred_date: مطلوب');
  } else if (!isValidDate(preferred_date)) {
    errors.push('preferred_date: صيغة غير صحيحة، المطلوب YYYY-MM-DD');
  } else {
    // Must be today or in the future
    const apptDate = new Date(preferred_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (apptDate < today) {
      errors.push('preferred_date: يجب أن يكون اليوم أو في المستقبل');
    }
    // Max 1 year ahead
    const maxDate = new Date(today);
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    if (apptDate > maxDate) {
      errors.push('preferred_date: لا يمكن الحجز أكثر من سنة مسبقاً');
    }
  }

  // ── preferred_time ─────────────────────────────────────────────────────────
  if (!preferred_time || typeof preferred_time !== 'string') {
    errors.push('preferred_time: مطلوب');
  } else if (!isValidTime(preferred_time.trim())) {
    errors.push('preferred_time: صيغة غير صحيحة، المطلوب HH:MM');
  } else {
    // Clinic hours: 08:00 – 20:00 (Mon-Fri), relaxed check here
    const [h] = preferred_time.split(':').map(Number);
    if (h < 8 || h >= 20) {
      errors.push('preferred_time: يجب أن يكون بين 08:00 و 20:00');
    }
  }

  // ── reason_for_visit ───────────────────────────────────────────────────────
  if (!reason_for_visit || typeof reason_for_visit !== 'string' || !reason_for_visit.trim()) {
    errors.push('reason_for_visit: مطلوب');
  } else if (!REASONS.includes(reason_for_visit.trim())) {
    errors.push(`reason_for_visit: القيم المسموحة هي (${REASONS.join(' | ')})`);
  }

  // ── additional_notes (optional) ────────────────────────────────────────────
  if (additional_notes && typeof additional_notes === 'string' && additional_notes.length > 1000) {
    errors.push('additional_notes: لا يتجاوز 1000 حرف');
  }

  return { errors };
};

// ══════════════════════════════════════════════════════════════════════════════
//  DB CHECKS — verify doctor belongs to department
// ══════════════════════════════════════════════════════════════════════════════

const verifyDoctorBelongsToDept = async (doctor_id, department_id) => {
  // Cast to int explicitly — SELECT <option> values come in as strings
  const result = await db.query(
    'SELECT id FROM doctors WHERE id = $1::int AND department_id = $2::int',
    [doctor_id, department_id]
  );
  console.log(`verifyDoctorBelongsToDept(doctor=${doctor_id}, dept=${department_id}) rows=${result.rows.length}`);
  return result.rows.length > 0;
};

const verifyDepartmentExists = async (department_id) => {
  const result = await db.query(
    'SELECT id FROM departments WHERE id = $1',
    [department_id]
  );
  return result.rows.length > 0;
};

// ══════════════════════════════════════════════════════════════════════════════
//  POST /appointments  — book appointment
// ══════════════════════════════════════════════════════════════════════════════

export const bookAppointment = async (req, res) => {
  try {
    // 1. Validate fields
    const { errors } = validateBooking(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'بيانات غير صحيحة',
        errors,
      });
    }

    const {
      full_name,
      date_of_birth,
      phone_number,
      email,
      gender,
      address,
      medical_history,
      department_id,
      doctor_id,
      preferred_date,
      preferred_time,
      reason_for_visit,
      additional_notes,
    } = req.body;

    const deptId = parseInt(department_id, 10);
    const docId  = parseInt(doctor_id, 10);

    // 2. Check doctor exists
    const doctorCheck = await db.query(
      'SELECT id FROM doctors WHERE id = $1::int',
      [docId]
    );
    if (doctorCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'الدكتور المحدد غير موجود',
      });
    }

    // 3. Check for duplicate booking (same doctor + date + time)
    const duplicate = await db.query(
      `SELECT id FROM appointments
       WHERE doctor_id = $1
         AND preferred_date = $2
         AND preferred_time = $3
         AND status NOT IN ('cancelled')`,
      [docId, preferred_date, preferred_time]
    );
    if (duplicate.rows.length > 0) {
      return res.status(409).json({
        status: 'fail',
        message: 'هذا الوقت محجوز مسبقاً، الرجاء اختيار وقت آخر',
      });
    }

    // 5. Insert
    const result = await db.query(
      `INSERT INTO appointments
         (full_name, date_of_birth, phone_number, email, gender, address,
          medical_history, department_id, doctor_id, preferred_date,
          preferred_time, reason_for_visit, additional_notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending')
       RETURNING
         id,
         full_name,
         email,
         phone_number,
         preferred_date,
         preferred_time,
         status,
         created_at`,
      [
        full_name.trim(),
        date_of_birth   || null,
        phone_number.trim(),
        email.trim().toLowerCase(),
        gender.trim().toLowerCase(),
        address?.trim()         || null,
        medical_history?.trim() || null,
        deptId,
        docId,
        preferred_date,
        preferred_time.trim(),
        reason_for_visit.trim(),
        additional_notes?.trim() || null,
      ]
    );

    return res.status(201).json({
      status: 'success',
      message: 'تم حجز الموعد بنجاح ✅',
      data: { appointment: result.rows[0] },
    });

  } catch (error) {
    console.error('❌ Error in bookAppointment:', error);
    return res.status(500).json({
      status: 'error',
      message: 'مشكلة في السيرفر، الرجاء المحاولة لاحقاً',
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  GET /appointments/search?email=...&phone=...  — find patient's appointments
// ══════════════════════════════════════════════════════════════════════════════

export const searchMyAppointments = async (req, res) => {
  try {
    const { email, phone } = req.query;

    if (!email && !phone) {
      return res.status(400).json({
        status: 'fail',
        message: 'الرجاء إدخال البريد الإلكتروني أو رقم الهاتف للبحث',
      });
    }

    // Build dynamic WHERE clause — search by email OR phone, whichever is provided
    const conditions = [];
    const params = [];

    if (email && email.trim()) {
      params.push(email.trim().toLowerCase());
      conditions.push(`LOWER(a.email) = $${params.length}`);
    }

    if (phone && phone.trim()) {
      params.push(phone.trim());
      conditions.push(`a.phone_number = $${params.length}`);
    }

    // If both provided, match either one (OR) — most forgiving for the patient
    const whereClause = conditions.join(' OR ');

    const result = await db.query(
      `SELECT
         a.id,
         a.full_name,
         a.email,
         a.phone_number,
         a.preferred_date,
         a.preferred_time,
         a.reason_for_visit,
         a.status,
         a.created_at,
         dep.name        AS department_name,
         doc.first_name  AS doctor_first_name,
         doc.last_name   AS doctor_last_name
       FROM appointments a
       LEFT JOIN departments dep ON dep.id = a.department_id
       LEFT JOIN doctors doc     ON doc.id = a.doctor_id
       WHERE ${whereClause}
       ORDER BY a.preferred_date DESC, a.preferred_time DESC`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        status: 'success',
        results: 0,
        message: 'لم يتم العثور على أي حجوزات بهذه البيانات',
        data: { appointments: [] },
      });
    }

    return res.status(200).json({
      status: 'success',
      results: result.rows.length,
      data: { appointments: result.rows },
    });

  } catch (error) {
    console.error('❌ Error in searchMyAppointments:', error);
    return res.status(500).json({
      status: 'error',
      message: 'مشكلة في السيرفر، الرجاء المحاولة لاحقاً',
    });
  }
};