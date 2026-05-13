import { useEffect, useState } from 'react';
import { api } from '../api';

export default function FanCard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.getShareCard()
      .then(data => setProfile(data.profile))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleCopyLink() {
    const url = window.location.origin + '/card/' + profile?.username;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleShareWhatsApp() {
    const text = `🏏 Check my Cricket Fan Identity!\n📊 Fan Score: ${profile.fanScore}/100\n🏆 Level: ${profile.level}\n🎯 Prediction Accuracy: ${profile.predictionAccuracy}%\n🔥 Streak: ${profile.streak} days\n\nCan you beat me?`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    api.logShareEvent('fan_score', { fanScore: profile.fanScore });
  }

  if (loading) return <div className="loading">Loading your Fan Card...</div>;
  if (!profile) return <div className="no-data">Could not load profile</div>;

  return (
    <div className="fancard-page">
      <h1>My Fan Identity Card</h1>

      <div className="fan-card" id="fan-card">
        <div className="fc-header">
          <span className="fc-brand">🏏 Fan Identity</span>
          <span className="fc-level">{profile.level}</span>
        </div>
        <div className="fc-username">{profile.username}</div>
        <div className="fc-score">
          <span className="fc-score-number">{profile.fanScore}</span>
          <span className="fc-score-label">Fan Score</span>
        </div>
        <div className="fc-stats">
          <div className="fc-stat">
            <span className="fc-stat-val">#{profile.rank}</span>
            <span className="fc-stat-lbl">Rank</span>
          </div>
          <div className="fc-stat">
            <span className="fc-stat-val">{profile.quizAccuracy}%</span>
            <span className="fc-stat-lbl">Quiz Acc.</span>
          </div>
          <div className="fc-stat">
            <span className="fc-stat-val">{profile.predictionAccuracy}%</span>
            <span className="fc-stat-lbl">Pred. Acc.</span>
          </div>
          <div className="fc-stat">
            <span className="fc-stat-val">{profile.streak}🔥</span>
            <span className="fc-stat-lbl">Streak</span>
          </div>
        </div>
        <div className="fc-battles">
          <span>⚔️ Battles Won: {profile.battlesWon}/{profile.battlesPlayed}</span>
        </div>
        {profile.titles.length > 0 && (
          <div className="fc-titles">
            {profile.titles.slice(0, 3).map(t => (
              <span key={t} className="fc-title-badge">{t}</span>
            ))}
          </div>
        )}
        <div className="fc-footer">
          <span>Rank #{profile.rank} of {profile.totalUsers} fans</span>
        </div>
      </div>

      <div className="share-actions">
        <button className="btn-share-wa" onClick={handleShareWhatsApp}>
          Share on WhatsApp 💬
        </button>
        <button className="btn-share-copy" onClick={handleCopyLink}>
          {copied ? 'Copied!' : 'Copy Link 🔗'}
        </button>
      </div>
    </div>
  );
}
