import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import bcrypt from 'bcryptjs';

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN LOGIN - WITH FULL DEBUGGING
// ══════════════════════════════════════════════════════════════════════════════
export const login = async (req, res) => {
  try {
    console.log('========================================');
    console.log('📝 Admin Login Attempt');
    console.log('📧 Email:', req.body.email);
    console.log('🔑 Password length:', req.body.password?.length || 0);

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
    console.log('🔍 Looking for admin with email:', email.toLowerCase());
    const result = await db.query(
      'SELECT * FROM admins WHERE email = $1',
      [email.toLowerCase()]
    );

    console.log('📊 Query result rows:', result.rows.length);

    if (result.rows.length === 0) {
      console.log('❌ Admin NOT found in database');
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid email or password'
      });
    }

    const admin = result.rows[0];
    console.log('✅ Admin found in database');
    console.log('👤 Admin ID:', admin.id);
    console.log('👤 Admin Email:', admin.email);
    console.log('👤 Admin Role:', admin.role);
    console.log('👤 Admin Active:', admin.is_active);
    console.log('🔑 Stored hash (first 30 chars):', admin.password_hash?.substring(0, 30) + '...');

    // 3. Check password
    console.log('🔐 Comparing passwords...');
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    console.log('🔐 Password match:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid email or password'
      });
    }

    // 4. Check if account is active
    if (!admin.is_active) {
      console.log('❌ Inactive admin account');
      return res.status(401).json({
        status: 'fail',
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // 5. Generate JWT token
    console.log('🔑 Generating JWT token...');
    console.log('🔑 JWT_SECRET exists:', !!process.env.JWT_SECRET);
    
    const token = jwt.sign(
      { 
        id: admin.id, 
        email: admin.email, 
        role: admin.role 
      },
      process.env.JWT_SECRET || 'fallback-secret-key-change-this',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    console.log('✅ Token generated successfully');

    // 6. Update last login timestamp
    await db.query(
      'UPDATE admins SET last_login = NOW() WHERE id = $1',
      [admin.id]
    );

    // 7. Send response
    console.log('✅ Login successful for:', email);
    console.log('========================================');

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
    console.error('❌ Error stack:', error.stack);
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
    console.log('👤 Getting current admin');
    console.log('👤 req.admin:', req.admin);

    if (!req.admin) {
      console.log('❌ No admin in request');
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
      console.log('❌ Admin not found in database');
      return res.status(404).json({
        status: 'fail',
        message: 'Admin not found'
      });
    }

    console.log('✅ Admin data retrieved');
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

// ══════════════════════════════════════════════════════════════════════════════
//  CREATE TEST ADMIN (Development Only)
// ══════════════════════════════════════════════════════════════════════════════
export const createTestAdmin = async (req, res) => {
  try {
    const { email = 'admin@shifa.com', password = 'admin123', full_name = 'Super Admin' } = req.body;
    
    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);
    
    // Check if admin exists
    const existing = await db.query(
      'SELECT id FROM admins WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (existing.rows.length > 0) {
      // Update existing admin
      await db.query(
        'UPDATE admins SET password_hash = $1, is_active = true, updated_at = NOW() WHERE email = $2',
        [password_hash, email.toLowerCase()]
      );
      return res.status(200).json({
        status: 'success',
        message: `Admin ${email} updated with new password`
      });
    }
    
    // Create new admin
    await db.query(
      `INSERT INTO admins (full_name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5)`,
      [full_name, email.toLowerCase(), password_hash, 'super_admin', true]
    );
    
    res.status(201).json({
      status: 'success',
      message: `Admin ${email} created with password: ${password}`
    });
  } catch (error) {
    console.error('❌ Create test admin error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create test admin'
    });
  }
};