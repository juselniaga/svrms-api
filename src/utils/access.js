const httpError = (status, code, message, details) =>
  Object.assign(new Error(message), { status, code, details });

exports.httpError = httpError;

// Officers may only reach applications assigned to them. Someone else's application
// answers the same as a missing one, so ids can't be probed.
exports.getOwnedApplication = async (db, applicationId, user, { lock = false } = {}) => {
  const [rows] = await db.execute(
    `SELECT a.application_id, COALESCE(s.code, a.status) AS status
     FROM applications a
     LEFT JOIN application_statuses s ON s.id = a.status_id
     WHERE a.application_id = ? AND a.officer_id = ? AND a.is_active = 1
     ${lock ? 'FOR UPDATE' : ''}`,
    [applicationId, user.user_id]
  );
  if (rows.length === 0) {
    throw httpError(404, 'NOT_FOUND', 'Application not found.');
  }
  return rows[0];
};

// Same stages Laravel's officer controllers allow
exports.assertStatus = (application, allowed) => {
  if (!allowed.includes(application.status)) {
    throw httpError(422, 'INVALID_STATUS', 'Tindakan ini tidak dibenarkan pada status permohonan sekarang.');
  }
};
