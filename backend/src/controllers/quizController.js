import { getDb } from '../db.js';
import { processQuizAnswer } from '../services/gameEngine.js';
import { validateAnswer, validateDifficulty } from '../utils/validate.js';
import { success, fail, notFound } from '../utils/response.js';

export function getQuestions(req, res) {
  const db = getDb();
  const difficulty = req.query.difficulty;

  const diffError = validateDifficulty(difficulty);
  if (diffError) return fail(res, diffError);

  const recentAnswers = db.prepare(
    "SELECT question_id FROM user_answers WHERE user_id = ? AND source = 'quiz' ORDER BY answered_at DESC LIMIT 20"
  ).all(req.userId).map(r => r.question_id);

  let query = "SELECT id, question, option_a, option_b, option_c, option_d, category, difficulty FROM questions WHERE mode = 'normal'";
  const params = [];

  if (recentAnswers.length > 0) {
    query += ` AND id NOT IN (${recentAnswers.map(() => '?').join(',')})`;
    params.push(...recentAnswers);
  }

  if (difficulty) {
    query += ' AND difficulty = ?';
    params.push(difficulty);
  }

  query += ' ORDER BY RANDOM() LIMIT 5';
  let questions = db.prepare(query).all(...params);

  if (questions.length < 5) {
    let fallbackQuery = "SELECT id, question, option_a, option_b, option_c, option_d, category, difficulty FROM questions WHERE mode = 'normal'";
    const fallbackParams = [];
    if (difficulty) {
      fallbackQuery += ' AND difficulty = ?';
      fallbackParams.push(difficulty);
    }
    fallbackQuery += ' ORDER BY RANDOM() LIMIT 5';
    questions = db.prepare(fallbackQuery).all(...fallbackParams);
  }

  success(res, { questions });
}

export function submitAnswer(req, res) {
  const error = validateAnswer(req.body);
  if (error) return fail(res, error);

  const { questionId, selectedOption } = req.body;
  const result = processQuizAnswer(req.userId, questionId, selectedOption);

  if (result.error) {
    return result.error === 'Question not found' ? notFound(res, result.error) : fail(res, result.error);
  }

  success(res, result);
}
