import { getKohliChallenge } from '../services/kohliService.js';
import { processKohliAnswers } from '../services/gameEngine.js';
import { validateBattleAnswers } from '../utils/validate.js';
import { success, fail } from '../utils/response.js';
import { getDb } from '../db.js';
import { getKohliTeams } from '../services/matchRelevanceService.js';

export function challenge(req, res) {
  try {
    const data = getKohliChallenge(req.userId);
    success(res, data);
  } catch (err) {
    fail(res, err.message, 500);
  }
}

export function submit(req, res) {
  const error = validateBattleAnswers(req.body);
  if (error) return fail(res, error);

  try {
    const result = processKohliAnswers(req.userId, req.body.answers);
    if (result.error) return fail(res, result.error);
    success(res, result);
  } catch (err) {
    fail(res, err.message);
  }
}

export function kohliMatches(req, res) {
  const db = getDb();
  const kohliTeams = getKohliTeams();

  // Build dynamic WHERE clause for all Kohli teams from config
  const conditions = kohliTeams.map(() => '(team_a LIKE ? OR team_b LIKE ?)').join(' OR ');
  const params = kohliTeams.flatMap(t => [`%${t}%`, `%${t}%`]);

  const matches = db.prepare(`
    SELECT * FROM matches
    WHERE (${conditions})
      AND status IN ('upcoming', 'live')
    ORDER BY
      CASE WHEN relevance_category = 'kohli' THEN 0 ELSE 1 END,
      match_date ASC
    LIMIT 10
  `).all(...params);

  success(res, { matches, teams: kohliTeams });
}
