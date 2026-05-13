import { fetchCurrentMatches, fetchMatchList, normalizeMatch, isConfigured } from './cricketDataApiService.js';
import { getCachedMatches, isCacheFresh, upsertMatch, getFallbackMatches, getMatchById, getLastSyncTime, logSync } from './matchCacheService.js';
import { filterRelevantMatches, sortByRelevance } from './matchRelevanceService.js';
import { info, error as logError } from '../utils/logger.js';
import { audit } from './auditService.js';

/**
 * MatchDataProvider - public interface for match data.
 * Flow: Cache (if fresh) → API (filter relevant) → Cache (stale) → Fallback
 */

export async function getMatches(status = 'upcoming') {
  const meta = { source: 'fallback', lastSyncedAt: null };

  // 1. Check if cache is fresh
  if (isCacheFresh(status)) {
    const cached = getCachedMatches(status);
    if (cached && cached.length > 0) {
      meta.source = 'cache';
      meta.lastSyncedAt = getLastSyncTime(status);
      return { matches: sortByRelevance(cached), meta };
    }
  }

  // 2. Try to fetch from CricketData.org API
  if (isConfigured()) {
    try {
      let rawMatches = null;

      if (status === 'live') {
        rawMatches = await fetchCurrentMatches();
        if (rawMatches) {
          rawMatches = rawMatches.filter(m => m.matchStarted && !m.matchEnded);
        }
      } else if (status === 'completed') {
        rawMatches = await fetchCurrentMatches();
        if (rawMatches) {
          rawMatches = rawMatches.filter(m => m.matchEnded);
        }
      } else {
        rawMatches = await fetchMatchList('upcoming');
      }

      if (rawMatches && rawMatches.length > 0) {
        // Normalize all matches
        const normalized = rawMatches.map(normalizeMatch).filter(Boolean);

        // V7.1: Filter through relevance service - only keep India-centric content
        const relevant = filterRelevantMatches(normalized);

        let synced = 0;
        for (const match of relevant) {
          upsertMatch(match);
          synced++;
        }

        const discarded = normalized.length - relevant.length;
        logSync(status, 'success', synced);
        audit(null, 'match_sync', { type: status, total: normalized.length, kept: synced, discarded, source: 'cricketdata' });
        if (discarded > 0) {
          info(`MatchSync [${status}]: Kept ${synced}/${normalized.length} relevant matches, discarded ${discarded}`);
        }

        const freshData = getCachedMatches(status) || getFallbackMatches(status);
        meta.source = 'live_api';
        meta.lastSyncedAt = new Date().toISOString();
        return { matches: sortByRelevance(freshData), meta };
      }
    } catch (err) {
      logError(`MatchDataProvider: API fetch failed for ${status}: ${err.message}`);
      logSync(status, 'error', 0, err.message);
    }
  }

  // 3. Return stale cached data if available
  const staleCache = getCachedMatches(status);
  if (staleCache && staleCache.length > 0) {
    meta.source = 'cache';
    meta.lastSyncedAt = getLastSyncTime(status);
    return { matches: staleCache, meta };
  }

  // 4. Final fallback: existing mock data
  const fallback = getFallbackMatches(status);
  meta.source = 'fallback';
  meta.lastSyncedAt = null;
  return { matches: fallback, meta };
}

export async function getMatchDetail(matchId) {
  const match = getMatchById(matchId);
  if (!match) return null;
  return match;
}

export async function syncAll() {
  const results = { live: 0, upcoming: 0, recent: 0, errors: [] };

  for (const status of ['live', 'upcoming', 'completed']) {
    try {
      const { matches, meta } = await getMatches(status);
      results[status === 'completed' ? 'recent' : status] = matches.length;
    } catch (err) {
      results.errors.push({ status, error: err.message });
      logError(`syncAll error for ${status}: ${err.message}`);
    }
  }

  return results;
}

export async function processCompletedMatches() {
  // Check for matches that just completed and process predictions
  const { getDb } = await import('../db.js');
  const { processMatchResults } = await import('./matchService.js');
  const db = getDb();

  const justCompleted = db.prepare(`
    SELECT id, winner FROM matches
    WHERE status = 'completed' AND winner IS NOT NULL
      AND id IN (SELECT DISTINCT match_id FROM predictions WHERE is_correct IS NULL)
  `).all();

  let processed = 0;
  for (const match of justCompleted) {
    const result = processMatchResults(match.id, match.winner);
    if (result.success) processed += result.processed;
  }

  if (processed > 0) {
    info(`Processed ${processed} predictions from completed matches`);
    audit(null, 'predictions_auto_processed', { count: processed });
  }

  return processed;
}
