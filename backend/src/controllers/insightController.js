import { getUserInsights, getEngagementTimeline } from '../services/intelligenceService.js';
import { success } from '../utils/response.js';

export function getInsights(req, res) {
  const data = getUserInsights(req.userId);
  return success(res, data);
}

export function getTimeline(req, res) {
  const limit = Math.min(parseInt(req.query.limit) || 30, 100);
  const data = getEngagementTimeline(req.userId, limit);
  return success(res, data);
}
