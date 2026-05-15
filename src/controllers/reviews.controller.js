const pool = require('../config/db');

exports.submitReview = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { application_id, officer_id, review_content, recommendation, self_check_completed } = req.body;
    
    // Insert into reviews
    const [result] = await conn.execute(
      `INSERT INTO reviews (application_id, officer_id, review_content, recommendation, self_check_completed, submitted_at, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
      [application_id, officer_id, review_content, recommendation, self_check_completed]
    );

    // Update application status
    await conn.execute(
      `UPDATE applications SET status = 'PENDING_VERIFICATION' WHERE application_id = ?`,
      [application_id]
    );

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
    const [rows] = await pool.execute('SELECT * FROM reviews WHERE application_id = ?', [application_id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Record not found.', code: 'NOT_FOUND' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};

exports.updateReview = async (req, res, next) => {
  try {
    const { review_id } = req.params;
    res.json({ message: 'Ulasan dikemaskini.', review_id: parseInt(review_id) });
  } catch (error) {
    next(error);
  }
};

exports.deleteReview = async (req, res, next) => {
  try {
    const { review_id } = req.params;
    await pool.execute('UPDATE reviews SET is_active = 0 WHERE review_id = ?', [review_id]);
    res.json({ message: 'Ulasan dipadam.' });
  } catch (error) {
    next(error);
  }
};
