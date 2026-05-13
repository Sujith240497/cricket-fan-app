import { getUserTitles, getAllTitleDefinitions, checkAndAwardTitles } from '../services/titleService.js';
import { positiveInt } from '../utils/validate.js';
import { success, fail } from '../utils/response.js';

export function mine(req, res) {
  try {
    const titles = getUserTitles(req.userId);
    success(res, { titles });
  } catch (err) {
    fail(res, err.message, 500);
  }
}

export function userTitles(req, res) {
  const userId = positiveInt(req.params.userId);
  if (!userId) return fail(res, 'Invalid user ID');

  try {
    const titles = getUserTitles(userId);
    success(res, { titles });
  } catch (err) {
    fail(res, err.message, 500);
  }
}

export function allTitles(req, res) {
  const definitions = getAllTitleDefinitions();
  const userTitlesData = getUserTitles(req.userId);
  const unlockedKeys = userTitlesData.map(t => t.condition_key);

  const result = definitions.map(d => ({
    ...d,
    unlocked: unlockedKeys.includes(d.key)
  }));
  success(res, { titles: result });
}

export function check(req, res) {
  try {
    const newTitles = checkAndAwardTitles(req.userId);
    success(res, { newTitles });
  } catch (err) {
    fail(res, err.message, 500);
  }
}
