import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchNotifications = useCallback(() => {
    api.getUnreadNotifications()
      .then(data => setNotifications(data.notifications))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  async function handleOpen() {
    setShowDropdown(!showDropdown);
  }

  async function handleMarkRead() {
    await api.markNotificationsRead();
    setNotifications([]);
    setShowDropdown(false);
  }

  return (
    <div className="notification-bell">
      <button className="bell-btn" onClick={handleOpen}>
        🔔
        {notifications.length > 0 && (
          <span className="notif-badge">{notifications.length}</span>
        )}
      </button>

      {showDropdown && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <span>Notifications</span>
            {notifications.length > 0 && (
              <button className="notif-mark-read" onClick={handleMarkRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notif-list">
            {notifications.length === 0 && (
              <p className="notif-empty">No new notifications</p>
            )}
            {notifications.map(n => (
              <div key={n.id} className={`notif-item notif-${n.type}`}>
                <span className="notif-msg">{n.message}</span>
                <span className="notif-time">
                  {new Date(n.created_at + 'Z').toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
