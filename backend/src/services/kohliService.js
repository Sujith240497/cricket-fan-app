import { getDb } from '../db.js';
import { getLevel, checkLevelUp, getStreakMultiplier } from './gameService.js';
import { logActivity } from './userService.js';
import { addNotification } from './notificationService.js';
import { checkAndAwardTitles } from './titleService.js';

const KOHLI_XP = 35; // Higher XP for harder mode

export function getKohliChallenge(userId) {
  const db = getDb();

  // Get 5 hard questions marked as kohli mode or hard difficulty
  const questions = db.prepare(`
    SELECT id, question, option_a, option_b, option_c, option_d, difficulty, time_limit
    FROM questions 
    WHERE (mode = 'kohli' OR difficulty = 'hard')
    ORDER BY RANDOM() LIMIT 5
  `).all();

  if (questions.length < 5) {
    // Fallback to any hard questions
    const fallback = db.prepare(`
      SELECT id, question, option_a, option_b, option_c, option_d, difficulty, time_limit
      FROM questions WHERE difficulty = 'hard'
      ORDER BY RANDOM() LIMIT 5
    `).all();
    return { questions: fallback, mode: 'kohli', timePerQuestion: 15, targetScore: 4 };
  }

  return {
    questions,
    mode: 'kohli',
    timePerQuestion: 15, // 15 seconds per question (pressure!)
    targetScore: 4 // Need 4/5 to "chase successfully"
  };
}

export function submitKohliAnswers(userId, answers) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) throw new Error('User not found');

  let correct = 0;
  let totalTime = 0;
  const results = [];

  const insertAnswer = db.prepare(`
    INSERT INTO user_answers (user_id, question_id, selected_option, is_correct, xp_earned, source)
    VALUES (?, ?, ?, ?, ?, 'kohli')
  `);

  for (const ans of answers) {
    const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(ans.questionId);
    if (!question) continue;

    const isCorrect = question.correct_option.toUpperCase() === ans.selectedOption?.toUpperCase() ? 1 : 0;
    if (isCorrect) correct++;
    totalTime += ans.timeTaken || 0;

    const xpEarned = isCorrect ? KOHLI_XP : 0;
    insertAnswer.run(userId, ans.questionId, ans.selectedOption, isCorrect, xpEarned);

    results.push({
      questionId: ans.questionId,
      correct: !!isCorrect,
      correctAnswer: question.correct_option,
      explanation: question.explanation,
      timeTaken: ans.timeTaken
    });
  }

  // Calculate total XP
  const multiplier = getStreakMultiplier(user.streak);
  const totalXp = Math.round(correct * KOHLI_XP * multiplier);

  // Award XP
  const oldXp = user.xp;
  db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(totalXp, userId);

  // Check chase success
  const chaseSuccess = correct >= 4;
  const detail = chaseSuccess
    ? `Kohli Mode: Chase successful! ${correct}/5 (${totalTime}ms)`
    : `Kohli Mode: Chase failed. ${correct}/5`;

  logActivity(userId, 'kohli_mode', detail, totalXp);

  if (chaseSuccess) {
    addNotification(userId, `Kohli Mode: Chase successful! ${correct}/5 correct. +${totalXp} XP 🏏`, 'kohli_win');
  }

  // Level up check
  const levelUp = checkLevelUp(oldXp, oldXp + totalXp);
  if (levelUp.leveledUp) {
    addNotification(userId, `Level up! You're now ${levelUp.newLevelName}!`, 'level_up');
  }

  // Title check
  checkAndAwardTitles(userId);

  return {
    correct,
    total: answers.length,
    xpEarned: totalXp,
    chaseSuccess,
    results,
    totalTime,
    levelUp: levelUp.leveledUp ? levelUp : null
  };
}
