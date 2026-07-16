import db from '../config/db.js';

const getAllFuture = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM futures ORDER BY future_id ASC ')
        return res.status(200).json({
            status: 'success',
            results: result.rows.length,
            data: { futures: result.rows }
        }
        )
    } catch (error) {
        console.error(' Error in getAllFuture:', error);
        return res.status(500).json({ status: 'error', message: 'error in the server' });
    }
}

export default getAllFuture