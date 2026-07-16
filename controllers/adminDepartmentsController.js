import db from '../config/db.js';

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/admin/departments
// ══════════════════════════════════════════════════════════════════════════════
export const getAllDepartments = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        dep.*,
        COUNT(DISTINCT d.id) AS doctor_count,
        COUNT(DISTINCT a.id) AS total_appointments
      FROM departments dep
      LEFT JOIN doctors d ON d.department_id = dep.id
      LEFT JOIN appointments a ON a.department_id = dep.id
      GROUP BY dep.id
      ORDER BY dep.name ASC
    `);

    return res.status(200).json({
      status: 'success',
      results: result.rows.length,
      data: { departments: result.rows },
    });
  } catch (error) {
    console.error('❌ Error in admin getAllDepartments:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/admin/departments/:id
// ══════════════════════════════════════════════════════════════════════════════
export const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(id)) return res.status(400).json({ status: 'fail', message: 'Invalid ID' });

    const [dept, services, doctors] = await Promise.all([
      db.query('SELECT * FROM departments WHERE id = $1', [id]),
      db.query('SELECT * FROM services WHERE department_id = $1 ORDER BY id', [id]),
      db.query(
        'SELECT id, first_name, last_name, specialty, image_url, is_available FROM doctors WHERE department_id = $1 ORDER BY first_name',
        [id]
      ),
    ]);

    if (dept.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Department not found' });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        department: dept.rows[0],
        services: services.rows,
        doctors: doctors.rows,
      },
    });
  } catch (error) {
    console.error('❌ Error in getDepartmentById:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  POST /api/admin/departments
// ══════════════════════════════════════════════════════════════════════════════
export const createDepartment = async (req, res) => {
  try {
    const { name, slug, description, icon_name, long_description } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        status: 'fail',
        message: 'name and slug are required',
      });
    }

    // Check slug uniqueness
    const existing = await db.query('SELECT id FROM departments WHERE slug = $1', [slug]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ status: 'fail', message: 'Slug already exists' });
    }

    const result = await db.query(
      `INSERT INTO departments (name, slug, description, icon_name, long_description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name.trim(), slug.trim(), description || null, icon_name || null, long_description || null]
    );

    return res.status(201).json({
      status: 'success',
      message: 'Department created successfully',
      data: { department: result.rows[0] },
    });
  } catch (error) {
    console.error('❌ Error in createDepartment:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  PUT /api/admin/departments/:id
// ══════════════════════════════════════════════════════════════════════════════
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(id)) return res.status(400).json({ status: 'fail', message: 'Invalid ID' });

    const { name, slug, description, icon_name, long_description } = req.body;

    // If slug is changing, ensure uniqueness
    if (slug) {
      const existing = await db.query(
        'SELECT id FROM departments WHERE slug = $1 AND id != $2',
        [slug, id]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ status: 'fail', message: 'Slug already in use' });
      }
    }

    const result = await db.query(
      `UPDATE departments SET
         name = COALESCE($1, name),
         slug = COALESCE($2, slug),
         description = COALESCE($3, description),
         icon_name = COALESCE($4, icon_name),
         long_description = COALESCE($5, long_description),
         updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [name, slug, description, icon_name, long_description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Department not found' });
    }

    return res.status(200).json({
      status: 'success',
      data: { department: result.rows[0] },
    });
  } catch (error) {
    console.error('❌ Error in updateDepartment:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  DELETE /api/admin/departments/:id
// ══════════════════════════════════════════════════════════════════════════════
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(id)) return res.status(400).json({ status: 'fail', message: 'Invalid ID' });

    // Check for doctors in this department
    const doctors = await db.query(
      'SELECT COUNT(*) AS count FROM doctors WHERE department_id = $1',
      [id]
    );

    if (parseInt(doctors.rows[0].count) > 0) {
      return res.status(409).json({
        status: 'fail',
        message: 'Cannot delete department with existing doctors. Reassign them first.',
      });
    }

    const result = await db.query(
      'DELETE FROM departments WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Department not found' });
    }

    return res.status(200).json({ status: 'success', message: 'Department deleted successfully' });
  } catch (error) {
    console.error('❌ Error in deleteDepartment:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};