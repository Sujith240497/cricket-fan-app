import { tickLiveMatches, getActiveEvents, getRecentEvents, getEventById } from '../services/liveEventService.js';
import { success, fail, notFound } from '../utils/response.js';

export function tick(req, res) {
  const events = tickLiveMatches();
  return success(res, events, `Generated ${events.length} live events`);
}

export function getActive(req, res) {
  const matchId = req.query.matchId ? parseInt(req.query.matchId) : null;
  const events = getActiveEvents(matchId);
  return success(res, events);
}

export function getRecent(req, res) {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const events = getRecentEvents(limit);
  return success(res, events);
}

export function getEvent(req, res) {
  const event = getEventById(parseInt(req.params.id));
  if (!event) return notFound(res, 'Event not found');
  return success(res, event);
}
