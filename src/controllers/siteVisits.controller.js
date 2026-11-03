const pool = require('../config/db');
const { setApplicationStatus } = require('../utils/applicationStatus');

const PHOTO_FIELDS = ['photos_north', 'photos_south', 'photo_east', 'photo_west'];

exports.createSiteVisit = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      application_id, officer_id, visit_date,
      finding_north, findings_south, findings_east, finding_west,
      activity, facility, entrance_way, parit, tree, topography,
      land_use_zone, density, recommend_road, anjakan, social_facility,
      location_data, action
    } = req.body;

    // Store 'photos/filename' (not the disk path) so Laravel's Storage::url() can resolve it
    const files = req.files || {};
    const photoValues = PHOTO_FIELDS.map((field) => {
      const relativePath = files[field]?.[0]?.relativePath;
      return relativePath ? JSON.stringify([relativePath]) : null;
    });

    const fieldValues = [
      visit_date,
      finding_north, findings_south, findings_east, finding_west,
      activity, facility, entrance_way, parit, tree, topography,
      land_use_zone, density, recommend_road, anjakan, social_facility,
      location_data
    ].map((value) => (value === undefined || value === '' ? null : value));

    const visit_status = action === 'submit' ? 'COMPLETED' : 'DRAFT';

    // An application has a single visit row: saving again updates it, as Laravel does
    const [existing] = await conn.execute(
      'SELECT site_visit_id FROM site_visits WHERE application_id = ? ORDER BY site_visit_id DESC LIMIT 1 FOR UPDATE',
      [application_id]
    );

    let site_visit_id;
    if (existing.length > 0) {
      site_visit_id = existing[0].site_visit_id;
      // Photos not re-uploaded keep their saved value
      await conn.execute(
        `UPDATE site_visits SET
          visit_date = ?,
          finding_north = ?, findings_south = ?, findings_east = ?, finding_west = ?,
          activity = ?, facility = ?, entrance_way = ?, parit = ?, tree = ?, topography = ?,
          land_use_zone = ?, density = ?, recommend_road = ?, anjakan = ?, social_facility = ?,
          location_data = ?, status = ?,
          photos_north = COALESCE(?, photos_north),
          photos_south = COALESCE(?, photos_south),
          photo_east = COALESCE(?, photo_east),
          photo_west = COALESCE(?, photo_west),
          updated_at = NOW()
        WHERE site_visit_id = ?`,
        [...fieldValues, visit_status, ...photoValues, site_visit_id]
      );
    } else {
      const [result] = await conn.execute(
        `INSERT INTO site_visits (
          visit_date,
          finding_north, findings_south, findings_east, finding_west,
          activity, facility, entrance_way, parit, tree, topography,
          land_use_zone, density, recommend_road, anjakan, social_facility,
          location_data, status,
          photos_north, photos_south, photo_east, photo_west,
          application_id, officer_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [...fieldValues, visit_status, ...photoValues, application_id, officer_id]
      );
      site_visit_id = result.insertId;
    }

    let application_status = 'RECORDED';
    if (action === 'submit') {
      application_status = 'SITE_VISIT_IN_PROGRESS';
      await setApplicationStatus(conn, application_id, application_status);
    }

    const [[savedPhotos]] = await conn.execute(
      `SELECT ${PHOTO_FIELDS.join(', ')} FROM site_visits WHERE site_visit_id = ?`,
      [site_visit_id]
    );

    await conn.commit();
    res.status(201).json({
      message: action === 'submit' ? 'Lawatan tapak berjaya dihantar. Sila lengkapkan ulasan.' : 'Draf disimpan.',
      site_visit_id,
      application_status,
      photos: savedPhotos
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};


exports.getSiteVisitByApplication = async (req, res, next) => {
  try {
    const { application_id } = req.params;
    const [rows] = await pool.execute(
      'SELECT * FROM site_visits WHERE application_id = ? ORDER BY site_visit_id DESC LIMIT 1',
      [application_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Record not found.', code: 'NOT_FOUND' });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};

exports.updateSiteVisit = async (req, res, next) => {
  try {
    const { site_visit_id } = req.params;
    res.json({ message: 'Rekod lawatan tapak dikemaskini.', site_visit_id: parseInt(site_visit_id) });
  } catch (error) {
    next(error);
  }
};

exports.deleteSiteVisit = async (req, res, next) => {
  try {
    const { site_visit_id } = req.params;
    await pool.execute('UPDATE site_visits SET is_active = 0 WHERE site_visit_id = ?', [site_visit_id]);
    res.json({ message: 'Rekod lawatan tapak dipadam.' });
  } catch (error) {
    next(error);
  }
};
