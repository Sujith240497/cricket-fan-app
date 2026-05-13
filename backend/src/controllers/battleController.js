import { createBattle, getOpenBattles, joinBattle, submitBattleAnswers, getBattleResult, getUserBattles, getBattleQuestions } from '../services/battleService.js';
import { validateBattleAnswers, validateBattleType, positiveInt } from '../utils/validate.js';
import { success, fail } from '../utils/response.js';

export function create(req, res) {
  const typeError = validateBattleType(req.body.type);
  if (typeError) return fail(res, typeError);

  try {
    const result = createBattle(req.userId, req.body.type || 'quiz');
    success(res, result, 'Battle created');
  } catch (err) {
    fail(res, err.message);
  }
}

export function open(req, res) {
  try {
    const battles = getOpenBattles(req.userId);
    success(res, { battles });
  } catch (err) {
    fail(res, err.message, 500);
  }
}

export function join(req, res) {
  const battleId = positiveInt(req.params.battleId);
  if (!battleId) return fail(res, 'Invalid battle ID');

  try {
    const result = joinBattle(battleId, req.userId);
    success(res, result, 'Joined battle');
  } catch (err) {
    fail(res, err.message);
  }
}

export function questions(req, res) {
  const battleId = positiveInt(req.params.battleId);
  if (!battleId) return fail(res, 'Invalid battle ID');

  try {
    const result = getBattleQuestions(battleId, req.userId);
    success(res, result);
  } catch (err) {
    fail(res, err.message);
  }
}

export function submit(req, res) {
  const battleId = positiveInt(req.params.battleId);
  if (!battleId) return fail(res, 'Invalid battle ID');

  const error = validateBattleAnswers(req.body);
  if (error) return fail(res, error);

  try {
    const result = submitBattleAnswers(battleId, req.userId, req.body.answers);
    success(res, result, 'Answers submitted');
  } catch (err) {
    fail(res, err.message);
  }
}

export function result(req, res) {
  const battleId = positiveInt(req.params.battleId);
  if (!battleId) return fail(res, 'Invalid battle ID');

  try {
    const battle = getBattleResult(battleId, req.userId);
    success(res, { battle });
  } catch (err) {
    fail(res, err.message);
  }
}

export function history(req, res) {
  try {
    const battles = getUserBattles(req.userId);
    success(res, { battles });
  } catch (err) {
    fail(res, err.message, 500);
  }
}
