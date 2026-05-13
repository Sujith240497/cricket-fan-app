import { getUnreadNotifications, getUserNotifications, markNotificationsRead } from '../services/notificationService.js';
import { success } from '../utils/response.js';

export function getAll(req, res) {
  const notifications = getUserNotifications(req.userId, 20);
  success(res, { notifications });
}

export function getUnread(req, res) {
  const notifications = getUnreadNotifications(req.userId);
  success(res, { notifications, count: notifications.length });
}

export function markRead(req, res) {
  markNotificationsRead(req.userId);
  success(res, {}, 'Notifications marked as read');
}
