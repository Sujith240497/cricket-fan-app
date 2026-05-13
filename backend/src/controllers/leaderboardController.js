import { getLeaderboard, getUserRank, compareUsers, getWeeklyLeaderboard, getTopMovers } from '../services/leaderboardService.js';
import { getCache, setCache } from '../utils/cache.js';
import { success, fail, notFound } from '../utils/response.js';
import { positiveInt } from '../utils/validate.js';

export function getGlobal(req, res) {
  let data = getCache('leaderboard');
  if (!data) {
    data = getLeaderboard(50);
    setCache('leaderboard', data, 30000);
  }
  const userRank = getUserRank(req.userId);
  success(res, { leaderboard: data, userRank });
}

export function getWeekly(req, res) {
  let data = getCache('leaderboard_weekly');
  if (!data) {
    data = getWeeklyLeaderboard(20);
    setCache('leaderboard_weekly', data, 30000);
  }
  const userRank = getUserRank(req.userId);
  success(res, { leaderboard: data, userRank });
}

export function getMovers(req, res) {
  const movers = getTopMovers(10);
  success(res, { movers });
}

export function compare(req, res) {
  const otherUserId = positiveInt(req.params.userId);
  if (!otherUserId || otherUserId === req.userId) return fail(res, 'Invalid user to compare');

  const comparison = compareUsers(req.userId, otherUserId);
  if (!comparison) return notFound(res, 'User not found');

  success(res, comparison);
}
