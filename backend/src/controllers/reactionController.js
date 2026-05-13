import { addReaction, getEventReactions, getUserReactionStats, getValidReactions } from '../services/reactionService.js';
import { success, fail } from '../utils/response.js';

export function react(req, res) {
  const { eventId, reactionType } = req.body;
  if (!eventId || !reactionType) return fail(res, 'eventId and reactionType required');

  const result = addReaction(req.userId, parseInt(eventId), reactionType);
  if (result.error) return fail(res, result.error);
  return success(res, result, 'Reaction recorded');
}

export function eventReactions(req, res) {
  const data = getEventReactions(parseInt(req.params.eventId));
  return success(res, data);
}

export function myStats(req, res) {
  const data = getUserReactionStats(req.userId);
  return success(res, data);
}

export function reactionTypes(req, res) {
  return success(res, getValidReactions());
}
