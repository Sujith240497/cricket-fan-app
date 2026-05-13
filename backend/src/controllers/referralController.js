import { getReferralStats, claimReferral, generateReferralCode } from '../services/referralService.js';
import { validateReferralCode } from '../utils/validate.js';
import { success, fail } from '../utils/response.js';

export function stats(req, res) {
  try {
    const data = getReferralStats(req.userId);
    success(res, data);
  } catch (err) {
    fail(res, err.message, 500);
  }
}

export function claim(req, res) {
  const error = validateReferralCode(req.body);
  if (error) return fail(res, error);

  try {
    const result = claimReferral(req.userId, req.body.code.toUpperCase());
    success(res, result, 'Referral claimed');
  } catch (err) {
    fail(res, err.message);
  }
}

export function getCode(req, res) {
  try {
    const code = generateReferralCode(req.userId);
    success(res, { code });
  } catch (err) {
    fail(res, err.message, 500);
  }
}
