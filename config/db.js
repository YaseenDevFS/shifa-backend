import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// استخدام DATABASE_URL من متغيرات البيئة
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // مطلوب لـ Neon
  },
  // إعدادات إضافية لتحسين الأداء
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('⚡ Connected to Neon PostgreSQL successfully!');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected DB error:', err.message);
});

// اختبار الاتصال عند بدء التشغيل
const testConnection = async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection verified');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
};

testConnection();

const db = {
  query: (text, params) => pool.query(text, params),
  pool: pool,
};

export default db;