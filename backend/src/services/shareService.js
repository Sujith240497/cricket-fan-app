import { getDb } from '../db.js';
import { getLevel } from './gameService.js';
import { getUserTitles } from './titleService.js';

export function getShareProfile(userId) {
  const db = getDb();
  const user = db.prepare('SELECT id, username, xp, streak, created_at FROM users WHERE id = ?').get(userId);
  if (!user) throw new Error('User not found');

  const level = getLevel(user.xp);
  const rank = db.prepare('SELECT COUNT(*) + 1 as rank FROM users WHERE xp > ?').get(user.xp).rank;
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;

  const totalAnswered = db.prepare('SELECT COUNT(*) as c FROM user_answers WHERE user_id = ?').get(userId).c;
  const totalCorrect = db.prepare('SELECT COUNT(*) as c FROM user_answers WHERE user_id = ? AND is_correct = 1').get(userId).c;
  const quizAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  const totalPredictions = db.prepare('SELECT COUNT(*) as c FROM predictions WHERE user_id = ?').get(userId).c;
  const correctPredictions = db.prepare('SELECT COUNT(*) as c FROM predictions WHERE user_id = ? AND is_correct = 1').get(userId).c;
  const predictionAccuracy = totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0;

  const battlesWon = db.prepare("SELECT COUNT(*) as c FROM battles WHERE winner = ? AND status = 'completed'").get(userId).c;
  const battlesPlayed = db.prepare("SELECT COUNT(*) as c FROM battles WHERE (user_a = ? OR user_b = ?) AND status = 'completed'").get(userId, userId).c;

  const titles = getUserTitles(userId);

  return {
    username: user.username,
    fanScore: calculateFanScore(user.xp, quizAccuracy, predictionAccuracy, user.streak, battlesWon),
    level: level.name,
    tier: level.tier,
    xp: user.xp,
    rank,
    totalUsers,
    quizAccuracy,
    predictionAccuracy,
    streak: user.streak,
    battlesWon,
    battlesPlayed,
    titles: titles.map(t => t.title),
    memberSince: user.created_at
  };
}

function calculateFanScore(xp, quizAcc, predAcc, streak, battlesWon) {
  // Weighted fan score out of 100
  const xpScore = Math.min(xp / 10, 30); // max 30 from XP
  const quizScore = (quizAcc / 100) * 25; // max 25 from quiz accuracy
  const predScore = (predAcc / 100) * 20; // max 20 from predictions
  const streakScore = Math.min(streak * 2, 15); // max 15 from streak
  const battleScore = Math.min(battlesWon * 2, 10); // max 10 from battles

  return Math.round(xpScore + quizScore + predScore + streakScore + battleScore);
}

export function createShareEvent(userId, eventType, payload) {
  const db = getDb();
  db.prepare(`
    INSERT INTO share_events (user_id, event_type, payload) VALUES (?, ?, ?)
  `).run(userId, eventType, JSON.stringify(payload));
}

export function getShareMessage(eventType, data) {
  const messages = {
    level_up: `🏏 I just reached ${data.level} on Fan Identity! Can you beat my score? #CricketFan`,
    battle_win: `⚔️ I won a Fan Battle with ${data.score}/5! Think you can beat me? #FanIdentity`,
    top_10: `🏆 I'm in the Top 10 on Fan Identity! Rank #${data.rank}. Challenge me! #CricketChampion`,
    prediction_streak: `🎯 ${data.correct} correct predictions in a row! My accuracy is ${data.accuracy}%. #PredictionKing`,
    title_unlock: `🏅 Just unlocked "${data.title}" title on Fan Identity! #CricketFanIdentity`,
    kohli_mode: `🏏 Chased successfully in Kohli Mode! ${data.score}/5 under pressure! #KohliMode`,
    fan_score: `📊 My Fan Score is ${data.fanScore}/100 on Fan Identity! What's yours? #CricketFan`
  };
  return messages[eventType] || `🏏 Check out my cricket fan profile on Fan Identity! #CricketFan`;
}
