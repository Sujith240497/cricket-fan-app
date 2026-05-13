import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Referrals() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claimCode, setClaimCode] = useState('');
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.getReferralStats()
      .then(data => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleClaim() {
    if (!claimCode.trim()) return;
    try {
      await api.claimReferral(claimCode.trim());
      showToast('Referral claimed! +50 XP 🎉');
      setClaimCode('');
      const data = await api.getReferralStats();
      setStats(data);
    } catch (err) {
      showToast(err.message);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(stats?.referralCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleShareCode() {
    const text = `🏏 Join me on Fan Identity! Use my referral code: ${stats?.referralCode} and we both get +50 XP! Play cricket quizzes, predict matches, and battle friends!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  if (loading) return <div className="loading">Loading referral info...</div>;

  return (
    <div className="referral-page">
      <h1>🔥 Referral System</h1>
      {toast && <div className="toast-msg">{toast}</div>}

      <div className="referral-card">
        <h3>Your Referral Code</h3>
        <div className="referral-code-display">
          <span className="ref-code">{stats?.referralCode || '...'}</span>
          <button className="btn-copy" onClick={handleCopy}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <p className="ref-desc">Share your code. Both you and your friend get <strong>+50 XP</strong>!</p>
        <button className="btn-share-wa" onClick={handleShareCode}>
          Share via WhatsApp 💬
        </button>
      </div>

      <div className="referral-stats-card">
        <div className="ref-stat">
          <span className="ref-stat-val">{stats?.totalReferred || 0}</span>
          <span className="ref-stat-label">Friends Referred</span>
        </div>
        <div className="ref-stat">
          <span className="ref-stat-val">+{stats?.xpEarned || 0}</span>
          <span className="ref-stat-label">XP Earned</span>
        </div>
      </div>

      {stats?.recentReferrals?.length > 0 && (
        <div className="ref-history">
          <h3>Recent Referrals</h3>
          {stats.recentReferrals.map(r => (
            <div key={r.id} className="ref-item">
              <span>{r.referred_username}</span>
              <span className="ref-xp">+{r.xp_awarded} XP</span>
            </div>
          ))}
        </div>
      )}

      <div className="referral-claim-section">
        <h3>Have a Referral Code?</h3>
        <div className="ref-claim-form">
          <input
            type="text"
            value={claimCode}
            onChange={e => setClaimCode(e.target.value.toUpperCase())}
            placeholder="Enter code"
            maxLength={8}
            className="ref-input"
          />
          <button className="btn-claim" onClick={handleClaim}>Claim</button>
        </div>
      </div>
    </div>
  );
}
