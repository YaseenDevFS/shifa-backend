// reset-admin.js
import bcrypt from 'bcryptjs';
import db from './config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const resetAdmin = async () => {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
    }
    
    // توليد تجزئة جديدة
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    console.log('📝 Email:', email);
    console.log('🔑 Password:', password);
    console.log('🔐 New Hash:', hash);
    
    // حذف المشرف القديم
    await db.query('DELETE FROM admins WHERE email = $1', [email]);
    
    // إضافة مشرف جديد
    const result = await db.query(
      `INSERT INTO admins (full_name, email, password_hash, role, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, email, role`,
      ['Super Admin', email, hash, 'super_admin', true]
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Admin created successfully!');
      console.log('📊 Data:', result.rows[0]);
      console.log('\n🔐 USE THESE CREDENTIALS:');
      console.log('   Email:', email);
      console.log('   Password:', password);
      console.log('   Hash:', hash);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

resetAdmin();
