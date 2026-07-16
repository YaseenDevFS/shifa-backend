// 1. استيراد الـ db كـ Default بشياكة من غير أقواس
import db from '../config/db.js';

export const getAllDepartments = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, slug, description, icon_name, long_description FROM departments ORDER BY name ASC'
    );

    return res.status(200).json({
      status: 'success',
      results: result.rows.length,
      data: { departments: result.rows }
    });
  } catch (error) {
    console.error('❌ Error in getAllDepartments:', error);
    return res.status(500).json({ status: 'error', message: 'مشكلة في السيرفر' });
  }
};

export const getDepartmentsBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    // التأكد من أن الاستعلام يرجع صفاً واحداً فقط
    const result = await db.query('SELECT * FROM departments WHERE slug = $1', [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Not found' });
    }
    const department = result.rows[0];
    const servicesResult = await db.query(
      'SELECT * FROM services WHERE department_id = $1', 
      [department.id]
    );

    res.status(200).json({
      status: "success",
      data: { department: result.rows[0], services: servicesResult.rows } // إرجاع كائن واحد فقط
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

