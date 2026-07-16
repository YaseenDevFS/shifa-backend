// controllers/adminAppointmentsController.js
import db from '../config/db.js';

const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/admin/appointments
//  Query params: status, doctor_id, department_id, date, page, limit, search
// ══════════════════════════════════════════════════════════════════════════════
export const getAllAppointments = async (req, res) => {
  try {
    const {
      status,
      doctor_id,
      department_id,
      date,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const conditions = [];
    const params = [];

    if (status && VALID_STATUSES.includes(status)) {
      params.push(status);
      conditions.push(`a.status = $${params.length}`);
    }

    if (doctor_id && !isNaN(doctor_id)) {
      params.push(parseInt(doctor_id));
      conditions.push(`a.doctor_id = $${params.length}`);
    }

    if (department_id && !isNaN(department_id)) {
      params.push(parseInt(department_id));
      conditions.push(`a.department_id = $${params.length}`);
    }

    if (date) {
      params.push(date);
      conditions.push(`a.preferred_date = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      conditions.push(
        `(LOWER(a.full_name) LIKE $${params.length} OR LOWER(a.email) LIKE $${params.length} OR a.phone_number LIKE $${params.length})`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count for pagination
    const countResult = await db.query(
      `SELECT COUNT(*) AS total FROM appointments a ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit));
    params.push(offset);

    const result = await db.query(
      `SELECT
         a.id,
         a.full_name,
         a.email,
         a.phone_number,
         a.gender,
         a.date_of_birth,
         a.preferred_date,
         a.preferred_time,
         a.reason_for_visit,
         a.additional_notes,
         a.medical_history,
         a.address,
         a.status,
         a.created_at,
         dep.name AS department_name,
         dep.id   AS department_id,
         doc.id   AS doctor_id,
         doc.first_name || ' ' || doc.last_name AS doctor_name
       FROM appointments a
       LEFT JOIN departments dep ON dep.id = a.department_id
       LEFT JOIN doctors doc ON doc.id = a.doctor_id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.status(200).json({
      status: 'success',
      results: result.rows.length,
      total,
      page: parseInt(page),
      total_pages: Math.ceil(total / parseInt(limit)),
      data: { appointments: result.rows },
    });
  } catch (error) {
    console.error('❌ Error in getAllAppointments:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/admin/appointments/:id
// ══════════════════════════════════════════════════════════════════════════════
export const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(id)) return res.status(400).json({ status: 'fail', message: 'Invalid ID' });

    const result = await db.query(
      `SELECT
         a.*,
         dep.name AS department_name,
         doc.first_name || ' ' || doc.last_name AS doctor_name
       FROM appointments a
       LEFT JOIN departments dep ON dep.id = a.department_id
       LEFT JOIN doctors doc ON doc.id = a.doctor_id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Appointment not found' });
    }

    return res.status(200).json({
      status: 'success',
      data: { appointment: result.rows[0] },
    });
  } catch (error) {
    console.error('❌ Error in getAppointmentById:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  PATCH /api/admin/appointments/:id/status
//  Body: { status: 'confirmed' | 'completed' | 'cancelled' | 'pending' }
// ══════════════════════════════════════════════════════════════════════════════
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (isNaN(id)) return res.status(400).json({ status: 'fail', message: 'Invalid ID' });

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        status: 'fail',
        message: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const result = await db.query(
      `UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, full_name, status, updated_at`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Appointment not found' });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Appointment status updated',
      data: { appointment: result.rows[0] },
    });
  } catch (error) {
    console.error('❌ Error in updateAppointmentStatus:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  PUT /api/admin/appointments/:id  — full update by admin
// ══════════════════════════════════════════════════════════════════════════════
export const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(id)) return res.status(400).json({ status: 'fail', message: 'Invalid ID' });

    const {
      full_name,
      phone_number,
      email,
      preferred_date,
      preferred_time,
      doctor_id,
      department_id,
      reason_for_visit,
      additional_notes,
      status,
    } = req.body;

    const result = await db.query(
      `UPDATE appointments SET
         full_name = COALESCE($1, full_name),
         phone_number = COALESCE($2, phone_number),
         email = COALESCE($3, email),
         preferred_date = COALESCE($4, preferred_date),
         preferred_time = COALESCE($5, preferred_time),
         doctor_id = COALESCE($6, doctor_id),
         department_id = COALESCE($7, department_id),
         reason_for_visit = COALESCE($8, reason_for_visit),
         additional_notes = COALESCE($9, additional_notes),
         status = COALESCE($10, status),
         updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [
        full_name, phone_number, email, preferred_date, preferred_time,
        doctor_id, department_id, reason_for_visit, additional_notes, status, id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Appointment not found' });
    }

    return res.status(200).json({
      status: 'success',
      data: { appointment: result.rows[0] },
    });
  } catch (error) {
    console.error('❌ Error in updateAppointment:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  DELETE /api/admin/appointments/:id
// ══════════════════════════════════════════════════════════════════════════════
export const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(id)) return res.status(400).json({ status: 'fail', message: 'Invalid ID' });

    const result = await db.query(
      'DELETE FROM appointments WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Appointment not found' });
    }

    return res.status(200).json({ status: 'success', message: 'Appointment deleted' });
  } catch (error) {
    console.error('❌ Error in deleteAppointment:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};