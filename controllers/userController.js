// controllers/userController.js
import db from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ══════════════════════════════════════════════════════════════════════════════
//  USER CONTROLLER - إدارة المستخدمين
// ══════════════════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────────────────
//  الحصول على جميع المستخدمين (للمدير فقط)
// ──────────────────────────────────────────────────────────────────────────────
export const getAllUsers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        id, 
        full_name, 
        email, 
        phone, 
        role, 
        is_active, 
        avatar_url,
        last_login,
        created_at,
        updated_at
       FROM users 
       ORDER BY created_at DESC`
    );

    return res.status(200).json({
      status: 'success',
      results: result.rows.length,
      data: {
        users: result.rows
      }
    });
  } catch (error) {
    console.error('❌ Error in getAllUsers:', error);
    return res.status(500).json({
      status: 'error',
      message: 'خطأ في السيرفر'
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
//  الحصول على مستخدم واحد بواسطة ID
// ──────────────────────────────────────────────────────────────────────────────
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'معرف المستخدم غير صالح'
      });
    }

    const result = await db.query(
      `SELECT 
        id, 
        full_name, 
        email, 
        phone, 
        role, 
        is_active, 
        avatar_url,
        last_login,
        created_at,
        updated_at
       FROM users 
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'المستخدم غير موجود'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        user: result.rows[0]
      }
    });
  } catch (error) {
    console.error('❌ Error in getUserById:', error);
    return res.status(500).json({
      status: 'error',
      message: 'خطأ في السيرفر'
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
//  إنشاء مستخدم جديد (للمدير فقط)
// ──────────────────────────────────────────────────────────────────────────────
export const createUser = async (req, res) => {
  try {
    const { full_name, email, password, phone, role = 'user', is_active = true } = req.body;

    // التحقق من البيانات المطلوبة
    if (!full_name || !email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'الاسم الكامل، البريد الإلكتروني وكلمة المرور مطلوبة'
      });
    }

    // التحقق من قوة كلمة المرور
    if (password.length < 6) {
      return res.status(400).json({
        status: 'fail',
        message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
      });
    }

    // التحقق من أن البريد غير مستخدم
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        status: 'fail',
        message: 'البريد الإلكتروني مستخدم بالفعل'
      });
    }

    // تشفير كلمة المرور
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    // إنشاء المستخدم
    const result = await db.query(
      `INSERT INTO users (
        full_name, 
        email, 
        password_hash, 
        phone, 
        role, 
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id, 
        full_name, 
        email, 
        phone, 
        role, 
        is_active, 
        avatar_url,
        created_at`,
      [full_name, email.toLowerCase(), password_hash, phone || null, role, is_active]
    );

    return res.status(201).json({
      status: 'success',
      message: 'تم إنشاء المستخدم بنجاح',
      data: {
        user: result.rows[0]
      }
    });
  } catch (error) {
    console.error('❌ Error in createUser:', error);
    return res.status(500).json({
      status: 'error',
      message: 'خطأ في السيرفر'
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
//  تحديث مستخدم (للمدير فقط)
// ──────────────────────────────────────────────────────────────────────────────
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, role, is_active, avatar_url } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'معرف المستخدم غير صالح'
      });
    }

    // التحقق من وجود المستخدم
    const userCheck = await db.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'المستخدم غير موجود'
      });
    }

    // تحديث المستخدم
    const result = await db.query(
      `UPDATE users 
       SET 
         full_name = COALESCE($1, full_name),
         phone = COALESCE($2, phone),
         role = COALESCE($3, role),
         is_active = COALESCE($4, is_active),
         avatar_url = COALESCE($5, avatar_url),
         updated_at = NOW()
       WHERE id = $6
       RETURNING 
         id, 
         full_name, 
         email, 
         phone, 
         role, 
         is_active, 
         avatar_url,
         updated_at`,
      [full_name, phone, role, is_active, avatar_url, id]
    );

    return res.status(200).json({
      status: 'success',
      message: 'تم تحديث المستخدم بنجاح',
      data: {
        user: result.rows[0]
      }
    });
  } catch (error) {
    console.error('❌ Error in updateUser:', error);
    return res.status(500).json({
      status: 'error',
      message: 'خطأ في السيرفر'
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
//  حذف مستخدم (للمدير فقط)
// ──────────────────────────────────────────────────────────────────────────────
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'معرف المستخدم غير صالح'
      });
    }

    // التحقق من وجود المستخدم
    const userCheck = await db.query(
      'SELECT id, email FROM users WHERE id = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'المستخدم غير موجود'
      });
    }

    // لا تسمح بحذف المدير الرئيسي
    if (userCheck.rows[0].email === 'admin@shifa.com') {
      return res.status(403).json({
        status: 'fail',
        message: 'لا يمكن حذف المدير الرئيسي'
      });
    }

    // حذف المستخدم
    await db.query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );

    return res.status(200).json({
      status: 'success',
      message: 'تم حذف المستخدم بنجاح'
    });
  } catch (error) {
    console.error('❌ Error in deleteUser:', error);
    return res.status(500).json({
      status: 'error',
      message: 'خطأ في السيرفر'
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
//  تحديث كلمة مرور المستخدم (للمدير فقط)
// ──────────────────────────────────────────────────────────────────────────────
export const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'معرف المستخدم غير صالح'
      });
    }

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({
        status: 'fail',
        message: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'
      });
    }

    // التحقق من وجود المستخدم
    const userCheck = await db.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'المستخدم غير موجود'
      });
    }

    // تشفير كلمة المرور الجديدة
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(new_password, salt);

    // تحديث كلمة المرور
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [password_hash, id]
    );

    return res.status(200).json({
      status: 'success',
      message: 'تم إعادة تعيين كلمة المرور بنجاح'
    });
  } catch (error) {
    console.error('❌ Error in resetUserPassword:', error);
    return res.status(500).json({
      status: 'error',
      message: 'خطأ في السيرفر'
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
//  تغيير كلمة المرور (للمستخدم نفسه)
// ──────────────────────────────────────────────────────────────────────────────
export const changeMyPassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    if (!current_password || !new_password) {
      return res.status(400).json({
        status: 'fail',
        message: 'كلمة المرور الحالية والجديدة مطلوبة'
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        status: 'fail',
        message: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'
      });
    }

    // الحصول على المستخدم مع كلمة المرور
    const result = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'المستخدم غير موجود'
      });
    }

    // التحقق من كلمة المرور الحالية
    const isPasswordValid = await bcrypt.compare(
      current_password,
      result.rows[0].password_hash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'fail',
        message: 'كلمة المرور الحالية غير صحيحة'
      });
    }

    // تشفير كلمة المرور الجديدة
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(new_password, salt);

    // تحديث كلمة المرور
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [password_hash, userId]
    );

    return res.status(200).json({
      status: 'success',
      message: 'تم تغيير كلمة المرور بنجاح'
    });
  } catch (error) {
    console.error('❌ Error in changeMyPassword:', error);
    return res.status(500).json({
      status: 'error',
      message: 'خطأ في السيرفر'
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
//  تحديث الملف الشخصي (للمستخدم نفسه)
// ──────────────────────────────────────────────────────────────────────────────
export const updateMyProfile = async (req, res) => {
  try {
    const { full_name, phone, avatar_url } = req.body;
    const userId = req.user.id;

    const result = await db.query(
      `UPDATE users 
       SET 
         full_name = COALESCE($1, full_name),
         phone = COALESCE($2, phone),
         avatar_url = COALESCE($3, avatar_url),
         updated_at = NOW()
       WHERE id = $4
       RETURNING 
         id, 
         full_name, 
         email, 
         phone, 
         role, 
         is_active, 
         avatar_url,
         updated_at`,
      [full_name, phone, avatar_url, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'المستخدم غير موجود'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'تم تحديث الملف الشخصي بنجاح',
      data: {
        user: result.rows[0]
      }
    });
  } catch (error) {
    console.error('❌ Error in updateMyProfile:', error);
    return res.status(500).json({
      status: 'error',
      message: 'خطأ في السيرفر'
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
//  الحصول على الملف الشخصي (للمستخدم نفسه)
// ──────────────────────────────────────────────────────────────────────────────
export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT 
        id, 
        full_name, 
        email, 
        phone, 
        role, 
        is_active, 
        avatar_url,
        last_login,
        created_at,
        updated_at
       FROM users 
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'المستخدم غير موجود'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        user: result.rows[0]
      }
    });
  } catch (error) {
    console.error('❌ Error in getMyProfile:', error);
    return res.status(500).json({
      status: 'error',
      message: 'خطأ في السيرفر'
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
//  تفعيل/تعطيل المستخدم (للمدير فقط)
// ──────────────────────────────────────────────────────────────────────────────
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'معرف المستخدم غير صالح'
      });
    }

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        status: 'fail',
        message: 'is_active يجب أن تكون قيمة منطقية (true/false)'
      });
    }

    // التحقق من وجود المستخدم
    const userCheck = await db.query(
      'SELECT id, email FROM users WHERE id = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'المستخدم غير موجود'
      });
    }

    // لا تسمح بتعطيل المدير الرئيسي
    if (userCheck.rows[0].email === 'admin@shifa.com' && is_active === false) {
      return res.status(403).json({
        status: 'fail',
        message: 'لا يمكن تعطيل المدير الرئيسي'
      });
    }

    // تحديث حالة المستخدم
    const result = await db.query(
      `UPDATE users 
       SET is_active = $1, updated_at = NOW() 
       WHERE id = $2
       RETURNING id, full_name, email, is_active`,
      [is_active, id]
    );

    return res.status(200).json({
      status: 'success',
      message: is_active ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم',
      data: {
        user: result.rows[0]
      }
    });
  } catch (error) {
    console.error('❌ Error in toggleUserStatus:', error);
    return res.status(500).json({
      status: 'error',
      message: 'خطأ في السيرفر'
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
//  البحث عن المستخدمين (للمدير فقط)
// ──────────────────────────────────────────────────────────────────────────────
export const searchUsers = async (req, res) => {
  try {
    const { q, role, is_active, page = 1, limit = 20 } = req.query;

    const conditions = [];
    const params = [];
    let paramCount = 0;

    if (q && q.trim()) {
      paramCount++;
      params.push(`%${q.trim().toLowerCase()}%`);
      conditions.push(
        `(LOWER(full_name) LIKE $${paramCount} OR LOWER(email) LIKE $${paramCount})`
      );
    }

    if (role) {
      paramCount++;
      params.push(role);
      conditions.push(`role = $${paramCount}`);
    }

    if (is_active !== undefined && is_active !== '') {
      paramCount++;
      params.push(is_active === 'true');
      conditions.push(`is_active = $${paramCount}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // الحصول على العدد الإجمالي
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // الحصول على النتائج مع التصفح
    const offset = (parseInt(page) - 1) * parseInt(limit);
    paramCount++;
    params.push(parseInt(limit));
    paramCount++;
    params.push(offset);

    const result = await db.query(
      `SELECT 
        id, 
        full_name, 
        email, 
        phone, 
        role, 
        is_active, 
        avatar_url,
        last_login,
        created_at
       FROM users 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    return res.status(200).json({
      status: 'success',
      results: result.rows.length,
      total,
      page: parseInt(page),
      total_pages: Math.ceil(total / parseInt(limit)),
      data: {
        users: result.rows
      }
    });
  } catch (error) {
    console.error('❌ Error in searchUsers:', error);
    return res.status(500).json({
      status: 'error',
      message: 'خطأ في السيرفر'
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
//  إحصائيات المستخدمين (للمدير فقط)
// ──────────────────────────────────────────────────────────────────────────────
export const getUserStats = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        COUNT(*) AS total_users,
        COUNT(*) FILTER (WHERE role = 'admin' OR role = 'super_admin') AS total_admins,
        COUNT(*) FILTER (WHERE role = 'user') AS total_users_role,
        COUNT(*) FILTER (WHERE is_active = true) AS active_users,
        COUNT(*) FILTER (WHERE is_active = false) AS inactive_users,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS new_users_this_week,
        COUNT(*) FILTER (WHERE last_login >= NOW() - INTERVAL '24 hours') AS active_today
      FROM users
    `);

    return res.status(200).json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error in getUserStats:', error);
    return res.status(500).json({
      status: 'error',
      message: 'خطأ في السيرفر'
    });
  }
};