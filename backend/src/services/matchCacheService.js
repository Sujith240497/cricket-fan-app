import { getDb } from '../db.js';
import { info } from '../utils/logger.js';

// Cache freshness windows in minutes
const CACHE_TTL = {
  live: 1,
  upcoming: 30,
  recent: 30
};

export function getCachedMatches(status) {
  const db = getDb();
  const ttlMinutes = CACHE_TTL[status === 'completed' ? 'recent' : status] || 30;

  // Get matches that were synced within TTL window
  const matches = db.prepare(`
    SELECT * FROM matches
    WHERE status = ? AND last_synced_at IS NOT NULL
      AND datetime(last_synced_at) > datetime('now', ?)
    ORDER BY match_date ${status === 'completed' ? 'DESC' : 'ASC'}
    LIMIT 50
  `).all(status, `-${ttlMinutes} minutes`);

  return matches.length > 0 ? matches : null;
}

export function isCacheFresh(status) {
  const db = getDb();
  const ttlMinutes = CACHE_TTL[status === 'completed' ? 'recent' : status] || 30;

  const recent = db.prepare(`
    SELECT COUNT(*) as cnt FROM matches
    WHERE status = ? AND last_synced_at IS NOT NULL
      AND datetime(last_synced_at) > datetime('now', ?)
  `).get(status, `-${ttlMinutes} minutes`);

  return recent.cnt > 0;
}

export function upsertMatch(matchData) {
  const db = getDb();
  const now = new Date().toISOString();

  if (matchData.external_id) {
    const existing = db.prepare('SELECT id FROM matches WHERE external_id = ?').get(matchData.external_id);
    if (existing) {
      db.prepare(`
        UPDATE matches SET
          team_a = ?, team_b = ?, match_date = ?, venue = ?, status = ?,
          series_name = ?, match_type = ?, result_text = ?, winner = ?,
          raw_payload = ?, last_synced_at = ?, data_source = 'live_api',
          relevance_category = ?, is_featured = ?
        WHERE id = ?
      `).run(
        matchData.team_a, matchData.team_b, matchData.match_date,
        matchData.venue, matchData.status, matchData.series_name,
        matchData.match_type, matchData.result_text, matchData.winner,
        matchData.raw_payload, now,
        matchData.relevance_category || null, matchData.is_featured || 0,
        existing.id
      );
      return existing.id;
    }
  }

  const result = db.prepare(`
    INSERT INTO matches (team_a, team_b, match_date, venue, status, external_id,
      series_name, match_type, result_text, winner, raw_payload, last_synced_at, data_source,
      relevance_category, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'live_api', ?, ?)
  `).run(
    matchData.team_a, matchData.team_b, matchData.match_date,
    matchData.venue, matchData.status, matchData.external_id,
    matchData.series_name, matchData.match_type, matchData.result_text,
    matchData.winner, matchData.raw_payload, now,
    matchData.relevance_category || null, matchData.is_featured || 0
  );

  info(`Cached new match: ${matchData.team_a} vs ${matchData.team_b} [${matchData.relevance_category || 'uncat'}]`);
  return result.lastInsertRowid;
}

export function getMatchById(matchId) {
  const db = getDb();
  return db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
}

export function getMatchByExternalId(externalId) {
  const db = getDb();
  return db.prepare('SELECT * FROM matches WHERE external_id = ?').get(externalId);
}

export function getFallbackMatches(status) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM matches WHERE status = ?
    ORDER BY match_date ${status === 'completed' ? 'DESC' : 'ASC'}
    LIMIT 50
  `).all(status);
}

export function getLastSyncTime(status) {
  const db = getDb();
  const row = db.prepare(`
    SELECT MAX(last_synced_at) as last_sync FROM matches WHERE status = ?
  `).get(status);
  return row?.last_sync || null;
}

export function logSync(syncType, status, recordsSynced, errorMessage = null, source = 'cricketdata') {
  const db = getDb();
  db.prepare(`
    INSERT INTO sync_log (sync_type, status, records_synced, error_message, source)
    VALUES (?, ?, ?, ?, ?)
  `).run(syncType, status, recordsSynced, errorMessage, source);
}
