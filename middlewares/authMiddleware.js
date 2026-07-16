import jwt from 'jsonwebtoken';
import db from '../config/db.js';

// ══════════════════════════════════════════════════════════════════════════════
//  Protect middleware — verifies JWT and attaches admin to req
// ══════════════════════════════════════════════════════════════════════════════
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'fail',
        message: 'No token provided. Please log in.',
      });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
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

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({
        status: 'fail',
        message: 'Admin account not found or deactivated.',
      });
    }

    req.admin = result.rows[0];
    next();
  } catch (error) {
    console.error('❌ Error in protect middleware:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  restrictTo(...roles) — role-based access
//  Usage: router.delete('/:id', protect, restrictTo('super_admin'), deleteAdmin)
// ══════════════════════════════════════════════════════════════════════════════
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action.',
      });
    }
    next();
  };
};