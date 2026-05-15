const pool = require('../config/db');

exports.createSite = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { application_id, mukim, bpk, luas, lot, lembaran, kategori_tanah, status_tanah, google_lat } = req.body;
    
    // Insert into sites
    const [result] = await conn.execute(
      `INSERT INTO sites (application_id, mukim, bpk, luas, lot, lembaran, kategori_tanah, status_tanah, google_lat, status, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'REGISTERED', NOW(), NOW())`,
      [application_id, mukim, bpk, luas, lot, lembaran, kategori_tanah, status_tanah, google_lat]
    );

    // Note: application status remains 'RECORDED' after site registration
    // This allows the todo list to now route to 'register_site_visit'

    await conn.commit();
    res.status(201).json({
      message: 'Site berjaya didaftarkan. Langkah seterusnya ialah lawatan tapak.',
      site_id: result.insertId,
      application_status: 'RECORDED'
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

exports.getSiteByApplication = async (req, res, next) => {
  try {
    const { application_id } = req.params;
    const [rows] = await pool.execute('SELECT * FROM sites WHERE application_id = ?', [application_id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Record not found.', code: 'NOT_FOUND' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};

exports.updateSite = async (req, res, next) => {
  try {
    const { site_id } = req.params;
    const fields = req.body;
    
    const keys = Object.keys(fields);
    if (keys.length === 0) return res.status(400).json({ error: 'No fields to update.' });

    const setQuery = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => fields[k]);
    values.push(site_id);

    await pool.execute(`UPDATE sites SET ${setQuery} WHERE site_id = ?`, values);
    
    res.json({ message: 'Rekod tapak dikemaskini.', site_id: parseInt(site_id) });
  } catch (error) {
    next(error);
  }
};

exports.deleteSite = async (req, res, next) => {
  try {
    const { site_id } = req.params;
    await pool.execute('UPDATE sites SET is_active = 0 WHERE site_id = ?', [site_id]);
    res.json({ message: 'Rekod tapak dipadam.' });
  } catch (error) {
    next(error);
  }
};
