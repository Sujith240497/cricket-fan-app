import { getUpcomingMatches, getLiveMatches, getCompletedMatches, getAllMatches, processMatchResults } from '../services/matchService.js';
import { getMatches, getMatchDetail, syncAll, processCompletedMatches } from '../services/matchDataProviderService.js';
import { success, fail, notFound } from '../utils/response.js';
import { sanitize } from '../utils/validate.js';

export async function upcoming(req, res) {
  const { matches, meta } = await getMatches('upcoming');
  return success(res, { matches }, '', meta);
}

export async function live(req, res) {
  const { matches, meta } = await getMatches('live');
  return success(res, { matches }, '', meta);
}

export async function completed(req, res) {
  const { matches, meta } = await getMatches('completed');
  return success(res, { matches }, '', meta);
}

export async function all(req, res) {
  success(res, { matches: getAllMatches() });
}

export async function getMatch(req, res) {
  const match = await getMatchDetail(parseInt(req.params.id));
  if (!match) return notFound(res, 'Match not found');
  return success(res, match);
}

export function completeMatch(req, res) {
  const matchId = parseInt(req.params.matchId);
  const winner = sanitize(req.body.winner);
  if (!winner) return fail(res, 'winner is required');

  const result = processMatchResults(matchId, winner);
  if (result.error) return fail(res, result.error);

  success(res, result);
}

export async function syncMatches(req, res) {
  const results = await syncAll();
  await processCompletedMatches();
  success(res, results, 'Sync completed');
}
