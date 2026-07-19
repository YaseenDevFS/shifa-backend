// config/db.js - نسخة مبسطة
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// تحقق من وجود DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in .env file!');
  console.log('Please add: DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const db = {
  query: (text, params) => pool.query(text, params),
  pool: pool,
};

// اختبار الاتصال
const testConnection = async () => {
  try {
    const result = await db.query('SELECT NOW()');
    console.log('✅ Database connected successfully at:', result.rows[0].now);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('⚠️  Please check your DATABASE_URL in .env file');
  }
};

testConnection();

export default db;