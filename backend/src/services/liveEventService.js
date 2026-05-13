import { getDb } from '../db.js';
import { addNotification } from './notificationService.js';
import { audit } from './auditService.js';

const EVENT_TEMPLATES = [
  { type: 'wicket', title: '🏏 Wicket Falls!', description: 'A key batsman is out! The match just shifted.', intensity: 'high', xp_multiplier: 1.5 },
  { type: 'boundary', title: '💥 Boundary!', description: 'Smashed to the fence! Momentum building.', intensity: 'normal', xp_multiplier: 1.2 },
  { type: 'six', title: '🚀 SIX!', description: 'Massive hit! The crowd goes wild!', intensity: 'high', xp_multiplier: 1.3 },
  { type: 'run_rate_pressure', title: '📈 Run Rate Pressure', description: 'Required run rate climbing. Can they chase this?', intensity: 'medium', xp_multiplier: 1.3 },
  { type: 'clutch_moment', title: '🔥 CLUTCH MOMENT!', description: 'Last overs, wickets in hand — this is it!', intensity: 'critical', xp_multiplier: 2.0 },
  { type: 'maiden_over', title: '🎯 Maiden Over!', description: 'Tight bowling. Zero runs off the over.', intensity: 'normal', xp_multiplier: 1.1 },
  { type: 'partnership', title: '🤝 Big Partnership', description: 'A steady partnership is building. Counter-attack incoming?', intensity: 'medium', xp_multiplier: 1.2 },
  { type: 'collapse', title: '💀 Batting Collapse!', description: 'Wickets tumbling! Drama at its peak!', intensity: 'critical', xp_multiplier: 1.8 },
  { type: 'milestone', title: '🏆 Century Alert!', description: 'A batsman is approaching a landmark score!', intensity: 'high', xp_multiplier: 1.4 },
  { type: 'review', title: '📺 DRS Review!', description: 'Third umpire called! Tension in the stadium.', intensity: 'medium', xp_multiplier: 1.2 },
  { type: 'last_over', title: '⚡ LAST OVER THRILLER!', description: 'Final over. Everything comes down to this!', intensity: 'critical', xp_multiplier: 2.0 },
  { type: 'rain_delay', title: '🌧️ Rain Delay', description: 'Rain interrupts play. DLS calculations incoming.', intensity: 'low', xp_multiplier: 1.0 },
];

export function generateEvent(matchId) {
  const db = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match || match.status !== 'live') return null;

  // Expire old events for this match
  db.prepare(`
    UPDATE live_events SET is_active = 0
    WHERE match_id = ? AND is_active = 1 AND expires_at < datetime('now')
  `).run(matchId);

  // Pick a random event template
  const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min window

  const result = db.prepare(`
    INSERT INTO live_events (match_id, event_type, title, description, intensity, xp_multiplier, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(matchId, template.type, template.title, template.description, template.intensity, template.xp_multiplier, expiresAt);

  const event = {
    id: result.lastInsertRowid,
    matchId,
    ...template,
    expiresAt
  };

  audit(null, 'live_event_generated', { matchId, eventType: template.type, eventId: event.id });

  return event;
}

export function tickLiveMatches() {
  const db = getDb();
  const liveMatches = db.prepare("SELECT id FROM matches WHERE status = 'live'").all();
  const events = [];

  for (const match of liveMatches) {
    // ~40% chance to generate event per tick
    if (Math.random() < 0.4) {
      const event = generateEvent(match.id);
      if (event) events.push(event);
    }
  }

  // Expire stale events globally
  db.prepare(`
    UPDATE live_events SET is_active = 0
    WHERE is_active = 1 AND expires_at < datetime('now')
  `).run();

  return events;
}

export function getActiveEvents(matchId) {
  const db = getDb();
  if (matchId) {
    return db.prepare(`
      SELECT * FROM live_events
      WHERE match_id = ? AND is_active = 1 AND (expires_at > datetime('now') OR expires_at IS NULL)
      ORDER BY created_at DESC LIMIT 10
    `).all(matchId);
  }
  return db.prepare(`
    SELECT le.*, m.team_a, m.team_b FROM live_events le
    JOIN matches m ON m.id = le.match_id
    WHERE le.is_active = 1 AND (le.expires_at > datetime('now') OR le.expires_at IS NULL)
    ORDER BY le.created_at DESC LIMIT 20
  `).all();
}

export function getRecentEvents(limit = 20) {
  const db = getDb();
  return db.prepare(`
    SELECT le.*, m.team_a, m.team_b FROM live_events le
    JOIN matches m ON m.id = le.match_id
    ORDER BY le.created_at DESC LIMIT ?
  `).all(limit);
}

export function getCurrentMultiplier() {
  const db = getDb();
  const active = db.prepare(`
    SELECT * FROM live_events
    WHERE is_active = 1 AND (expires_at > datetime('now') OR expires_at IS NULL)
    ORDER BY xp_multiplier DESC LIMIT 1
  `).get();
  return active ? active.xp_multiplier : 1.0;
}

export function getEventById(eventId) {
  const db = getDb();
  return db.prepare('SELECT * FROM live_events WHERE id = ?').get(eventId);
}
