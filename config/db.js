import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.on('connect', () => {
  console.log('⚡ DB connected successfully!');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected DB error:', err.message);
});

// تريكة السنيور: بنصّدر الـ object اللي جواه دالة الـ query كـ Default
const db = {
  query: (text, params) => pool.query(text, params),
};

export default db;