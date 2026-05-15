const pool = require('../config/db');

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

    // Extract uploaded photo paths (Multer stores in req.files, DB columns are JSON type)
    //store photos path into : svrms/storage/app/public/photos

    const files = req.files || {};
    const photosNorth = files.photos_north?.[0]?.path ? JSON.stringify([files.photos_north[0].path]) : null;
    const photosSouth = files.photos_south?.[0]?.path ? JSON.stringify([files.photos_south[0].path]) : null;
    const photoEast = files.photo_east?.[0]?.path ? JSON.stringify([files.photo_east[0].path]) : null;
    const photoWest = files.photo_west?.[0]?.path ? JSON.stringify([files.photo_west[0].path]) : null;

    const visit_status = action === 'submit' ? 'COMPLETED' : 'DRAFT';

    const [result] = await conn.execute(
      `INSERT INTO site_visits (
        application_id, officer_id, visit_date, 
        finding_north, findings_south, findings_east, finding_west,
        activity, facility, entrance_way, parit, tree, topography, 
        land_use_zone, density, recommend_road, anjakan, social_facility, 
        location_data, status,
        photos_north, photos_south, photo_east, photo_west
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        application_id, officer_id, visit_date,
        finding_north, findings_south, findings_east, finding_west,
        activity, facility, entrance_way, parit, tree, topography,
        land_use_zone, density, recommend_road, anjakan, social_facility,
        location_data, visit_status,
        photosNorth, photosSouth, photoEast, photoWest
      ]
    );

    let application_status = 'RECORDED';
    if (action === 'submit') {
      application_status = 'SITE_VISIT_IN_PROGRESS';
      await conn.execute(
        `UPDATE applications SET status = ? WHERE application_id = ?`,
        [application_status, application_id]
      );
    }

    await conn.commit();
    res.status(201).json({
      message: action === 'submit' ? 'Lawatan tapak berjaya dihantar. Sila lengkapkan ulasan.' : 'Draf disimpan.',
      site_visit_id: result.insertId,
      application_status,
      photos: { photosNorth, photosSouth, photoEast, photoWest }
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
    const [rows] = await pool.execute('SELECT * FROM site_visits WHERE application_id = ?', [application_id]);

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
