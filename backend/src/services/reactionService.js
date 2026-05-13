import { getDb } from '../db.js';
import { audit } from './auditService.js';
import { awardXp } from './gameEngine.js';
import { logActivity } from './userService.js';

const VALID_REACTIONS = ['🔥', '😱', '💀', '🏏'];
const REACTION_ALIASES = { fire: '🔥', shock: '😱', rip: '💀', cricket: '🏏' };
const REACTION_XP = 5;
const REACTION_STREAK_BONUS = 3; // consecutive reactions in 1 hour

export function addReaction(userId, eventId, reactionType) {
  // Resolve text aliases to emoji
  const resolved = REACTION_ALIASES[reactionType?.toLowerCase()] || reactionType;
  if (!VALID_REACTIONS.includes(resolved)) {
    return { error: 'Invalid reaction type. Use: 🔥 😱 💀 🏏 (or: fire, shock, rip, cricket)' };
  }

  const db = getDb();
  const event = db.prepare('SELECT * FROM live_events WHERE id = ?').get(eventId);
  if (!event) return { error: 'Event not found' };

  // Check if already reacted
  const existing = db.prepare('SELECT id FROM reactions WHERE user_id = ? AND event_id = ?').get(userId, eventId);
  if (existing) return { error: 'Already reacted to this event' };

  db.prepare(`
    INSERT INTO reactions (user_id, event_id, reaction_type)
    VALUES (?, ?, ?)
  `).run(userId, eventId, resolved);

  // Check for reaction streak (3+ reactions in 1 hour)
  const recentCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM reactions
    WHERE user_id = ? AND created_at > datetime('now', '-1 hour')
  `).get(userId).cnt;

  let xpEarned = REACTION_XP;
  let streakBonus = false;
  if (recentCount >= REACTION_STREAK_BONUS && recentCount % REACTION_STREAK_BONUS === 0) {
    xpEarned += 10;
    streakBonus = true;
  }

  const xpResult = awardXp(userId, xpEarned, 'reaction',
    `Reacted ${resolved} to "${event.title}"${streakBonus ? ' (reaction streak!)' : ''}`);

  audit(userId, 'reaction', { eventId, reactionType: resolved, xpEarned, streakBonus, recentCount });

  return {
    reactionType: resolved,
    eventId,
    xpEarned,
    streakBonus,
    reactionStreak: recentCount,
    ...xpResult
  };
}

export function getEventReactions(eventId) {
  const db = getDb();
  const counts = db.prepare(`
    SELECT reaction_type, COUNT(*) as count
    FROM reactions WHERE event_id = ?
    GROUP BY reaction_type
  `).all(eventId);

  const total = counts.reduce((sum, r) => sum + r.count, 0);
  return { eventId, reactions: counts, total };
}

export function getUserReactionStats(userId) {
  const db = getDb();

  const total = db.prepare('SELECT COUNT(*) as cnt FROM reactions WHERE user_id = ?').get(userId).cnt;
  const byType = db.prepare(`
    SELECT reaction_type, COUNT(*) as count
    FROM reactions WHERE user_id = ?
    GROUP BY reaction_type ORDER BY count DESC
  `).all(userId);

  const recentPerHour = db.prepare(`
    SELECT COUNT(*) as cnt FROM reactions
    WHERE user_id = ? AND created_at > datetime('now', '-1 hour')
  `).get(userId).cnt;

  // Engagement score: reactions per day (last 7 days)
  const weeklyReactions = db.prepare(`
    SELECT COUNT(*) as cnt FROM reactions
    WHERE user_id = ? AND created_at > datetime('now', '-7 days')
  `).get(userId).cnt;

  const engagementScore = Math.min(100, Math.round((weeklyReactions / 7) * 20));

  return {
    totalReactions: total,
    byType,
    recentPerHour,
    weeklyReactions,
    engagementScore,
    favoriteReaction: byType[0]?.reaction_type || null
  };
}

export function getValidReactions() {
  return VALID_REACTIONS;
}
