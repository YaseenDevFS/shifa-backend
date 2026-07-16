import db from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ══════════════════════════════════════════════════════════════════════════════
//  POST /api/admin/auth/login
// ══════════════════════════════════════════════════════════════════════════════
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Email and password are required',
      });
    }

    // Find admin by email
    const result = await db.query(
      'SELECT * FROM admins WHERE email = $1 AND is_active = true',
      [email.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid credentials',
      });
    }

    const admin = result.rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid credentials',
      });
    }

    // Update last login
    await db.query(
      'UPDATE admins SET last_login = NOW() WHERE id = $1',
      [admin.id]
    );

    // Sign JWT
    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return res.status(200).json({
      status: 'success',
      token,
      data: {
        admin: {
          id: admin.id,
          full_name: admin.full_name,
          email: admin.email,
          role: admin.role,
          avatar_url: admin.avatar_url,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error in login:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/admin/auth/me  — get current admin profile
// ══════════════════════════════════════════════════════════════════════════════
export const getMe = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, full_name, email, role, avatar_url, last_login, created_at FROM admins WHERE id = $1',
      [req.admin.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Admin not found' });
    }

    return res.status(200).json({
      status: 'success',
      data: { admin: result.rows[0] },
    });
  } catch (error) {
    console.error('❌ Error in getMe:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  POST /api/admin/auth/change-password
// ══════════════════════════════════════════════════════════════════════════════
export const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        status: 'fail',
        message: 'current_password and new_password are required',
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        status: 'fail',
        message: 'New password must be at least 8 characters',
      });
    }

    const result = await db.query('SELECT password_hash FROM admins WHERE id = $1', [req.admin.id]);
    const admin = result.rows[0];

    const isMatch = await bcrypt.compare(current_password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ status: 'fail', message: 'Current password is incorrect' });
    }

    const hash = await bcrypt.hash(new_password, 12);
    await db.query('UPDATE admins SET password_hash = $1 WHERE id = $2', [hash, req.admin.id]);

    return res.status(200).json({ status: 'success', message: 'Password updated successfully' });
  } catch (error) {
    console.error('❌ Error in changePassword:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};