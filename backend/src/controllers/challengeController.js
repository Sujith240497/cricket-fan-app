import { getOrCreateDailyChallenge, submitDailyAnswer } from '../services/challengeService.js';
import { processDailyAnswer } from '../services/gameEngine.js';
import { validateAnswer } from '../utils/validate.js';
import { success, fail } from '../utils/response.js';

export function getToday(req, res) {
  const challenge = getOrCreateDailyChallenge(req.userId);
  if (!challenge) return fail(res, 'Could not generate daily challenge', 500);
  success(res, { challenge });
}

export function submitChallenge(req, res) {
  const error = validateAnswer(req.body);
  if (error) return fail(res, error);

  const { questionId, selectedOption } = req.body;

  const challengeResult = submitDailyAnswer(req.userId, questionId, selectedOption);
  if (challengeResult.error) return fail(res, challengeResult.error);

  const result = processDailyAnswer(req.userId, questionId, selectedOption, challengeResult);
  if (result.error) return fail(res, result.error);

  success(res, result);
}
