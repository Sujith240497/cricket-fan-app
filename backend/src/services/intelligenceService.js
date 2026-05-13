import { getDb } from '../db.js';
import { getLevel } from './gameService.js';

export function getUserInsights(userId) {
  const db = getDb();
  const insights = [];

  // 1. Quiz performance by difficulty
  const byDifficulty = db.prepare(`
    SELECT q.difficulty,
      COUNT(*) as total,
      SUM(ua.is_correct) as correct
    FROM user_answers ua
    JOIN questions q ON q.id = ua.question_id
    WHERE ua.user_id = ? AND ua.source = 'quiz'
    GROUP BY q.difficulty
  `).all(userId);

  let bestDifficulty = null;
  let bestAccuracy = 0;
  for (const d of byDifficulty) {
    const acc = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
    if (acc > bestAccuracy && d.total >= 3) {
      bestAccuracy = acc;
      bestDifficulty = d.difficulty;
    }
  }
  if (bestDifficulty) {
    insights.push({
      type: 'strength',
      icon: '💪',
      text: `You crush ${bestDifficulty} questions (${bestAccuracy}% accuracy)`,
      data: { difficulty: bestDifficulty, accuracy: bestAccuracy }
    });
  }

  // 2. Performance trend (last 10 vs previous 10)
  const recent10 = db.prepare(`
    SELECT SUM(is_correct) as correct, COUNT(*) as total
    FROM (SELECT * FROM user_answers WHERE user_id = ? ORDER BY answered_at DESC LIMIT 10)
  `).get(userId);
  const prev10 = db.prepare(`
    SELECT SUM(is_correct) as correct, COUNT(*) as total
    FROM (SELECT * FROM user_answers WHERE user_id = ? ORDER BY answered_at DESC LIMIT 10 OFFSET 10)
  `).get(userId);

  if (recent10.total >= 10 && prev10.total >= 5) {
    const recentAcc = Math.round((recent10.correct / recent10.total) * 100);
    const prevAcc = Math.round(((prev10.correct || 0) / prev10.total) * 100);
    if (recentAcc > prevAcc + 10) {
      insights.push({ type: 'trend', icon: '📈', text: `Your accuracy is improving! ${prevAcc}% → ${recentAcc}%`, data: { recentAcc, prevAcc } });
    } else if (recentAcc < prevAcc - 10) {
      insights.push({ type: 'trend', icon: '📉', text: `Accuracy dipped recently. ${prevAcc}% → ${recentAcc}%. Time to focus!`, data: { recentAcc, prevAcc } });
    }
  }

  // 3. Best time of day
  const byHour = db.prepare(`
    SELECT strftime('%H', answered_at) as hour,
      COUNT(*) as total,
      SUM(is_correct) as correct
    FROM user_answers WHERE user_id = ?
    GROUP BY hour HAVING total >= 3
    ORDER BY (CAST(correct AS REAL) / total) DESC LIMIT 1
  `).get(userId);

  if (byHour) {
    const h = parseInt(byHour.hour);
    const period = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
    const acc = Math.round((byHour.correct / byHour.total) * 100);
    insights.push({ type: 'timing', icon: '🕐', text: `You perform best in the ${period} (${acc}% accuracy)`, data: { hour: h, period, accuracy: acc } });
  }

  // 4. Prediction accuracy
  const predStats = db.prepare(`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct
    FROM predictions WHERE user_id = ? AND is_correct IS NOT NULL
  `).get(userId);

  if (predStats.total >= 3) {
    const predAcc = Math.round((predStats.correct / predStats.total) * 100);
    if (predAcc >= 60) {
      insights.push({ type: 'prediction', icon: '🔮', text: `Strong predictor! ${predAcc}% accuracy across ${predStats.total} matches`, data: { accuracy: predAcc, total: predStats.total } });
    } else {
      insights.push({ type: 'prediction', icon: '🎯', text: `Prediction accuracy: ${predAcc}%. Study team form for better picks!`, data: { accuracy: predAcc, total: predStats.total } });
    }
  }

  // 5. Battle win rate
  const battles = db.prepare(`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN winner = ? THEN 1 ELSE 0 END) as wins
    FROM battles WHERE (user_a = ? OR user_b = ?) AND status = 'completed'
  `).get(userId, userId, userId);

  if (battles.total >= 2) {
    const winRate = Math.round((battles.wins / battles.total) * 100);
    if (winRate >= 60) {
      insights.push({ type: 'battle', icon: '⚔️', text: `Battle veteran! ${winRate}% win rate (${battles.wins}/${battles.total})`, data: { winRate, wins: battles.wins, total: battles.total } });
    } else {
      insights.push({ type: 'battle', icon: '🛡️', text: `Battle win rate: ${winRate}%. Keep practicing to improve!`, data: { winRate, wins: battles.wins, total: battles.total } });
    }
  }

  // 6. Kohli Mode performance
  const kohli = db.prepare(`
    SELECT COUNT(*) as total, SUM(is_correct) as correct
    FROM user_answers WHERE user_id = ? AND source = 'kohli'
  `).get(userId);

  if (kohli.total >= 5) {
    const kohliAcc = Math.round((kohli.correct / kohli.total) * 100);
    insights.push({ type: 'kohli', icon: '🏏', text: `Kohli Mode accuracy: ${kohliAcc}% across ${kohli.total} questions`, data: { accuracy: kohliAcc, total: kohli.total } });
  }

  // 7. Streak analysis
  const user = db.prepare('SELECT streak, xp FROM users WHERE id = ?').get(userId);
  if (user && user.streak >= 3) {
    insights.push({ type: 'streak', icon: '🔥', text: `${user.streak}-day streak! You earn ${user.streak >= 7 ? '20%' : '10%'} bonus XP on every answer`, data: { streak: user.streak } });
  }

  // 8. Most active source
  const topSource = db.prepare(`
    SELECT source, COUNT(*) as cnt FROM user_answers
    WHERE user_id = ? GROUP BY source ORDER BY cnt DESC LIMIT 1
  `).get(userId);

  if (topSource) {
    const sourceNames = { quiz: 'Quick Quiz', daily: 'Daily Challenges', kohli: 'Kohli Mode' };
    insights.push({ type: 'activity', icon: '⭐', text: `Most active in: ${sourceNames[topSource.source] || topSource.source} (${topSource.cnt} answers)`, data: { source: topSource.source, count: topSource.cnt } });
  }

  return { insights, totalInsights: insights.length };
}

export function getEngagementTimeline(userId, limit = 30) {
  const db = getDb();

  // Combine activity log + reactions into unified timeline
  const activities = db.prepare(`
    SELECT 'activity' as entry_type, action as event_type, detail as description, xp_change as xp, created_at
    FROM activity_log WHERE user_id = ?
    ORDER BY created_at DESC LIMIT ?
  `).all(userId, limit);

  const reactions = db.prepare(`
    SELECT 'reaction' as entry_type, r.reaction_type as event_type,
      le.title as description, 0 as xp, r.created_at
    FROM reactions r
    JOIN live_events le ON le.id = r.event_id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC LIMIT ?
  `).all(userId, limit);

  // Merge and sort
  const timeline = [...activities, ...reactions]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);

  return timeline;
}
