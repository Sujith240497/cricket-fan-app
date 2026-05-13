import { getDb } from '../db.js';
import { addNotification } from './notificationService.js';
import { awardXp } from './gameEngine.js';
import crypto from 'crypto';

const REFERRAL_XP = 50;

export function generateReferralCode(userId) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM referrals WHERE user_id = ?').get(userId);
  if (existing) return existing.referral_code;

  const code = crypto.randomBytes(4).toString('hex').toUpperCase();
  db.prepare('INSERT INTO referrals (user_id, referral_code) VALUES (?, ?)').run(userId, code);
  db.prepare('UPDATE users SET referral_code = ? WHERE id = ?').run(code, userId);
  return code;
}

export function getReferralStats(userId) {
  const db = getDb();
  const referral = db.prepare('SELECT * FROM referrals WHERE user_id = ?').get(userId);
  if (!referral) {
    const code = generateReferralCode(userId);
    return { referralCode: code, totalReferred: 0, xpEarned: 0 };
  }

  const claims = db.prepare(`
    SELECT rc.*, u.username as referred_username 
    FROM referral_claims rc
    JOIN users u ON u.id = rc.referred_id
    WHERE rc.referrer_id = ?
    ORDER BY rc.claimed_at DESC
  `).all(userId);

  return {
    referralCode: referral.referral_code,
    totalReferred: referral.total_referred,
    xpEarned: referral.total_referred * REFERRAL_XP,
    recentReferrals: claims.slice(0, 10)
  };
}

export function claimReferral(newUserId, referralCode) {
  const db = getDb();

  // Validate referral code
  const referrer = db.prepare(`
    SELECT r.*, u.username, u.xp FROM referrals r 
    JOIN users u ON u.id = r.user_id 
    WHERE r.referral_code = ?
  `).get(referralCode);

  if (!referrer) throw new Error('Invalid referral code');
  if (referrer.user_id === newUserId) throw new Error('Cannot refer yourself');

  // Check if already claimed
  const alreadyClaimed = db.prepare('SELECT * FROM referral_claims WHERE referred_id = ?').get(newUserId);
  if (alreadyClaimed) throw new Error('Referral already claimed');

  // Award XP to both
  const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(newUserId);
  if (!newUser) throw new Error('User not found');

  db.prepare('UPDATE users SET referred_by = ? WHERE id = ?').run(referrer.user_id, newUserId);
  db.prepare('UPDATE referrals SET total_referred = total_referred + 1 WHERE user_id = ?').run(referrer.user_id);

  db.prepare(`
    INSERT INTO referral_claims (referrer_id, referred_id, xp_awarded) VALUES (?, ?, ?)
  `).run(referrer.user_id, newUserId, REFERRAL_XP);

  // Award XP via GameEngine (handles level-up, titles, audit, activity log)
  awardXp(referrer.user_id, REFERRAL_XP, 'referral_bonus', `${newUser.username} used your referral code`);
  awardXp(newUserId, REFERRAL_XP, 'referral_bonus', `Used referral code from ${referrer.username}`);

  // Notifications
  addNotification(referrer.user_id, `${newUser.username} joined with your referral! +${REFERRAL_XP} XP`, 'referral');
  addNotification(newUserId, `Referral bonus! +${REFERRAL_XP} XP from ${referrer.username}'s invite`, 'referral');

  return { success: true, xpAwarded: REFERRAL_XP };
}
