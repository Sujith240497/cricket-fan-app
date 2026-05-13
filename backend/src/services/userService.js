import { getDb } from '../db.js';

export function getStreakInfo(userId) {
  const db = getDb();
  const user = db.prepare('SELECT streak, last_login_date FROM users WHERE id = ?').get(userId);
  return { streak: user?.streak || 0, lastLoginDate: user?.last_login_date || null };
}

export function updateStreak(userId) {
  const db = getDb();
  const user = db.prepare('SELECT streak, last_login_date FROM users WHERE id = ?').get(userId);
  if (!user) return { streak: 0, streakUpdated: false };

  const today = new Date().toISOString().split('T')[0];
  const lastLogin = user.last_login_date;

  if (lastLogin === today) {
    return { streak: user.streak, streakUpdated: false };
  }

  let newStreak;
  let streakUpdated = true;

  if (lastLogin) {
    const lastDate = new Date(lastLogin);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      newStreak = user.streak + 1;
    } else {
      newStreak = 1;
    }
  } else {
    newStreak = 1;
  }

  db.prepare('UPDATE users SET streak = ?, last_login_date = ? WHERE id = ?').run(newStreak, today, userId);

  return { streak: newStreak, streakUpdated, previousStreak: user.streak };
}

export function logActivity(userId, action, detail, xpChange = 0) {
  const db = getDb();
  db.prepare('INSERT INTO activity_log (user_id, action, detail, xp_change) VALUES (?, ?, ?, ?)').run(userId, action, detail, xpChange);
}

export function getRecentActivity(userId, limit = 5) {
  const db = getDb();
  return db.prepare('SELECT action, detail, xp_change, created_at FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit);
}
