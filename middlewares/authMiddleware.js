import jwt from 'jsonwebtoken';
import db from '../config/db.js';

// ══════════════════════════════════════════════════════════════════════════════
//  Protect middleware — verifies JWT and attaches admin to req
// ══════════════════════════════════════════════════════════════════════════════
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    console.log('🔒 Auth header:', authHeader ? 'Present' : 'Missing');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No Bearer token found');
      return res.status(401).json({
        status: 'fail',
        message: 'No token provided. Please log in.',
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔑 Token received (first 30 chars):', token.substring(0, 30) + '...');

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key-change-this-in-production');
      console.log('✅ Token verified for:', decoded.email);
    } catch (err) {
      console.log('❌ Token verification failed:', err.name);
      const message =
        err.name === 'TokenExpiredError'
          ? 'Your session has expired. Please log in again.'
          : 'Invalid token. Please log in.';
      return res.status(401).json({ status: 'fail', message });
    }

    // Verify admin still exists and is active
    const result = await db.query(
      'SELECT id, email, role, is_active FROM admins WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      console.log('❌ Admin not found in database:', decoded.id);
      return res.status(401).json({
        status: 'fail',
        message: 'Admin account not found.',
      });
    }

    if (!result.rows[0].is_active) {
      console.log('❌ Admin account deactivated:', decoded.email);
      return res.status(401).json({
        status: 'fail',
        message: 'Admin account is deactivated.',
      });
    }

    console.log('✅ Admin authenticated:', result.rows[0].email);
    req.admin = result.rows[0];
    next();
  } catch (error) {
    console.error('❌ Error in protect middleware:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  restrictTo(...roles) — role-based access
// ══════════════════════════════════════════════════════════════════════════════
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    console.log('🔐 Role check:', req.admin?.role, 'Required:', roles);
    if (!req.admin || !roles.includes(req.admin.role)) {
      console.log('❌ Role check failed');
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action.',
      });
    }
    console.log('✅ Role check passed');
    next();
  };
};