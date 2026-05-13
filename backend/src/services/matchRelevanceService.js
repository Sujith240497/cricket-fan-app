import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const config = require('../config/matchRelevance.json');

/**
 * MatchRelevanceService
 * Determines whether a match should be included and assigns relevance categories.
 * All filtering logic is configuration-driven.
 */

function normalize(str) {
  return (str || '').toLowerCase().trim();
}

function matchesAny(value, list) {
  const v = normalize(value);
  return list.some(item => v.includes(normalize(item)));
}

/**
 * Evaluate a match's relevance.
 * Returns { relevant: boolean, category: string|null, isFeatured: boolean }
 */
export function evaluateRelevance(match) {
  const teamA = match.team_a || match.teamA || '';
  const teamB = match.team_b || match.teamB || '';
  const series = match.series_name || match.series || match.name || '';

  // Check Kohli teams (highest priority)
  if (matchesAny(teamA, config.kohliTeams) || matchesAny(teamB, config.kohliTeams)) {
    // If it's an IPL team, categorize as kohli only if it's RCB
    const isRCB = matchesAny(teamA, ['Royal Challengers Bengaluru', 'Royal Challengers Bangalore']) ||
                  matchesAny(teamB, ['Royal Challengers Bengaluru', 'Royal Challengers Bangalore']);
    if (isRCB) {
      return { relevant: true, category: 'kohli', isFeatured: true };
    }
  }

  // Check IPL
  if (matchesAny(series, ['Indian Premier League', 'IPL'])) {
    return { relevant: true, category: 'ipl', isFeatured: true };
  }

  // Check India national team
  if (matchesAny(teamA, config.priorityTeams) || matchesAny(teamB, config.priorityTeams)) {
    return { relevant: true, category: 'india', isFeatured: true };
  }

  // Check ICC / priority series
  if (matchesAny(series, config.prioritySeries)) {
    return { relevant: true, category: 'icc', isFeatured: false };
  }

  // Not relevant
  return { relevant: false, category: null, isFeatured: false };
}

/**
 * Filter an array of normalized matches, keeping only relevant ones.
 * Attaches relevance_category and is_featured to each match.
 */
export function filterRelevantMatches(matches) {
  const results = [];
  for (const match of matches) {
    const { relevant, category, isFeatured } = evaluateRelevance(match);
    if (relevant) {
      results.push({
        ...match,
        relevance_category: category,
        is_featured: isFeatured ? 1 : 0
      });
    }
  }
  return results;
}

/**
 * Get sort priority for a relevance category (lower = higher priority)
 */
export function getRelevancePriority(category) {
  const idx = config.relevancePriority.indexOf(category);
  return idx >= 0 ? idx : 99;
}

/**
 * Sort matches by relevance priority, then by date
 */
export function sortByRelevance(matches) {
  return [...matches].sort((a, b) => {
    const pa = getRelevancePriority(a.relevance_category);
    const pb = getRelevancePriority(b.relevance_category);
    if (pa !== pb) return pa - pb;
    return new Date(a.match_date) - new Date(b.match_date);
  });
}

export function getKohliTeams() {
  return config.kohliTeams;
}

export function getConfig() {
  return config;
}
