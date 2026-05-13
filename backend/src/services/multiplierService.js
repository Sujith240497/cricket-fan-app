import { getDb } from '../db.js';
import { getStreakMultiplier } from './gameService.js';
import { getCurrentMultiplier as getLiveMultiplier } from './liveEventService.js';

const MAX_MULTIPLIER = 3.0;

const MULTIPLIER_SOURCES = {
  streak: { name: 'Login Streak', getMultiplier: (userId) => {
    const db = getDb();
    const user = db.prepare('SELECT streak FROM users WHERE id = ?').get(userId);
    return user ? getStreakMultiplier(user.streak) : 1.0;
  }},
  live_event: { name: 'Live Match Event', getMultiplier: () => getLiveMultiplier() },
  kohli_mode: { name: 'Kohli Mode Active', getMultiplier: (_userId, context) => {
    return context?.source === 'kohli' ? 1.3 : 1.0;
  }},
  reaction_streak: { name: 'Reaction Streak', getMultiplier: (userId) => {
    const db = getDb();
    const recentReactions = db.prepare(`
      SELECT COUNT(*) as cnt FROM reactions
      WHERE user_id = ? AND created_at > datetime('now', '-1 hour')
    `).get(userId).cnt;
    return recentReactions >= 5 ? 1.2 : recentReactions >= 3 ? 1.1 : 1.0;
  }}
};

export function getActiveMultipliers(userId, context = {}) {
  const active = [];
  let combined = 1.0;

  for (const [key, source] of Object.entries(MULTIPLIER_SOURCES)) {
    const mult = source.getMultiplier(userId, context);
    if (mult > 1.0) {
      active.push({ key, name: source.name, multiplier: mult });
      combined *= mult;
    }
  }

  // Check DB-stored global multipliers
  const db = getDb();
  const dbMultipliers = db.prepare(`
    SELECT * FROM engagement_multipliers
    WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))
  `).all();

  for (const m of dbMultipliers) {
    active.push({ key: m.source, name: m.name, multiplier: m.multiplier });
    combined *= m.multiplier;
  }

  combined = Math.min(combined, MAX_MULTIPLIER);

  return {
    multipliers: active,
    combined: Math.round(combined * 100) / 100,
    capped: combined >= MAX_MULTIPLIER
  };
}

export function calculateContextualXp(baseXp, userId, context = {}) {
  const { combined } = getActiveMultipliers(userId, context);
  return Math.round(baseXp * combined);
}

export function addGlobalMultiplier(name, multiplier, source, durationMinutes = 60) {
  const db = getDb();
  const expiresAt = durationMinutes
    ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
    : null;

  db.prepare(`
    INSERT INTO engagement_multipliers (name, multiplier, source, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(name, multiplier, source, expiresAt);
}

export function clearExpiredMultipliers() {
  const db = getDb();
  db.prepare(`
    UPDATE engagement_multipliers SET is_active = 0
    WHERE is_active = 1 AND expires_at IS NOT NULL AND expires_at < datetime('now')
  `).run();
}
