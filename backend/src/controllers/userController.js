import { getDb } from '../db.js';
import { getLevel } from '../services/gameService.js';
import { getStreakInfo, getRecentActivity } from '../services/userService.js';
import { getUserRank } from '../services/leaderboardService.js';
import { success, notFound } from '../utils/response.js';

export function getProfile(req, res) {
  const db = getDb();
  const user = db.prepare(
    'SELECT id, username, email, xp, streak, last_login_date, created_at FROM users WHERE id = ?'
  ).get(req.userId);
  if (!user) return notFound(res, 'User not found');

  const stats = db.prepare(`
    SELECT COUNT(*) as totalAnswered, SUM(is_correct) as totalCorrect
    FROM user_answers WHERE user_id = ?
  `).get(req.userId);

  const predStats = db.prepare(`
    SELECT COUNT(*) as totalPredictions,
      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correctPredictions
    FROM predictions WHERE user_id = ? AND is_correct IS NOT NULL
  `).get(req.userId);

  const level = getLevel(user.xp);
  const activity = getRecentActivity(req.userId, 5);
  const rank = getUserRank(req.userId);

  success(res, {
    user: {
      ...user,
      totalAnswered: stats.totalAnswered || 0,
      totalCorrect: stats.totalCorrect || 0,
      totalPredictions: predStats.totalPredictions || 0,
      correctPredictions: predStats.correctPredictions || 0,
      predictionAccuracy: predStats.totalPredictions > 0
        ? Math.round((predStats.correctPredictions / predStats.totalPredictions) * 100) : 0,
      level,
      rank,
      recentActivity: activity
    }
  });
}

export function getLevel_(req, res) {
  const db = getDb();
  const user = db.prepare('SELECT xp FROM users WHERE id = ?').get(req.userId);
  if (!user) return notFound(res, 'User not found');
  success(res, { level: getLevel(user.xp) });
}

export function getStreak(req, res) {
  const info = getStreakInfo(req.userId);
  success(res, info);
}
