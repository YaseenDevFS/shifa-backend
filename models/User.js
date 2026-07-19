import db from '../config/db.js';
import bcrypt from 'bcryptjs';

class User {
  // البحث عن مستخدم بواسطة البريد الإلكتروني
  static async findByEmail(email) {
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    return result.rows[0] || null;
  }

  // البحث عن مستخدم بواسطة المعرف
  static async findById(id) {
    const result = await db.query(
      'SELECT id, full_name, email, role, avatar_url, is_active, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  // إنشاء مستخدم جديد
  static async create(userData) {
    const { full_name, email, password, role = 'user', phone } = userData;
    
    // تشفير كلمة المرور
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, phone, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, full_name, email, role, phone, is_active, created_at`,
      [full_name, email.toLowerCase(), password_hash, role, phone || null, true]
    );
    
    return result.rows[0];
  }

  // التحقق من كلمة المرور
  static async verifyPassword(user, password) {
    return await bcrypt.compare(password, user.password_hash);
  }

  // تحديث آخر تسجيل دخول
  static async updateLastLogin(userId) {
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [userId]
    );
  }

  // تغيير كلمة المرور
  static async changePassword(userId, newPassword) {
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(newPassword, salt);
    
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [password_hash, userId]
    );
  }

  // تحديث بيانات المستخدم
  static async update(userId, data) {
    const { full_name, phone, avatar_url } = data;
    
    const result = await db.query(
      `UPDATE users 
       SET full_name = COALESCE($1, full_name),
           phone = COALESCE($2, phone),
           avatar_url = COALESCE($3, avatar_url),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, full_name, email, role, phone, avatar_url, is_active`,
      [full_name, phone, avatar_url, userId]
    );
    
    return result.rows[0];
  }
}

export default User;