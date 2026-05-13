import { getDb } from '../db.js';
import { addNotification } from './notificationService.js';

const TITLE_CONDITIONS = [
  {
    key: 'chase_master',
    title: 'Chase Master',
    check: (stats) => stats.correctPredictions >= 5
  },
  {
    key: 'prediction_king',
    title: 'Prediction King',
    check: (stats) => stats.predictionAccuracy >= 70 && stats.totalPredictions >= 10
  },
  {
    key: 'quiz_warrior',
    title: 'Quiz Warrior',
    check: (stats) => stats.totalAnswered >= 50
  },
  {
    key: 'streak_machine',
    title: 'Streak Machine',
    check: (stats) => stats.streak >= 7
  },
  {
    key: 'battle_champion',
    title: 'Battle Champion',
    check: (stats) => stats.battlesWon >= 5
  },
  {
    key: 'social_butterfly',
    title: 'Social Butterfly',
    check: (stats) => stats.referrals >= 3
  },
  {
    key: 'century_maker',
    title: 'Century Maker',
    check: (stats) => stats.totalAnswered >= 100
  },
  {
    key: 'top_10_elite',
    title: 'Top 10 Elite',
    check: (stats) => stats.rank <= 10 && stats.rank > 0
  },
  {
    key: 'kohli_mode_survivor',
    title: 'Kohli Mode Survivor',
    check: (stats) => stats.kohliModeCompleted >= 3
  },
  {
    key: 'xp_hunter',
    title: 'XP Hunter',
    check: (stats) => stats.xp >= 500
  }
];

export function checkAndAwardTitles(userId) {
  const db = getDb();
  const stats = getUserStats(userId);
  const existingTitles = db.prepare('SELECT title FROM titles WHERE user_id = ?').all(userId).map(t => t.title);

  const newTitles = [];

  for (const condition of TITLE_CONDITIONS) {
    if (!existingTitles.includes(condition.title) && condition.check(stats)) {
      db.prepare(`
        INSERT OR IGNORE INTO titles (user_id, title, condition_key) VALUES (?, ?, ?)
      `).run(userId, condition.title, condition.key);
      newTitles.push(condition.title);
      addNotification(userId, `Title unlocked: "${condition.title}"! 🏆`, 'title_unlock');
    }
  }

  return newTitles;
}

function getUserStats(userId) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return {};

  const totalAnswered = db.prepare('SELECT COUNT(*) as c FROM user_answers WHERE user_id = ?').get(userId).c;
  const totalCorrect = db.prepare('SELECT COUNT(*) as c FROM user_answers WHERE user_id = ? AND is_correct = 1').get(userId).c;
  const totalPredictions = db.prepare('SELECT COUNT(*) as c FROM predictions WHERE user_id = ?').get(userId).c;
  const correctPredictions = db.prepare('SELECT COUNT(*) as c FROM predictions WHERE user_id = ? AND is_correct = 1').get(userId).c;
  const battlesWon = db.prepare('SELECT COUNT(*) as c FROM battles WHERE winner = ? AND status = ?').get(userId, 'completed').c;
  const referrals = db.prepare('SELECT total_referred FROM referrals WHERE user_id = ?').get(userId)?.total_referred || 0;
  const kohliModeCompleted = db.prepare("SELECT COUNT(*) as c FROM user_answers WHERE user_id = ? AND source = 'kohli'").get(userId).c;

  // Rank calculation
  const rank = db.prepare('SELECT COUNT(*) + 1 as rank FROM users WHERE xp > ?').get(user.xp).rank;

  const predictionAccuracy = totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0;

  return {
    xp: user.xp,
    streak: user.streak,
    totalAnswered,
    totalCorrect,
    totalPredictions,
    correctPredictions,
    predictionAccuracy,
    battlesWon,
    referrals,
    kohliModeCompleted: Math.floor(kohliModeCompleted / 5),
    rank
  };
}

export function getUserTitles(userId) {
  const db = getDb();
  return db.prepare('SELECT * FROM titles WHERE user_id = ? ORDER BY unlocked_at DESC').all(userId);
}

export function getAllTitleDefinitions() {
  return TITLE_CONDITIONS.map(t => ({ key: t.key, title: t.title }));
}
