import db from '../config/db.js';

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/admin/doctors  — paginated + search + filter by department
// ══════════════════════════════════════════════════════════════════════════════
export const getAllDoctors = async (req, res) => {
  try {
    const { department_id, search, page = 1, limit = 20 } = req.query;

    const conditions = [];
    const params = [];

    if (department_id && !isNaN(department_id)) {
      params.push(parseInt(department_id));
      conditions.push(`d.department_id = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      conditions.push(
        `(LOWER(d.first_name) LIKE $${params.length} OR LOWER(d.last_name) LIKE $${params.length} OR LOWER(d.specialty) LIKE $${params.length})`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query(
      `SELECT COUNT(*) AS total FROM doctors d ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit));
    params.push(offset);

    const result = await db.query(
      `SELECT
         d.*,
         dep.name AS department_name,
         (SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = d.id) AS total_appointments,
         (SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = d.id AND a.status = 'pending') AS pending_appointments
       FROM doctors d
       LEFT JOIN departments dep ON dep.id = d.department_id
       ${whereClause}
       ORDER BY d.id ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.status(200).json({
      status: 'success',
      results: result.rows.length,
      total,
      page: parseInt(page),
      total_pages: Math.ceil(total / parseInt(limit)),
      data: { doctors: result.rows },
    });
  } catch (error) {
    console.error('❌ Error in admin getAllDoctors:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/admin/doctors/:id
// ══════════════════════════════════════════════════════════════════════════════
export const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(id)) return res.status(400).json({ status: 'fail', message: 'Invalid ID' });

    const [doctor, education, certifications, awards, memberships, schedule] = await Promise.all([
      db.query(
        `SELECT d.*, dep.name AS department_name FROM doctors d
         LEFT JOIN departments dep ON dep.id = d.department_id WHERE d.id = $1`,
        [id]
      ),
      db.query('SELECT * FROM education WHERE doctor_id = $1 ORDER BY id', [id]),
      db.query('SELECT * FROM certifications WHERE doctor_id = $1 ORDER BY id', [id]),
      db.query('SELECT * FROM awards WHERE doctor_id = $1 ORDER BY id', [id]),
      db.query('SELECT * FROM memberships WHERE doctor_id = $1 ORDER BY id', [id]),
      db.query('SELECT * FROM schedule WHERE doctor_id = $1 ORDER BY id', [id]),
    ]);

    if (doctor.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Doctor not found' });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        doctor: doctor.rows[0],
        education: education.rows,
        certifications: certifications.rows,
        awards: awards.rows,
        memberships: memberships.rows,
        schedule: schedule.rows,
      },
    });
  } catch (error) {
    console.error('❌ Error in admin getDoctorById:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  POST /api/admin/doctors  — create a new doctor
// ══════════════════════════════════════════════════════════════════════════════
export const createDoctor = async (req, res) => {
  try {
    const {
      first_name, last_name, specialty, department_id,
      bio, image_url, phone, email, years_experience,
      consultation_fee, rating, is_available,
    } = req.body;

    if (!first_name || !last_name || !specialty || !department_id) {
      return res.status(400).json({
        status: 'fail',
        message: 'first_name, last_name, specialty, and department_id are required',
      });
    }

    const result = await db.query(
      `INSERT INTO doctors
         (first_name, last_name, specialty, department_id, bio, image_url,
          phone, email, years_experience, consultation_fee, rating, is_available)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        first_name.trim(), last_name.trim(), specialty.trim(),
        parseInt(department_id), bio || null, image_url || null,
        phone || null, email || null,
        years_experience ? parseInt(years_experience) : null,
        consultation_fee ? parseFloat(consultation_fee) : null,
        rating ? parseFloat(rating) : null,
        is_available !== undefined ? is_available : true,
      ]
    );

    return res.status(201).json({
      status: 'success',
      message: 'Doctor created successfully',
      data: { doctor: result.rows[0] },
    });
  } catch (error) {
    console.error('❌ Error in createDoctor:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  PUT /api/admin/doctors/:id  — update doctor
// ══════════════════════════════════════════════════════════════════════════════
export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(id)) return res.status(400).json({ status: 'fail', message: 'Invalid ID' });

    const {
      first_name, last_name, specialty, department_id,
      bio, image_url, phone, email, years_experience,
      consultation_fee, rating, is_available,
    } = req.body;

    const result = await db.query(
      `UPDATE doctors SET
         first_name = COALESCE($1, first_name),
         last_name = COALESCE($2, last_name),
         specialty = COALESCE($3, specialty),
         department_id = COALESCE($4, department_id),
         bio = COALESCE($5, bio),
         image_url = COALESCE($6, image_url),
         phone = COALESCE($7, phone),
         email = COALESCE($8, email),
         years_experience = COALESCE($9, years_experience),
         consultation_fee = COALESCE($10, consultation_fee),
         rating = COALESCE($11, rating),
         is_available = COALESCE($12, is_available),
         updated_at = NOW()
       WHERE id = $13
       RETURNING *`,
      [
        first_name, last_name, specialty,
        department_id ? parseInt(department_id) : null,
        bio, image_url, phone, email,
        years_experience ? parseInt(years_experience) : null,
        consultation_fee ? parseFloat(consultation_fee) : null,
        rating ? parseFloat(rating) : null,
        is_available,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Doctor not found' });
    }

    return res.status(200).json({
      status: 'success',
      data: { doctor: result.rows[0] },
    });
  } catch (error) {
    console.error('❌ Error in updateDoctor:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  DELETE /api/admin/doctors/:id
// ══════════════════════════════════════════════════════════════════════════════
export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(id)) return res.status(400).json({ status: 'fail', message: 'Invalid ID' });

    // Check for active appointments first
    const activeAppts = await db.query(
      `SELECT COUNT(*) AS count FROM appointments WHERE doctor_id = $1 AND status IN ('pending','confirmed')`,
      [id]
    );

    if (parseInt(activeAppts.rows[0].count) > 0) {
      return res.status(409).json({
        status: 'fail',
        message: 'Cannot delete doctor with active appointments. Cancel them first.',
      });
    }

    const result = await db.query('DELETE FROM doctors WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Doctor not found' });
    }

    return res.status(200).json({ status: 'success', message: 'Doctor deleted successfully' });
  } catch (error) {
    console.error('❌ Error in deleteDoctor:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};