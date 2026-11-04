exports.writeAuditLog = (conn, { applicationId, userId, action, previousStatus, newStatus, remarks }) =>
  conn.execute(
    `INSERT INTO audit_logs (application_id, user_id, action, previous_status, new_status, remarks, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [applicationId, userId, action, previousStatus, newStatus, remarks]
  );
