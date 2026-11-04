const pool = require('../config/db');
const { setApplicationStatus } = require('../utils/applicationStatus');
const { getOwnedApplication, assertStatus } = require('../utils/access');
const { reviewSchema, parse } = require('../utils/schemas');
const { writeAuditLog } = require('../utils/auditLog');

exports.submitReview = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { application_id, review_content, recommendation, self_check_completed } = parse(reviewSchema, req.body);

    await conn.beginTransaction();
    const application = await getOwnedApplication(conn, application_id, req.user, { lock: true });
    assertStatus(application, ['SITE_VISIT_IN_PROGRESS']);

    // Insert into reviews
    const [result] = await conn.execute(
      `INSERT INTO reviews (application_id, officer_id, review_content, recommendation, self_check_completed, submitted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
      [application_id, req.user.user_id, review_content, recommendation, self_check_completed]
    );

    // Update application status
    await setApplicationStatus(conn, application_id, 'PENDING_VERIFICATION');

    await writeAuditLog(conn, {
      applicationId: application_id,
      userId: req.user.user_id,
      action: 'REVIEW_SUBMITTED',
      previousStatus: application.status,
      newStatus: 'PENDING_VERIFICATION',
      remarks: `Officer submitted review (${recommendation}).`
    });

    await conn.commit();
    res.status(201).json({
      message: 'Ulasan berjaya dihantar kepada Penolong Pengarah untuk pengesahan.',
      review_id: result.insertId,
      application_status: 'PENDING_VERIFICATION'
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

exports.getReviewByApplication = async (req, res, next) => {
  try {
    const { application_id } = req.params;
    await getOwnedApplication(pool, application_id, req.user);
    const [rows] = await pool.execute('SELECT * FROM reviews WHERE application_id = ?', [application_id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Record not found.', code: 'NOT_FOUND' });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};
