import { audit } from './auditService.js';
import { error as logError, info } from '../utils/logger.js';

const BASE_URL = process.env.CRICKETDATA_BASE_URL || 'https://api.cricketdata.org/v1';
const API_KEY = process.env.CRICKETDATA_API_KEY;
const TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;
const BACKOFF_MS = 1000;

let inFlightRequests = new Map();

async function fetchWithRetry(url, retries = MAX_RETRIES) {
  // Deduplicate concurrent requests to same URL
  if (inFlightRequests.has(url)) {
    return inFlightRequests.get(url);
  }

  const promise = (async () => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const res = await fetch(url, {
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.status === 429) {
          logError('CricketData API rate limited');
          audit(null, 'api_rate_limited', { url, attempt });
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, BACKOFF_MS * Math.pow(2, attempt)));
            continue;
          }
          return null;
        }

        if (!res.ok) {
          logError(`CricketData API error: ${res.status} ${res.statusText}`);
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, BACKOFF_MS * Math.pow(2, attempt)));
            continue;
          }
          return null;
        }

        const data = await res.json();
        return data;
      } catch (err) {
        logError(`CricketData API fetch error (attempt ${attempt + 1}): ${err.message}`);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, BACKOFF_MS * Math.pow(2, attempt)));
          continue;
        }
        return null;
      }
    }
    return null;
  })();

  inFlightRequests.set(url, promise);
  try {
    return await promise;
  } finally {
    inFlightRequests.delete(url);
  }
}

export function isConfigured() {
  return !!(API_KEY && API_KEY !== 'YOUR_API_KEY_HERE');
}

export async function fetchCurrentMatches() {
  if (!isConfigured()) return null;
  const url = `${BASE_URL}/currentMatches?apikey=${API_KEY}&offset=0`;
  const data = await fetchWithRetry(url);
  if (data && data.data) {
    info(`CricketData: Fetched ${data.data.length} current matches`);
    return data.data;
  }
  return null;
}

export async function fetchMatchList(type = 'upcoming') {
  if (!isConfigured()) return null;
  // Fetch multiple pages to ensure we get all relevant matches (IPL, ICC etc.)
  const allMatches = [];
  const maxOffsets = [0, 25, 50]; // 3 pages = up to 75 matches

  for (const offset of maxOffsets) {
    const url = `${BASE_URL}/matches?apikey=${API_KEY}&offset=${offset}&type=${type}`;
    const data = await fetchWithRetry(url);
    if (data && data.data && data.data.length > 0) {
      allMatches.push(...data.data);
    } else {
      break; // No more data
    }
  }

  if (allMatches.length > 0) {
    info(`CricketData: Fetched ${allMatches.length} ${type} matches (across ${maxOffsets.length} pages)`);
    return allMatches;
  }
  return null;
}

export async function fetchMatchById(externalId) {
  if (!isConfigured()) return null;
  const url = `${BASE_URL}/match_info?apikey=${API_KEY}&id=${externalId}`;
  const data = await fetchWithRetry(url);
  if (data && data.data) return data.data;
  return null;
}

export function normalizeMatch(raw) {
  // Normalize CricketData.org response to our schema
  if (!raw) return null;

  const teamA = raw.teamInfo?.[0]?.name || raw.teams?.[0] || 'TBA';
  const teamB = raw.teamInfo?.[1]?.name || raw.teams?.[1] || 'TBA';

  let status = 'upcoming';
  if (raw.matchStarted && !raw.matchEnded) status = 'live';
  else if (raw.matchEnded) status = 'completed';

  return {
    external_id: raw.id || null,
    team_a: teamA,
    team_b: teamB,
    match_date: raw.dateTimeGMT || raw.date || new Date().toISOString(),
    venue: raw.venue || null,
    status,
    series_name: raw.series_id ? raw.name : (raw.series || null),
    match_type: raw.matchType || null,
    result_text: raw.status || null,
    winner: raw.matchWinner || null,
    raw_payload: JSON.stringify(raw)
  };
}
