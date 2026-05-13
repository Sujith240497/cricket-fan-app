import { calculateMomentOfDay, getMomentOfDay, getUserMoments } from '../services/momentService.js';
import { success } from '../utils/response.js';

export function getToday(req, res) {
  const date = req.query.date || null;
  let data = getMomentOfDay(date);
  // Auto-calculate if no moment exists for today
  if (!data.topMoment && !date) {
    calculateMomentOfDay();
    data = getMomentOfDay();
  }
  return success(res, data);
}

export function getMyMoments(req, res) {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const data = getUserMoments(req.userId, limit);
  return success(res, data);
}
