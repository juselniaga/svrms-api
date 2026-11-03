// Laravel reads status_id before status (Application::getStatusCodeAttribute),
// so both columns must always change together.
exports.setApplicationStatus = (conn, applicationId, code) =>
  conn.execute(
    `UPDATE applications
     SET status = ?,
         status_id = (SELECT id FROM application_statuses WHERE code = ?),
         updated_at = NOW()
     WHERE application_id = ?`,
    [code, code, applicationId]
  );
