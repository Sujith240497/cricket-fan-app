import { getDb } from '../db.js';
import { getLevel } from './gameService.js';

export function getLeaderboard(limit = 50) {
  const db = getDb();
  const users = db.prepare(
    'SELECT id, username, xp, streak FROM users ORDER BY xp DESC LIMIT ?'
  ).all(limit);

  return users.map((u, index) => ({
    rank: index + 1,
    userId: u.id,
    username: u.username,
    xp: u.xp,
    level: getLevel(u.xp),
    streak: u.streak
  }));
}

export function getUserRank(userId) {
  const db = getDb();
  const user = db.prepare('SELECT xp FROM users WHERE id = ?').get(userId);
  if (!user) return null;

  const rank = db.prepare('SELECT COUNT(*) as rank FROM users WHERE xp > ?').get(user.xp);
  return rank.rank + 1;
}

export function getWeeklyLeaderboard(limit = 20) {
  const db = getDb();
  const weekStart = getWeekStart();

  // Get XP earned this week from activity_log
  const weekly = db.prepare(`
    SELECT u.id, u.username, u.xp, u.streak,
      COALESCE(SUM(a.xp_change), 0) as weekly_xp
    FROM users u
    LEFT JOIN activity_log a ON a.user_id = u.id AND a.created_at >= ?
    GROUP BY u.id
    ORDER BY weekly_xp DESC
    LIMIT ?
  `).all(weekStart, limit);

  return weekly.map((u, index) => ({
    rank: index + 1,
    userId: u.id,
    username: u.username,
    xp: u.xp,
    weeklyXp: u.weekly_xp,
    level: getLevel(u.xp),
    streak: u.streak
  }));
}

export function getTopMovers(limit = 10) {
  const db = getDb();
  const weekStart = getWeekStart();

  // Get users with most XP gain this week
  const movers = db.prepare(`
    SELECT u.id, u.username, u.xp,
      COALESCE(SUM(a.xp_change), 0) as xp_gained
    FROM users u
    LEFT JOIN activity_log a ON a.user_id = u.id AND a.created_at >= ?
    GROUP BY u.id
    HAVING xp_gained > 0
    ORDER BY xp_gained DESC
    LIMIT ?
  `).all(weekStart, limit);

  // Get previous rank from snapshots
  const prevWeekStart = getPrevWeekStart();
  return movers.map(u => {
    const snapshot = db.prepare(`
      SELECT rank FROM weekly_snapshots WHERE user_id = ? AND week_start = ?
    `).get(u.id, prevWeekStart);

    const currentRank = db.prepare('SELECT COUNT(*) + 1 as rank FROM users WHERE xp > ?').get(u.xp).rank;
    const prevRank = snapshot?.rank || currentRank;
    const rankChange = prevRank - currentRank; // positive = moved up

    return {
      userId: u.id,
      username: u.username,
      xpGained: u.xp_gained,
      currentRank,
      rankChange,
      level: getLevel(u.xp)
    };
  });
}

export function snapshotWeeklyRanks() {
  const db = getDb();
  const weekStart = getWeekStart();
  const users = db.prepare('SELECT id, xp FROM users ORDER BY xp DESC').all();

  const insert = db.prepare(`
    INSERT OR REPLACE INTO weekly_snapshots (user_id, week_start, xp_earned, rank)
    VALUES (?, ?, ?, ?)
  `);

  const doSnapshot = db.transaction(() => {
    users.forEach((u, index) => {
      insert.run(u.id, weekStart, u.xp, index + 1);
    });
  });
  doSnapshot();
}

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

function getPrevWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7;
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

export function compareUsers(userIdA, userIdB) {
  const db = getDb();
  const userA = db.prepare('SELECT id, username, xp, streak FROM users WHERE id = ?').get(userIdA);
  const userB = db.prepare('SELECT id, username, xp, streak FROM users WHERE id = ?').get(userIdB);

  if (!userA || !userB) return null;

  const statsA = getUserStats(db, userIdA);
  const statsB = getUserStats(db, userIdB);

  return {
    userA: { ...userA, level: getLevel(userA.xp), rank: getUserRank(userIdA), ...statsA },
    userB: { ...userB, level: getLevel(userB.xp), rank: getUserRank(userIdB), ...statsB }
  };
}

function getUserStats(db, userId) {
  const quizStats = db.prepare(`
    SELECT COUNT(*) as totalAnswered, SUM(is_correct) as totalCorrect
    FROM user_answers WHERE user_id = ?
  `).get(userId);

  const predStats = db.prepare(`
    SELECT COUNT(*) as totalPredictions, SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correctPredictions
    FROM predictions WHERE user_id = ? AND is_correct IS NOT NULL
  `).get(userId);

  return {
    quizAccuracy: quizStats.totalAnswered > 0
      ? Math.round((quizStats.totalCorrect / quizStats.totalAnswered) * 100) : 0,
    totalAnswered: quizStats.totalAnswered || 0,
    totalCorrect: quizStats.totalCorrect || 0,
    totalPredictions: predStats.totalPredictions || 0,
    correctPredictions: predStats.correctPredictions || 0,
    predictionAccuracy: predStats.totalPredictions > 0
      ? Math.round((predStats.correctPredictions / predStats.totalPredictions) * 100) : 0
  };
}
