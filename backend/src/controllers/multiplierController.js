import { getActiveMultipliers, clearExpiredMultipliers } from '../services/multiplierService.js';
import { success } from '../utils/response.js';

export function getMultipliers(req, res) {
  clearExpiredMultipliers();
  const data = getActiveMultipliers(req.userId, { source: req.query.source || null });
  return success(res, data);
}
