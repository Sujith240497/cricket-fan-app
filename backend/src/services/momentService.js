import { getDb } from '../db.js';
import { audit } from './auditService.js';

export function calculateMomentOfDay(dateStr) {
  const db = getDb();
  const date = dateStr || new Date().toISOString().slice(0, 10);

  // Score users based on today's activity
  const candidates = db.prepare(`
    SELECT u.id as user_id, u.username,
      COALESCE(SUM(al.xp_change), 0) as xp_earned,
      COUNT(DISTINCT al.id) as activity_count
    FROM users u
    LEFT JOIN activity_log al ON al.user_id = u.id AND date(al.created_at) = ?
    GROUP BY u.id
    HAVING activity_count > 0
    ORDER BY xp_earned DESC, activity_count DESC
    LIMIT 5
  `).all(date);

  if (candidates.length === 0) return null;

  // Clear previous top moment for this date
  db.prepare('UPDATE fan_moments SET is_top = 0 WHERE moment_date = ?').run(date);

  // Insert all candidate moments
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO fan_moments (user_id, moment_date, moment_type, title, description, score, is_top)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const isTop = i === 0 ? 1 : 0;
    const momentType = c.xp_earned >= 100 ? 'legendary' : c.xp_earned >= 50 ? 'great' : 'notable';
    const title = isTop ? `🏆 Fan of the Day: ${c.username}` : `⭐ Top Performer: ${c.username}`;
    const description = `Earned ${c.xp_earned} XP across ${c.activity_count} activities`;

    insertStmt.run(c.user_id, date, momentType, title, description, c.xp_earned, isTop);
  }

  audit(null, 'moment_of_day_calculated', { date, topUser: candidates[0]?.username });

  return {
    date,
    topMoment: candidates[0] || null,
    runners: candidates.slice(1)
  };
}

export function getMomentOfDay(dateStr) {
  const db = getDb();
  const date = dateStr || new Date().toISOString().slice(0, 10);

  const topMoment = db.prepare(`
    SELECT fm.*, u.username FROM fan_moments fm
    JOIN users u ON u.id = fm.user_id
    WHERE fm.moment_date = ? AND fm.is_top = 1
  `).get(date);

  const runners = db.prepare(`
    SELECT fm.*, u.username FROM fan_moments fm
    JOIN users u ON u.id = fm.user_id
    WHERE fm.moment_date = ? AND fm.is_top = 0
    ORDER BY fm.score DESC
  `).all(date);

  return { date, topMoment, runners };
}

export function getUserMoments(userId, limit = 10) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM fan_moments
    WHERE user_id = ?
    ORDER BY moment_date DESC LIMIT ?
  `).all(userId, limit);
}
