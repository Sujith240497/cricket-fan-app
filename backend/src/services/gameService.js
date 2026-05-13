const LEVELS = [
  { name: 'Rookie Fan', minXp: 0, maxXp: 100 },
  { name: 'Fan', minXp: 101, maxXp: 300 },
  { name: 'Loyal Fan', minXp: 301, maxXp: 600 },
  { name: 'Super Fan', minXp: 601, maxXp: 900 },
  { name: 'Legend Fan', minXp: 901, maxXp: Infinity }
];

const XP_TABLE = {
  easy: 10,
  medium: 15,
  hard: 25,
  daily_bonus: 30
};

export function getLevel(xp) {
  const level = LEVELS.find(l => xp >= l.minXp && xp <= l.maxXp) || LEVELS[0];
  const index = LEVELS.indexOf(level);
  const nextLevel = index < LEVELS.length - 1 ? LEVELS[index + 1] : null;

  return {
    name: level.name,
    tier: index + 1,
    currentXp: xp,
    levelMinXp: level.minXp,
    levelMaxXp: level.maxXp === Infinity ? null : level.maxXp,
    nextLevel: nextLevel ? nextLevel.name : null,
    nextLevelXp: nextLevel ? nextLevel.minXp : null,
    progress: nextLevel
      ? Math.round(((xp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100)
      : 100
  };
}

export function checkLevelUp(oldXp, newXp) {
  const oldLevel = getLevel(oldXp);
  const newLevel = getLevel(newXp);
  if (newLevel.tier > oldLevel.tier) {
    return { leveledUp: true, newLevelName: newLevel.name, newTier: newLevel.tier };
  }
  return { leveledUp: false };
}

export function getXpForDifficulty(difficulty) {
  return XP_TABLE[difficulty] || XP_TABLE.easy;
}

export function getStreakMultiplier(streak) {
  if (streak >= 7) return 1.2;
  if (streak >= 3) return 1.1;
  return 1.0;
}

export function calculateXp(baseDifficulty, streak, isDaily = false) {
  let base = isDaily ? XP_TABLE.daily_bonus : getXpForDifficulty(baseDifficulty);
  const multiplier = getStreakMultiplier(streak);
  return Math.round(base * multiplier);
}
