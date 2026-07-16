import db from '../config/db.js';

const SETTINGS_TABLE = 'site_settings';
const LOGO_KEY = 'site_logo';

const ensureSettingsTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ${SETTINGS_TABLE} (
      id SERIAL PRIMARY KEY,
      key VARCHAR(100) UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

export const getSiteLogo = async (req, res) => {
  try {
    await ensureSettingsTable();

    const result = await db.query(
      `SELECT value FROM ${SETTINGS_TABLE} WHERE key = $1 LIMIT 1`,
      [LOGO_KEY]
    );

    return res.json({
      status: 'success',
      data: {
        logo: result.rows[0]?.value || null,
      },
    });
  } catch (error) {
    console.error('Error fetching site logo:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch site logo',
    });
  }
};

export const updateSiteLogo = async (req, res) => {
  try {
    const { logo } = req.body || {};

    if (!logo || typeof logo !== 'string' || !logo.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Logo is required',
      });
    }

    await ensureSettingsTable();

    const result = await db.query(
      `INSERT INTO ${SETTINGS_TABLE} (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
       RETURNING value`,
      [LOGO_KEY, logo]
    );

    return res.json({
      status: 'success',
      message: 'Logo updated successfully',
      data: {
        logo: result.rows[0]?.value || logo,
      },
    });
  } catch (error) {
    console.error('Error updating site logo:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update site logo',
    });
  }
};
