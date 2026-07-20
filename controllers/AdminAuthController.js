import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import bcrypt from 'bcryptjs';

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN LOGIN
// ══════════════════════════════════════════════════════════════════════════════
export const login = async (req, res) => {
  try {
    console.log('📝 Admin login attempt for:', req.body.email);

    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        status: 'fail',
        message: 'Email and password are required'
      });
    }

    // 2. Find admin by email
    const result = await db.query(
      'SELECT * FROM admins WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      console.log('❌ Admin not found:', email);
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid email or password'
      });
    }

    const admin = result.rows[0];
    console.log('✅ Admin found:', admin.email);

    // 3. Check password
    console.log('🔑 Checking password...');
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    console.log('🔑 Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid email or password'
      });
    }

    // 4. Check if account is active
    if (!admin.is_active) {
      console.log('❌ Inactive admin account:', email);
      return res.status(401).json({
        status: 'fail',
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // 5. Generate JWT token
    const token = jwt.sign(
      { 
        id: admin.id, 
        email: admin.email, 
        role: admin.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    console.log('✅ Login successful for:', email);

    // 6. Update last login timestamp
    await db.query(
      'UPDATE admins SET last_login = NOW() WHERE id = $1',
      [admin.id]
    );

    // 7. Send response
    res.status(200).json({
      status: 'success',
      token,
      data: {
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
          full_name: admin.full_name,
          avatar_url: admin.avatar_url,
          is_active: admin.is_active
        }
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  GET CURRENT ADMIN
// ══════════════════════════════════════════════════════════════════════════════
export const getMe = async (req, res) => {
  try {
    console.log('👤 Getting current admin:', req.admin?.email);

    if (!req.admin) {
      return res.status(401).json({
        status: 'fail',
        message: 'Not authenticated'
      });
    }

    const result = await db.query(
      'SELECT id, full_name, email, role, avatar_url, is_active, created_at, last_login FROM admins WHERE id = $1',
      [req.admin.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'Admin not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        admin: result.rows[0]
      }
    });

  } catch (error) {
    console.error('❌ GetMe error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  CHANGE PASSWORD
// ══════════════════════════════════════════════════════════════════════════════
export const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Current password and new password are required'
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        status: 'fail',
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get admin with password
    const result = await db.query(
      'SELECT password_hash FROM admins WHERE id = $1',
      [req.admin.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'Admin not found'
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      current_password,
      result.rows[0].password_hash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'fail',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(new_password, salt);

    // Update password
    await db.query(
      'UPDATE admins SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [password_hash, req.admin.id]
    );

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('❌ ChangePassword error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};