const fs = require('fs');
const pool = require('../config/db');
const { setApplicationStatus } = require('../utils/applicationStatus');
const { getOwnedApplication, assertStatus } = require('../utils/access');
const { siteVisitSchema, parse } = require('../utils/schemas');
const { writeAuditLog } = require('../utils/auditLog');

const PHOTO_FIELDS = ['photos_north', 'photos_south', 'photo_east', 'photo_west'];

// Multer has already written the files by the time a request can be rejected
const removeUploads = (files = {}) =>
  Promise.all(Object.values(files).flat().map((file) => fs.promises.unlink(file.path).catch(() => {})));

exports.createSiteVisit = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const {
      application_id, visit_date,
      finding_north, findings_south, findings_east, finding_west,
      activity, facility, entrance_way, parit, tree, topography,
      land_use_zone, density, recommend_road, anjakan, social_facility,
      location_data, action
    } = parse(siteVisitSchema, req.body);

    await conn.beginTransaction();
    const application = await getOwnedApplication(conn, application_id, req.user, { lock: true });
    assertStatus(application, ['RECORDED', 'SITE_VISIT_IN_PROGRESS']);

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
        [...fieldValues, visit_status, ...photoValues, application_id, req.user.user_id]
      );
      site_visit_id = result.insertId;
    }

    let application_status = application.status;
    if (action === 'submit') {
      application_status = 'SITE_VISIT_IN_PROGRESS';
      await setApplicationStatus(conn, application_id, application_status);
    }

    await writeAuditLog(conn, {
      applicationId: application_id,
      userId: req.user.user_id,
      action: action === 'submit' ? 'SITE_INVESTIGATION_COMPLETED' : 'SITE_VISIT_DRAFT_SAVED',
      previousStatus: application.status,
      newStatus: application_status,
      remarks: action === 'submit'
        ? `Officer submitted Site Investigation. Location Data: ${location_data || 'None'}`
        : 'Officer saved a Site Investigation draft.'
    });

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
    await removeUploads(req.files);
    next(error);
  } finally {
    conn.release();
  }
};


exports.getSiteVisitByApplication = async (req, res, next) => {
  try {
    const { application_id } = req.params;
    await getOwnedApplication(pool, application_id, req.user);
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
