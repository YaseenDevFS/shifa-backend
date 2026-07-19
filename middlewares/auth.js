import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// التحقق من التوكن
export const protect = async (req, res, next) => {
  try {
    let token;

    // استخراج التوكن من الهيدر
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'غير مصرح لك. يرجى تسجيل الدخول.'
      });
    }

    // التحقق من التوكن
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // البحث عن المستخدم
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        status: 'fail',
        message: 'المستخدم غير موجود'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        status: 'fail',
        message: 'الحساب غير نشط. يرجى التواصل مع الدعم.'
      });
    }

    // إضافة المستخدم إلى الطلب
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'fail',
        message: 'توكن غير صالح'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'fail',
        message: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.'
      });
    }
    console.error('❌ Auth middleware error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'خطأ في السيرفر'
    });
  }
};

// تقييد الوصول حسب الدور
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'ليس لديك صلاحية للقيام بهذا الإجراء'
      });
    }
    next();
  };
};

// التحقق من أن المستخدم مدير
export const isAdmin = restrictTo('admin', 'super_admin');

// التحقق من أن المستخدم مستخدم عادي
export const isUser = restrictTo('user', 'admin', 'super_admin');