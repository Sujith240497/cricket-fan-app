import { getDb } from '../db.js';

export function audit(userId, actionType, metadata = {}) {
  const db = getDb();
  db.prepare(`
    INSERT INTO audit_logs (user_id, action_type, metadata)
    VALUES (?, ?, ?)
  `).run(userId, actionType, JSON.stringify(metadata));
}

export function getAuditLogs(userId, limit = 50) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
  `).all(userId, limit);
}
