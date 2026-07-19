import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// إنشاء توكن JWT
const signToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// إرسال الرد مع التوكن
const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user.id);
  
  // إزالة كلمة المرور من الرد
  const userData = { ...user };
  delete userData.password_hash;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: userData
    }
  });
};

// ============================================
// تسجيل الدخول
// ============================================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // التحقق من وجود البريد وكلمة المرور
    if (!email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور'
      });
    }

    // البحث عن المستخدم
    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.status(401).json({
        status: 'fail',
        message: 'بريد إلكتروني أو كلمة مرور غير صحيحة'
      });
    }

    // التحقق من أن الحساب نشط
    if (!user.is_active) {
      return res.status(401).json({
        status: 'fail',
        message: 'الحساب غير نشط. يرجى التواصل مع الدعم.'
      });
    }

    // التحقق من كلمة المرور
    const isPasswordValid = await User.verifyPassword(user, password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'fail',
        message: 'بريد إلكتروني أو كلمة مرور غير صحيحة'
      });
    }

    // تحديث آخر تسجيل دخول
    await User.updateLastLogin(user.id);

    // إرسال الرد
    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'خطأ في السيرفر'
    });
  }
};

// ============================================
// تسجيل مستخدم جديد
// ============================================
export const register = async (req, res) => {
  try {
    const { full_name, email, password, phone, role = 'user' } = req.body;

    // التحقق من وجود البيانات المطلوبة
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
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        status: 'fail',
        message: 'البريد الإلكتروني مستخدم بالفعل'
      });
    }

    // إنشاء المستخدم
    const newUser = await User.create({
      full_name,
      email,
      password,
      role,
      phone
    });

    sendTokenResponse(newUser, 201, res);
  } catch (error) {
    console.error('❌ Register error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'خطأ في السيرفر'
    });
  }
};

// ============================================
// الحصول على بيانات المستخدم الحالي
// ============================================
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'المستخدم غير موجود'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    console.error('❌ GetMe error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'خطأ في السيرفر'
    });
  }
};

// ============================================
// تحديث بيانات المستخدم
// ============================================
export const updateProfile = async (req, res) => {
  try {
    const { full_name, phone, avatar_url } = req.body;
    
    const updatedUser = await User.update(req.user.id, {
      full_name,
      phone,
      avatar_url
    });

    res.status(200).json({
      status: 'success',
      message: 'تم تحديث البيانات بنجاح',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('❌ UpdateProfile error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'خطأ في السيرفر'
    });
  }
};

// ============================================
// تغيير كلمة المرور
// ============================================
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

    // الحصول على المستخدم مع كلمة المرور
    const user = await User.findByEmail(req.user.email);
    
    // التحقق من كلمة المرور الحالية
    const isPasswordValid = await User.verifyPassword(user, current_password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'fail',
        message: 'كلمة المرور الحالية غير صحيحة'
      });
    }

    // تغيير كلمة المرور
    await User.changePassword(req.user.id, new_password);

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

// ============================================
// تسجيل الخروج
// ============================================
export const logout = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'تم تسجيل الخروج بنجاح'
  });
};

// ============================================
// الحصول على جميع المستخدمين (للمدير فقط)
// ============================================
export const getAllUsers = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, full_name, email, role, phone, is_active, last_login, created_at FROM users ORDER BY created_at DESC'
    );
    
    res.status(200).json({
      status: 'success',
      results: result.rows.length,
      data: { users: result.rows }
    });
  } catch (error) {
    console.error('❌ GetAllUsers error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'خطأ في السيرفر'
    });
  }
};