import { makePrediction, getUserPredictions } from '../services/matchService.js';
import { validatePrediction } from '../utils/validate.js';
import { success, fail } from '../utils/response.js';

export function create(req, res) {
  const error = validatePrediction(req.body);
  if (error) return fail(res, error);

  const result = makePrediction(req.userId, parseInt(req.body.matchId), req.body.prediction);
  if (result.error) return fail(res, result.error);

  success(res, result);
}

export function mine(req, res) {
  const predictions = getUserPredictions(req.userId);
  success(res, { predictions });
}
