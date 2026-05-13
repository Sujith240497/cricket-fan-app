import { getDb } from '../db.js';

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

export function getOrCreateDailyChallenge(userId) {
  const db = getDb();
  const today = getTodayString();

  const existing = db.prepare('SELECT * FROM daily_challenges WHERE user_id = ? AND challenge_date = ?').get(userId, today);
  if (existing) {
    const questionIds = JSON.parse(existing.question_ids);
    const questions = getQuestionsByIds(db, questionIds);
    const answers = getDailyChallengeAnswers(db, userId, questionIds, today);
    return {
      id: existing.id,
      date: existing.challenge_date,
      questions,
      answers,
      completed: existing.completed === 1,
      completedAt: existing.completed_at
    };
  }

  // Generate new daily challenge: 3 easy/medium + 1 hard bonus
  const regularQs = db.prepare(
    "SELECT id FROM questions WHERE difficulty IN ('easy','medium') ORDER BY RANDOM() LIMIT 3"
  ).all();

  const bonusQ = db.prepare(
    "SELECT id FROM questions WHERE difficulty = 'hard' ORDER BY RANDOM() LIMIT 1"
  ).all();

  const questionIds = [...regularQs.map(q => q.id), ...bonusQ.map(q => q.id)];

  if (questionIds.length === 0) {
    return null;
  }

  db.prepare('INSERT INTO daily_challenges (user_id, challenge_date, question_ids) VALUES (?, ?, ?)').run(userId, today, JSON.stringify(questionIds));

  const challenge = db.prepare('SELECT * FROM daily_challenges WHERE user_id = ? AND challenge_date = ?').get(userId, today);
  const questions = getQuestionsByIds(db, questionIds);

  return {
    id: challenge.id,
    date: challenge.challenge_date,
    questions,
    answers: [],
    completed: false,
    completedAt: null
  };
}

function getQuestionsByIds(db, ids) {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  return db.prepare(
    `SELECT id, question, option_a, option_b, option_c, option_d, category, difficulty FROM questions WHERE id IN (${placeholders})`
  ).all(...ids);
}

function getDailyChallengeAnswers(db, userId, questionIds, date) {
  if (questionIds.length === 0) return [];
  const placeholders = questionIds.map(() => '?').join(',');
  return db.prepare(
    `SELECT question_id, selected_option, is_correct, xp_earned FROM user_answers
     WHERE user_id = ? AND source = 'daily' AND question_id IN (${placeholders})
     AND date(answered_at) = ?`
  ).all(userId, ...questionIds, date);
}

export function submitDailyAnswer(userId, questionId, selectedOption) {
  const db = getDb();
  const today = getTodayString();

  const challenge = db.prepare('SELECT * FROM daily_challenges WHERE user_id = ? AND challenge_date = ?').get(userId, today);
  if (!challenge) {
    return { error: 'No daily challenge found for today' };
  }
  if (challenge.completed) {
    return { error: 'Daily challenge already completed' };
  }

  const questionIds = JSON.parse(challenge.question_ids);
  if (!questionIds.includes(questionId)) {
    return { error: 'Question is not part of today\'s daily challenge' };
  }

  const alreadyAnswered = db.prepare(
    "SELECT id FROM user_answers WHERE user_id = ? AND question_id = ? AND source = 'daily' AND date(answered_at) = ?"
  ).get(userId, questionId, today);
  if (alreadyAnswered) {
    return { error: 'Question already answered in this daily challenge' };
  }

  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
  if (!question) {
    return { error: 'Question not found' };
  }

  const isCorrect = selectedOption.toUpperCase() === question.correct_option;

  return {
    isCorrect,
    correctOption: question.correct_option,
    explanation: question.explanation,
    question,
    questionIds,
    challengeId: challenge.id,
    today
  };
}

export function markDailyComplete(db, challengeId) {
  db.prepare('UPDATE daily_challenges SET completed = 1, completed_at = datetime(\'now\') WHERE id = ?').run(challengeId);
}
