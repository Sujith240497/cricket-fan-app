import { getDb } from '../db.js';

export function addNotification(userId, message, type = 'info') {
  const db = getDb();
  db.prepare('INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)').run(userId, message, type);
}

export function getUserNotifications(userId, limit = 20) {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(userId, limit);
}

export function getUnreadNotifications(userId) {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC'
  ).all(userId);
}

export function markNotificationsRead(userId) {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(userId);
}

export function markSingleRead(userId, notificationId) {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(notificationId, userId);
}
