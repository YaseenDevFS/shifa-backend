// controllers/authController.js
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import bcrypt from 'bcryptjs';

// ══════════════════════════════════════════════════════════════════════════════
//  تسجيل الدخول
// ══════════════════════════════════════════════════════════════════════════════
export const login = async (req, res) => {
  try {
    console.log('📝 Login attempt:', req.body.email);

    const { email, password } = req.body;

    // 1. التحقق من وجود البيانات
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        status: 'fail',
        message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور'
      });
    }

    // 2. البحث عن المستخدم
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found:', email);
      return res.status(401).json({
        status: 'fail',
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    const user = result.rows[0];
    console.log('✅ User found:', user.email);

    // 3. التحقق من كلمة المرور
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({
        status: 'fail',
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    // 4. التحقق من أن الحساب نشط
    if (!user.is_active) {
      console.log('❌ Inactive account:', email);
      return res.status(401).json({
        status: 'fail',
        message: 'الحساب غير نشط. يرجى التواصل مع الدعم.'
      });
    }

    // 5. إنشاء التوكن
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    console.log('✅ Login successful:', email);

    // 6. تحديث آخر تسجيل دخول
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // 7. إرسال الرد
    res.status(200).json({
      status: 'success',
      token,
      data: {
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          avatar_url: user.avatar_url,
          is_active: user.is_active
        }
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'خطأ في السيرفر'
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  تسجيل مستخدم جديد
// ══════════════════════════════════════════════════════════════════════════════
export const register = async (req, res) => {
  try {
    const { full_name, email, password, phone } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'الاسم والبريد الإلكتروني وكلمة المرور مطلوبة'
      });
    }

    // التحقق من وجود المستخدم
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'البريد الإلكتروني مستخدم بالفعل'
      });
    }

    // تشفير كلمة المرور
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    // إنشاء المستخدم
    const result = await db.query(
      `INSERT INTO users (full_name, email, password_hash, phone, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, full_name, email, role, phone, is_active, created_at`,
      [full_name, email.toLowerCase(), password_hash, phone || null, 'user', true]
    );

    const user = result.rows[0];

    // إنشاء التوكن
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user
      }
    });

  } catch (error) {
    console.error('❌ Register error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'خطأ في السيرفر'
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  الحصول على بيانات المستخدم الحالي
// ══════════════════════════════════════════════════════════════════════════════
export const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'fail',
        message: 'غير مصرح'
      });
    }

    const result = await db.query(
      'SELECT id, full_name, email, role, phone, avatar_url, is_active, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'المستخدم غير موجود'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: result.rows[0]
      }
    });

  } catch (error) {
    console.error('❌ GetMe error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'خطأ في السيرفر'
    });
  }
};

export const logout = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'تم تسجيل الخروج بنجاح'
  });
};

export const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

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

    // الحصول على المستخدم
    const result = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
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
      [password_hash, req.user.id]
    );

    res.status(200).json({
      status: 'success',
      message: 'تم تغيير كلمة المرور بنجاح'
    });

  } catch (error) {
    console.error('❌ ChangePassword error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'خطأ في السيرفر'
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { full_name, phone, avatar_url } = req.body;

    const result = await db.query(
      `UPDATE users 
       SET full_name = COALESCE($1, full_name),
           phone = COALESCE($2, phone),
           avatar_url = COALESCE($3, avatar_url),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, full_name, email, role, phone, avatar_url, is_active`,
      [full_name, phone, avatar_url, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'المستخدم غير موجود'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: result.rows[0]
      }
    });

  } catch (error) {
    console.error('❌ UpdateProfile error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'خطأ في السيرفر'
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, full_name, email, role, phone, is_active, created_at FROM users ORDER BY created_at DESC'
    );

    res.status(200).json({
      status: 'success',
      results: result.rows.length,
      data: {
        users: result.rows
      }
    });

  } catch (error) {
    console.error('❌ GetAllUsers error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'خطأ في السيرفر'
    });
  }
};