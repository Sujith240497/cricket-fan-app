import { getShareProfile, createShareEvent, getShareMessage } from '../services/shareService.js';
import { positiveInt, sanitize } from '../utils/validate.js';
import { success, fail } from '../utils/response.js';

export function profile(req, res) {
  const userId = positiveInt(req.params.userId);
  if (!userId) return fail(res, 'Invalid user ID');

  try {
    const profileData = getShareProfile(userId);
    const shareMessage = getShareMessage('fan_score', { fanScore: profileData.fanScore });
    success(res, { profile: profileData, shareMessage });
  } catch (err) {
    fail(res, err.message);
  }
}

export function me(req, res) {
  try {
    const profileData = getShareProfile(req.userId);
    const shareMessage = getShareMessage('fan_score', { fanScore: profileData.fanScore });
    success(res, { profile: profileData, shareMessage });
  } catch (err) {
    fail(res, err.message, 500);
  }
}

export function logEvent(req, res) {
  try {
    const eventType = sanitize(req.body.eventType);
    if (!eventType) return fail(res, 'eventType is required');
    createShareEvent(req.userId, eventType, req.body.payload || {});
    const message = getShareMessage(eventType, req.body.payload || {});
    success(res, { message }, 'Share event logged');
  } catch (err) {
    fail(res, err.message);
  }
}
