import { getDb } from '../db.js';
import { logActivity } from './userService.js';
import { addNotification } from './notificationService.js';
import { getUserRank } from './leaderboardService.js';
import { awardXp } from './gameEngine.js';

const PREDICTION_XP = 20;

export function getUpcomingMatches() {
  const db = getDb();
  return db.prepare("SELECT * FROM matches WHERE status = 'upcoming' ORDER BY match_date ASC").all();
}

export function getLiveMatches() {
  const db = getDb();
  return db.prepare("SELECT * FROM matches WHERE status = 'live' ORDER BY match_date ASC").all();
}

export function getCompletedMatches(limit = 20) {
  const db = getDb();
  return db.prepare("SELECT * FROM matches WHERE status = 'completed' ORDER BY match_date DESC LIMIT ?").all(limit);
}

export function getAllMatches() {
  const db = getDb();
  return db.prepare("SELECT * FROM matches ORDER BY match_date DESC").all();
}

export function makePrediction(userId, matchId, prediction) {
  const db = getDb();

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) return { error: 'Match not found' };
  if (match.status !== 'upcoming') return { error: 'Predictions only allowed for upcoming matches' };

  const existing = db.prepare('SELECT id FROM predictions WHERE user_id = ? AND match_id = ?').get(userId, matchId);
  if (existing) return { error: 'You already predicted this match' };

  if (prediction !== match.team_a && prediction !== match.team_b) {
    return { error: `Prediction must be "${match.team_a}" or "${match.team_b}"` };
  }

  db.prepare('INSERT INTO predictions (user_id, match_id, prediction) VALUES (?, ?, ?)').run(userId, matchId, prediction);
  logActivity(userId, 'prediction_made', `Predicted ${prediction} for ${match.team_a} vs ${match.team_b}`, 0);

  return { success: true, match, prediction };
}

export function getUserPredictions(userId) {
  const db = getDb();
  return db.prepare(`
    SELECT p.*, m.team_a, m.team_b, m.match_date, m.status as match_status, m.winner
    FROM predictions p
    JOIN matches m ON p.match_id = m.id
    WHERE p.user_id = ?
    ORDER BY m.match_date DESC
  `).all(userId);
}

export function processMatchResults(matchId, winner) {
  const db = getDb();

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) return { error: 'Match not found' };
  if (match.status === 'completed') return { error: 'Match already completed' };

  // Mark match as completed
  db.prepare("UPDATE matches SET status = 'completed', winner = ? WHERE id = ?").run(winner, matchId);

  // Get all predictions for this match
  const predictions = db.prepare('SELECT * FROM predictions WHERE match_id = ?').all(matchId);

  let processed = 0;
  for (const pred of predictions) {
    const isCorrect = pred.prediction === winner;
    const xpEarned = isCorrect ? PREDICTION_XP : 0;

    db.prepare('UPDATE predictions SET is_correct = ?, xp_earned = ? WHERE id = ?').run(isCorrect ? 1 : 0, xpEarned, pred.id);

    if (isCorrect) {
      awardXp(pred.user_id, xpEarned, 'prediction_correct',
        `Correct prediction! ${match.team_a} vs ${match.team_b} (+${xpEarned} XP)`);
      addNotification(pred.user_id, `You earned +${xpEarned} XP for correct prediction! ${match.team_a} vs ${match.team_b}`, 'xp');

      const rank = getUserRank(pred.user_id);
      addNotification(pred.user_id, `You are now Rank #${rank} on the leaderboard!`, 'rank');
    } else {
      logActivity(pred.user_id, 'prediction_incorrect', `Wrong prediction: ${match.team_a} vs ${match.team_b}`, 0);
      addNotification(pred.user_id, `Your prediction for ${match.team_a} vs ${match.team_b} was incorrect. Better luck next time!`, 'info');
    }
    processed++;
  }

  return { success: true, processed, winner };
}
