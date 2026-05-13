import { getDb } from '../db.js';
import { getLevel, checkLevelUp, calculateXp, getStreakMultiplier } from './gameService.js';
import { logActivity } from './userService.js';
import { addNotification } from './notificationService.js';
import { checkAndAwardTitles } from './titleService.js';
import { markDailyComplete } from './challengeService.js';
import { audit } from './auditService.js';
import { clearCache } from '../utils/cache.js';
import { getActiveMultipliers } from './multiplierService.js';

export function awardXp(userId, amount, source, detail) {
  if (amount <= 0) return { xpAwarded: 0, levelUp: null };

  const db = getDb();
  const user = db.prepare('SELECT xp FROM users WHERE id = ?').get(userId);
  if (!user) return { xpAwarded: 0, levelUp: null };

  // V6: Apply contextual multipliers (live event, reaction streak, etc.)
  // Streak multiplier is already baked into calculateXp, so we only apply non-streak multipliers here
  const { multipliers, combined } = getActiveMultipliers(userId, { source });
  const nonStreakCombined = multipliers
    .filter(m => m.key !== 'streak')
    .reduce((acc, m) => acc * m.multiplier, 1.0);
  const contextualAmount = Math.round(amount * Math.min(nonStreakCombined, 3.0));

  const oldXp = user.xp;
  const newXp = oldXp + contextualAmount;

  db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(contextualAmount, userId);

  logActivity(userId, source, detail, contextualAmount);
  audit(userId, 'xp_change', { amount: contextualAmount, baseAmount: amount, multiplier: nonStreakCombined, source, detail, oldXp, newXp });

  const levelUp = checkLevelUp(oldXp, newXp);
  if (levelUp.leveledUp) {
    addNotification(userId, `Level up! You're now ${levelUp.newLevelName}!`, 'level_up');
    logActivity(userId, 'level_up', `Reached ${levelUp.newLevelName}!`, 0);
    audit(userId, 'level_up', { newLevel: levelUp.newLevelName, tier: levelUp.newTier });
  }

  const newTitles = checkAndAwardTitles(userId);

  clearCache('leaderboard');
  clearCache('leaderboard_weekly');

  return {
    xpAwarded: contextualAmount,
    totalXp: newXp,
    level: getLevel(newXp),
    levelUp: levelUp.leveledUp ? levelUp : null,
    newTitles
  };
}

export function processQuizAnswer(userId, questionId, selectedOption) {
  const db = getDb();
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
  if (!question) return { error: 'Question not found' };

  const user = db.prepare('SELECT xp, streak FROM users WHERE id = ?').get(userId);
  if (!user) return { error: 'User not found' };

  const isCorrect = selectedOption.toUpperCase() === question.correct_option;
  let xpEarned = 0;

  if (isCorrect) {
    xpEarned = calculateXp(question.difficulty, user.streak);
  }

  db.prepare(`
    INSERT INTO user_answers (user_id, question_id, selected_option, is_correct, xp_earned, source)
    VALUES (?, ?, ?, ?, ?, 'quiz')
  `).run(userId, questionId, selectedOption.toUpperCase(), isCorrect ? 1 : 0, xpEarned);

  audit(userId, 'quiz_answer', { questionId, isCorrect, xpEarned, difficulty: question.difficulty });

  let result = { xpAwarded: 0, levelUp: null, level: getLevel(user.xp) };
  if (isCorrect && xpEarned > 0) {
    result = awardXp(userId, xpEarned, 'quiz_correct',
      `Answered correctly (+${xpEarned} XP) - ${question.difficulty}`);
  } else if (!isCorrect) {
    logActivity(userId, 'quiz_incorrect', 'Answered incorrectly', 0);
  }

  return {
    correct: isCorrect,
    correctOption: question.correct_option,
    explanation: question.explanation,
    xpEarned,
    totalXp: result.totalXp ?? user.xp,
    level: result.level,
    levelUp: result.levelUp,
    message: isCorrect
      ? xpEarned > calculateXp(question.difficulty, 0)
        ? `Correct! +${xpEarned} XP (streak bonus!)`
        : `Correct! +${xpEarned} XP`
      : `Incorrect. The answer was ${question.correct_option}.`
  };
}

export function processDailyAnswer(userId, questionId, selectedOption, challengeData) {
  const db = getDb();
  const user = db.prepare('SELECT xp, streak FROM users WHERE id = ?').get(userId);
  if (!user) return { error: 'User not found' };

  const isBonus = challengeData.question.difficulty === 'hard';
  let xpEarned = 0;

  if (challengeData.isCorrect) {
    xpEarned = isBonus
      ? calculateXp(null, user.streak, true)
      : calculateXp(challengeData.question.difficulty, user.streak);
  }

  db.prepare(`
    INSERT INTO user_answers (user_id, question_id, selected_option, is_correct, xp_earned, source)
    VALUES (?, ?, ?, ?, ?, 'daily')
  `).run(userId, questionId, selectedOption.toUpperCase(), challengeData.isCorrect ? 1 : 0, xpEarned);

  audit(userId, 'daily_answer', { questionId, isCorrect: challengeData.isCorrect, xpEarned, isBonus });

  let result = { xpAwarded: 0, levelUp: null, level: getLevel(user.xp) };
  if (challengeData.isCorrect && xpEarned > 0) {
    result = awardXp(userId, xpEarned, 'daily_correct',
      `Daily challenge: correct${isBonus ? ' (bonus)' : ''} (+${xpEarned} XP)`);
  } else if (!challengeData.isCorrect) {
    logActivity(userId, 'daily_incorrect', 'Daily challenge: incorrect', 0);
  }

  const answeredCount = db.prepare(
    `SELECT COUNT(*) as cnt FROM user_answers WHERE user_id = ? AND source = 'daily' AND question_id IN (${
      challengeData.questionIds.map(() => '?').join(',')
    }) AND date(answered_at) = ?`
  ).get(userId, ...challengeData.questionIds, challengeData.today).cnt;

  const allDone = answeredCount >= challengeData.questionIds.length;
  if (allDone) {
    markDailyComplete(db, challengeData.challengeId);
    logActivity(userId, 'daily_complete', 'Completed daily challenge!', 0);
    audit(userId, 'daily_complete', { challengeId: challengeData.challengeId });
  }

  return {
    correct: challengeData.isCorrect,
    correctOption: challengeData.correctOption,
    explanation: challengeData.explanation,
    isBonus,
    xpEarned,
    totalXp: result.totalXp ?? user.xp,
    level: result.level,
    levelUp: result.levelUp,
    allDone,
    message: challengeData.isCorrect
      ? `Correct! +${xpEarned} XP${isBonus ? ' (daily bonus!)' : ''}`
      : `Incorrect. The answer was ${challengeData.correctOption}.`
  };
}

export function processKohliAnswers(userId, answers) {
  const db = getDb();
  const user = db.prepare('SELECT xp, streak FROM users WHERE id = ?').get(userId);
  if (!user) return { error: 'User not found' };

  const KOHLI_XP = 35;
  let correct = 0;
  let totalTime = 0;
  const results = [];

  for (const ans of answers) {
    const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(ans.questionId);
    if (!question) continue;

    const isCorrect = question.correct_option.toUpperCase() === ans.selectedOption?.toUpperCase() ? 1 : 0;
    if (isCorrect) correct++;
    totalTime += ans.timeTaken || 0;

    db.prepare(`
      INSERT INTO user_answers (user_id, question_id, selected_option, is_correct, xp_earned, source)
      VALUES (?, ?, ?, ?, ?, 'kohli')
    `).run(userId, ans.questionId, ans.selectedOption, isCorrect, isCorrect ? KOHLI_XP : 0);

    results.push({
      questionId: ans.questionId,
      correct: !!isCorrect,
      correctAnswer: question.correct_option,
      explanation: question.explanation,
      timeTaken: ans.timeTaken
    });
  }

  const multiplier = getStreakMultiplier(user.streak);
  const totalXpEarned = Math.round(correct * KOHLI_XP * multiplier);
  const chaseSuccess = correct >= 4;

  audit(userId, 'kohli_mode', { correct, total: answers.length, totalXpEarned, chaseSuccess });

  let xpResult = { levelUp: null };
  if (totalXpEarned > 0) {
    const detail = chaseSuccess
      ? `Kohli Mode: Chase successful! ${correct}/5 (${totalTime}ms)`
      : `Kohli Mode: Chase failed. ${correct}/5`;
    xpResult = awardXp(userId, totalXpEarned, 'kohli_mode', detail);
  }

  if (chaseSuccess) {
    addNotification(userId, `Kohli Mode: Chase successful! ${correct}/5 correct. +${totalXpEarned} XP 🏏`, 'kohli_win');
  }

  return {
    correct,
    total: answers.length,
    xpEarned: totalXpEarned,
    chaseSuccess,
    results,
    totalTime,
    levelUp: xpResult.levelUp
  };
}

export function processBattleResult(battleId) {
  const db = getDb();
  const battle = db.prepare('SELECT * FROM battles WHERE id = ?').get(battleId);
  if (!battle || battle.status !== 'active') return;

  const answersA = db.prepare('SELECT COUNT(*) as c FROM battle_answers WHERE battle_id = ? AND user_id = ?').get(battleId, battle.user_a).c;
  const answersB = db.prepare('SELECT COUNT(*) as c FROM battle_answers WHERE battle_id = ? AND user_id = ?').get(battleId, battle.user_b).c;

  if (answersA === 0 || answersB === 0) return;

  let winner = null;
  if (battle.score_a > battle.score_b) {
    winner = battle.user_a;
  } else if (battle.score_b > battle.score_a) {
    winner = battle.user_b;
  } else if (battle.time_a && battle.time_b) {
    winner = (battle.time_a <= battle.time_b) ? battle.user_a : battle.user_b;
  }

  const winnerXp = 30;
  const loserXp = 10;
  const drawXp = 15;

  const xpA = winner === battle.user_a ? winnerXp : (winner === null ? drawXp : loserXp);
  const xpB = winner === battle.user_b ? winnerXp : (winner === null ? drawXp : loserXp);

  db.prepare(`
    UPDATE battles SET status = 'completed', winner = ?, xp_reward_a = ?, xp_reward_b = ?, completed_at = datetime('now')
    WHERE id = ?
  `).run(winner, xpA, xpB, battleId);

  const userA = db.prepare('SELECT username FROM users WHERE id = ?').get(battle.user_a);
  const userB = db.prepare('SELECT username FROM users WHERE id = ?').get(battle.user_b);

  awardXp(battle.user_a, xpA, 'battle_completed', `Battle vs ${userB?.username || 'Unknown'}: ${battle.score_a}-${battle.score_b}`);
  awardXp(battle.user_b, xpB, 'battle_completed', `Battle vs ${userA?.username || 'Unknown'}: ${battle.score_b}-${battle.score_a}`);

  audit(battle.user_a, 'battle_result', { battleId, winner, scoreA: battle.score_a, scoreB: battle.score_b, xpAwarded: xpA });
  audit(battle.user_b, 'battle_result', { battleId, winner, scoreA: battle.score_a, scoreB: battle.score_b, xpAwarded: xpB });

  if (winner) {
    const loser = winner === battle.user_a ? battle.user_b : battle.user_a;
    addNotification(winner, `You won the battle! +${winnerXp} XP`, 'battle_win');
    addNotification(loser, `You lost the battle. +${loserXp} XP for trying!`, 'battle_loss');
  } else {
    addNotification(battle.user_a, `Battle ended in a draw! +${drawXp} XP`, 'battle_draw');
    addNotification(battle.user_b, `Battle ended in a draw! +${drawXp} XP`, 'battle_draw');
  }
}

export function processReferral(referrerId, referredId, referralXp = 50) {
  const userA = awardXp(referrerId, referralXp, 'referral_bonus', `Referral bonus`);
  awardXp(referredId, referralXp, 'referral_bonus', `Used referral code`);
  audit(referrerId, 'referral_claimed', { referredId, xpAwarded: referralXp });
  audit(referredId, 'referral_used', { referrerId, xpAwarded: referralXp });
  return userA;
}

export function processPredictionResult(userId, matchId, isCorrect, predictionXp = 20) {
  if (isCorrect) {
    awardXp(userId, predictionXp, 'prediction_correct', `Correct prediction for match #${matchId}`);
    addNotification(userId, `Prediction correct! +${predictionXp} XP`, 'prediction_result');
  } else {
    addNotification(userId, 'Prediction incorrect. Better luck next time!', 'prediction_result');
    logActivity(userId, 'prediction_incorrect', `Wrong prediction for match #${matchId}`, 0);
  }
  audit(userId, 'prediction_result', { matchId, isCorrect, xpAwarded: isCorrect ? predictionXp : 0 });
}
