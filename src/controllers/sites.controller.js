const pool = require('../config/db');
const { getOwnedApplication, assertStatus, httpError } = require('../utils/access');
const { siteSchema, parse } = require('../utils/schemas');
const { writeAuditLog } = require('../utils/auditLog');

// Laravel resolves these values against its reference tables to show their names
const assertValidReferences = async (conn, { mukim, bp, bpk }) => {
  const [[mukimRow]] = await conn.execute('SELECT 1 FROM mukims WHERE mukim_no = ? AND status = 1', [mukim]);
  const [[bpRow]] = await conn.execute('SELECT 1 FROM b_p_s WHERE id = ? AND status = 1', [bp]);
  const [[bpkRow]] = bpk
    ? await conn.execute('SELECT 1 FROM b_p_k_s WHERE id = ? AND bp_id = ? AND status = 1', [bpk, bp])
    : [[true]];
  if (!mukimRow || !bpRow || !bpkRow) {
    throw httpError(400, 'INVALID_REFERENCE', 'Mukim, BP atau BPK tidak sah. Sila pilih semula.');
  }
};

exports.createSite = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { application_id, mukim, bp, bpk, luas, lot, lembaran, kategori_tanah, status_tanah, google_lat } = parse(siteSchema, req.body);

    await conn.beginTransaction();
    const application = await getOwnedApplication(conn, application_id, req.user, { lock: true });
    assertStatus(application, ['RECORDED']);

    const [existing] = await conn.execute('SELECT site_id FROM sites WHERE application_id = ? LIMIT 1', [application_id]);
    if (existing.length > 0) {
      throw httpError(422, 'DUPLICATE_SITE', 'Tapak bagi permohonan ini sudah didaftarkan.');
    }

    await assertValidReferences(conn, { mukim, bp, bpk });

    // Insert into sites
    const [result] = await conn.execute(
      `INSERT INTO sites (application_id, mukim, bp, bpk, luas, lot, lembaran, kategori_tanah, status_tanah, google_lat, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'REGISTERED', NOW(), NOW())`,
      [application_id, mukim, bp, bpk || null, luas, lot, lembaran, kategori_tanah, status_tanah, google_lat ?? null]
    );

    await writeAuditLog(conn, {
      applicationId: application_id,
      userId: req.user.user_id,
      action: 'SITE_REGISTERED',
      previousStatus: application.status,
      newStatus: application.status,
      remarks: `Officer registered Site Information (Lot: ${lot}).`
    });

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
    await getOwnedApplication(pool, application_id, req.user);
    const [rows] = await pool.execute('SELECT * FROM sites WHERE application_id = ?', [application_id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Record not found.', code: 'NOT_FOUND' });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};
