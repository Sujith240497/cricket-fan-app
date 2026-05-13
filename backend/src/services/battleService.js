import { getDb } from '../db.js';
import { logActivity } from './userService.js';
import { addNotification } from './notificationService.js';
import { awardXp } from './gameEngine.js';

export function createBattle(userId, type = 'quiz') {
  const db = getDb();

  // Get 5 random questions for the battle
  const questions = db.prepare(`
    SELECT id FROM questions WHERE mode = 'normal'
    ORDER BY RANDOM() LIMIT 5
  `).all();

  if (questions.length < 5) {
    throw new Error('Not enough questions available for a battle');
  }

  const questionIds = questions.map(q => q.id).join(',');

  const result = db.prepare(`
    INSERT INTO battles (user_a, type, question_ids, status)
    VALUES (?, ?, ?, 'waiting')
  `).run(userId, type, questionIds);

  logActivity(userId, 'battle_created', `Created a ${type} battle`);

  return {
    battleId: result.lastInsertRowid,
    type,
    questionIds: questions.map(q => q.id)
  };
}

export function getOpenBattles(userId) {
  const db = getDb();
  return db.prepare(`
    SELECT b.*, u.username as creator_name
    FROM battles b
    JOIN users u ON u.id = b.user_a
    WHERE b.status = 'waiting' AND b.user_a != ?
    ORDER BY b.created_at DESC LIMIT 20
  `).all(userId);
}

export function joinBattle(battleId, userId) {
  const db = getDb();
  const battle = db.prepare('SELECT * FROM battles WHERE id = ?').get(battleId);

  if (!battle) throw new Error('Battle not found');
  if (battle.status !== 'waiting') throw new Error('Battle is no longer available');
  if (battle.user_a === userId) throw new Error('Cannot join your own battle');

  db.prepare(`
    UPDATE battles SET user_b = ?, status = 'active' WHERE id = ?
  `).run(userId, battleId);

  logActivity(userId, 'battle_joined', `Joined a ${battle.type} battle`);

  const questions = db.prepare(`
    SELECT id, question, option_a, option_b, option_c, option_d, difficulty, time_limit
    FROM questions WHERE id IN (${battle.question_ids})
  `).all();

  return { battle: { ...battle, user_b: userId, status: 'active' }, questions };
}

export function submitBattleAnswers(battleId, userId, answers) {
  const db = getDb();
  const battle = db.prepare('SELECT * FROM battles WHERE id = ?').get(battleId);

  if (!battle) throw new Error('Battle not found');
  if (battle.user_a !== userId && battle.user_b !== userId) {
    throw new Error('You are not in this battle');
  }
  if (battle.status !== 'active') throw new Error('Battle is not active');

  // Check if user already submitted
  const existing = db.prepare(`
    SELECT COUNT(*) as count FROM battle_answers WHERE battle_id = ? AND user_id = ?
  `).get(battleId, userId);

  if (existing.count > 0) throw new Error('Already submitted answers for this battle');

  let score = 0;
  let totalTime = 0;

  const questionIds = battle.question_ids.split(',').map(Number);
  const questions = db.prepare(`
    SELECT id, correct_option FROM questions WHERE id IN (${questionIds.join(',')})
  `).all();

  const questionMap = {};
  questions.forEach(q => { questionMap[q.id] = q.correct_option; });

  const insertAnswer = db.prepare(`
    INSERT INTO battle_answers (battle_id, user_id, question_id, selected_option, is_correct, time_taken)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction(() => {
    for (const ans of answers) {
      const isCorrect = questionMap[ans.questionId]?.toUpperCase() === ans.selectedOption?.toUpperCase() ? 1 : 0;
      if (isCorrect) score++;
      totalTime += ans.timeTaken || 0;
      insertAnswer.run(battleId, userId, ans.questionId, ans.selectedOption, isCorrect, ans.timeTaken || 0);
    }
  });
  insertMany();

  // Update score
  const isUserA = battle.user_a === userId;
  if (isUserA) {
    db.prepare('UPDATE battles SET score_a = ?, time_a = ? WHERE id = ?').run(score, totalTime, battleId);
  } else {
    db.prepare('UPDATE battles SET score_b = ?, time_b = ? WHERE id = ?').run(score, totalTime, battleId);
  }

  // Check if both have submitted
  const updated = db.prepare('SELECT * FROM battles WHERE id = ?').get(battleId);
  const bothSubmitted = updated.score_a !== null && updated.score_b !== null
    && (isUserA ? (updated.score_b !== 0 || db.prepare('SELECT COUNT(*) as c FROM battle_answers WHERE battle_id = ? AND user_id = ?').get(battleId, battle.user_b).c > 0) : true)
    && (!isUserA ? (updated.score_a !== 0 || db.prepare('SELECT COUNT(*) as c FROM battle_answers WHERE battle_id = ? AND user_id = ?').get(battleId, battle.user_a).c > 0) : true);

  // Simpler check: both users have answers
  const answersA = db.prepare('SELECT COUNT(*) as c FROM battle_answers WHERE battle_id = ? AND user_id = ?').get(battleId, battle.user_a).c;
  const answersB = db.prepare('SELECT COUNT(*) as c FROM battle_answers WHERE battle_id = ? AND user_id = ?').get(battleId, battle.user_b).c;

  if (answersA > 0 && answersB > 0) {
    resolveBattle(battleId);
  }

  return { score, totalTime, submitted: true };
}

function resolveBattle(battleId) {
  const db = getDb();
  const battle = db.prepare('SELECT * FROM battles WHERE id = ?').get(battleId);

  let winner = null;
  if (battle.score_a > battle.score_b) {
    winner = battle.user_a;
  } else if (battle.score_b > battle.score_a) {
    winner = battle.user_b;
  } else {
    if (battle.type === 'speed' || (battle.time_a && battle.time_b)) {
      winner = (battle.time_a || Infinity) <= (battle.time_b || Infinity) ? battle.user_a : battle.user_b;
    }
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

  if (winner) {
    const loser = winner === battle.user_a ? battle.user_b : battle.user_a;
    addNotification(winner, `You won the battle! +${winnerXp} XP`, 'battle_win');
    addNotification(loser, `You lost the battle. +${loserXp} XP for trying!`, 'battle_loss');
  } else {
    addNotification(battle.user_a, `Battle ended in a draw! +${drawXp} XP`, 'battle_draw');
    addNotification(battle.user_b, `Battle ended in a draw! +${drawXp} XP`, 'battle_draw');
  }
}

export function getBattleResult(battleId, userId) {
  const db = getDb();
  const battle = db.prepare(`
    SELECT b.*, 
      ua.username as user_a_name, ub.username as user_b_name
    FROM battles b
    JOIN users u ON u.id = b.user_a
    LEFT JOIN users ua ON ua.id = b.user_a
    LEFT JOIN users ub ON ub.id = b.user_b
    WHERE b.id = ?
  `).get(battleId);

  if (!battle) throw new Error('Battle not found');
  if (battle.user_a !== userId && battle.user_b !== userId) {
    throw new Error('You are not in this battle');
  }

  return battle;
}

export function getUserBattles(userId) {
  const db = getDb();
  return db.prepare(`
    SELECT b.*, 
      ua.username as user_a_name, ub.username as user_b_name
    FROM battles b
    LEFT JOIN users ua ON ua.id = b.user_a
    LEFT JOIN users ub ON ub.id = b.user_b
    WHERE (b.user_a = ? OR b.user_b = ?)
    ORDER BY b.created_at DESC LIMIT 20
  `).all(userId, userId);
}

export function getBattleQuestions(battleId, userId) {
  const db = getDb();
  const battle = db.prepare('SELECT * FROM battles WHERE id = ?').get(battleId);
  if (!battle) throw new Error('Battle not found');
  if (battle.user_a !== userId && battle.user_b !== userId) {
    throw new Error('You are not in this battle');
  }

  const questions = db.prepare(`
    SELECT id, question, option_a, option_b, option_c, option_d, difficulty, time_limit
    FROM questions WHERE id IN (${battle.question_ids})
  `).all();

  return { battle, questions };
}
