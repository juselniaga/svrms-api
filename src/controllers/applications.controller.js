const pool = require('../config/db');

exports.getApplicationById = async (req, res, next) => {
  try {
    const { application_id } = req.params;

    const [rows] = await pool.execute(
      `SELECT
         a.application_id,
         a.reference_no,
         a.no_fail,
         a.tajuk,
         a.lokasi,
         d.name        AS developer_name,
         d.address1,
         d.address2,
         d.poskod,
         d.city,
         d.state
       FROM applications a
       LEFT JOIN developers d ON a.developer_id = d.developer_id
       WHERE a.application_id = ?
         AND a.is_active = 1`,
      [application_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Application not found.', code: 'NOT_FOUND' });
    }

    const row = rows[0];
    const addressParts = [row.address1, row.address2, row.poskod && row.city ? `${row.poskod} ${row.city}` : (row.poskod || row.city), row.state]
      .filter(Boolean);

    res.json({
      application_id: row.application_id,
      reference_no:   row.reference_no,
      no_fail:        row.no_fail,
      tajuk:          row.tajuk,
      lokasi:         row.lokasi,
      developer_name: row.developer_name,
      developer_address: addressParts.join(', '),
    });
  } catch (error) {
    next(error);
  }
};
