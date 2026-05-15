const pool = require('../config/db');

exports.syncOfflineData = async (req, res, next) => {
  try {
    const { records } = req.body;
    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Invalid payload.', code: 'VALIDATION_ERROR' });
    }

    const results = [];
    let synced = 0;
    let failed = 0;

    for (const record of records) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        const p = record.payload;
        let server_id = null;

        if (record.type === 'site') {
          const [insertRes] = await conn.execute(
            `INSERT INTO sites (application_id, mukim, bpk, luas, nofail, lot, kategori_tanah, status_tanah, lokasi) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [p.application_id, p.mukim, p.bpk, p.luas, p.nofail, p.lot, p.kategori_tanah, p.status_tanah, p.lokasi]
          );
          server_id = insertRes.insertId;
          await conn.execute(`UPDATE applications SET status = 'site_visit' WHERE application_id = ?`, [p.application_id]);
        } 
        else if (record.type === 'site_visit') {
          const [insertRes] = await conn.execute(
            `INSERT INTO site_visits (application_id, officer_id) VALUES (?, ?)`,
            [p.application_id, p.officer_id]
          );
          server_id = insertRes.insertId;
          if (p.action === 'submit') {
            await conn.execute(`UPDATE applications SET status = 'review' WHERE application_id = ?`, [p.application_id]);
          }
        } 
        else if (record.type === 'review') {
          const [insertRes] = await conn.execute(
            `INSERT INTO reviews (application_id, officer_id, review_content, recommendation, self_check_completed) VALUES (?, ?, ?, ?, ?)`,
            [p.application_id, p.officer_id, p.review_content, p.recommendation, p.self_check_completed]
          );
          server_id = insertRes.insertId;
          await conn.execute(`UPDATE applications SET status = 'verified' WHERE application_id = ?`, [p.application_id]);
        } 
        else {
          throw new Error('Unknown record type');
        }

        await conn.commit();
        synced++;
        results.push({ local_id: record.local_id, status: 'success', server_id });
      } catch (err) {
        await conn.rollback();
        failed++;
        results.push({ local_id: record.local_id, status: 'failed', server_id: null, error: err.message });
      } finally {
        conn.release();
      }
    }

    res.json({ synced, failed, results });
  } catch (error) {
    next(error);
  }
};
