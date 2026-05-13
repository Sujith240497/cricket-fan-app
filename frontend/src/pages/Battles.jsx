import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Battles() {
  const { user } = useAuth();
  const [openBattles, setOpenBattles] = useState([]);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('open');
  const [loading, setLoading] = useState(true);
  const [activeBattle, setActiveBattle] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [creating, setCreating] = useState(false);
  const [startTime, setStartTime] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [openRes, histRes] = await Promise.all([
        api.getOpenBattles(),
        api.getBattleHistory()
      ]);
      setOpenBattles(openRes.battles);
      setHistory(histRes.battles);
    } catch {}
    setLoading(false);
  }

  async function handleCreate(type) {
    setCreating(true);
    try {
      const res = await api.createBattle(type);
      showToast(`Battle created! Waiting for opponent...`);
      loadData();
    } catch (err) {
      showToast(err.message);
    }
    setCreating(false);
  }

  async function handleJoin(battleId) {
    try {
      const res = await api.joinBattle(battleId);
      setActiveBattle(res.battle);
      setQuestions(res.questions);
      setCurrentQ(0);
      setAnswers([]);
      setResult(null);
      setStartTime(Date.now());
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleAnswer(option) {
    const timeTaken = Date.now() - startTime;
    const newAnswers = [...answers, {
      questionId: questions[currentQ].id,
      selectedOption: option,
      timeTaken
    }];
    setAnswers(newAnswers);

    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setStartTime(Date.now());
    } else {
      // Submit all answers
      try {
        const res = await api.submitBattleAnswers(activeBattle.id, newAnswers);
        setResult(res);
        showToast(`Submitted! Score: ${res.score}/${questions.length}`);
        loadData();
      } catch (err) {
        showToast(err.message);
      }
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function renderBattlePlay() {
    const q = questions[currentQ];
    return (
      <div className="battle-play">
        <div className="battle-progress">Question {currentQ + 1}/{questions.length}</div>
        <div className="battle-timer">⚡ Speed Battle</div>
        <div className="battle-question">{q.question}</div>
        <div className="battle-options">
          {['A', 'B', 'C', 'D'].map(opt => (
            <button key={opt} className="battle-option" onClick={() => handleAnswer(opt)}>
              <span className="opt-label">{opt}</span>
              {q[`option_${opt.toLowerCase()}`]}
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderResult() {
    return (
      <div className="battle-result-card">
        <h2>Battle Complete!</h2>
        <div className="battle-score-big">{result.score}/{questions.length}</div>
        <p>Time: {Math.round(result.totalTime / 1000)}s</p>
        <p className="battle-waiting">
          {result.submitted ? 'Waiting for opponent to finish...' : ''}
        </p>
        <button className="btn-play" onClick={() => { setActiveBattle(null); setResult(null); }}>
          Back to Battles
        </button>
      </div>
    );
  }

  if (activeBattle && !result) return (
    <div className="battles-page">
      {toast && <div className="toast-msg">{toast}</div>}
      {renderBattlePlay()}
    </div>
  );

  if (result) return (
    <div className="battles-page">
      {toast && <div className="toast-msg">{toast}</div>}
      {renderResult()}
    </div>
  );

  if (loading) return <div className="loading">Loading battles...</div>;

  return (
    <div className="battles-page">
      <h1>⚔️ Fan Battles</h1>
      {toast && <div className="toast-msg">{toast}</div>}

      <div className="battle-create-section">
        <h3>Create a Battle</h3>
        <div className="battle-type-btns">
          <button className="btn-battle-create" onClick={() => handleCreate('quiz')} disabled={creating}>
            🧠 Quiz Battle
          </button>
          <button className="btn-battle-create" onClick={() => handleCreate('speed')} disabled={creating}>
            ⚡ Speed Battle
          </button>
        </div>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'open' ? 'active' : ''}`} onClick={() => setTab('open')}>
          Open Battles ({openBattles.length})
        </button>
        <button className={`tab-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          My History
        </button>
      </div>

      {tab === 'open' && (
        <div className="battle-list">
          {openBattles.length === 0 && <p className="no-data">No open battles. Create one!</p>}
          {openBattles.map(b => (
            <div key={b.id} className="battle-card">
              <div className="battle-card-info">
                <span className="battle-creator">{b.creator_name}</span>
                <span className="battle-type-badge">{b.type === 'speed' ? '⚡ Speed' : '🧠 Quiz'}</span>
              </div>
              <button className="btn-join" onClick={() => handleJoin(b.id)}>Join Battle</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div className="battle-list">
          {history.length === 0 && <p className="no-data">No battles yet.</p>}
          {history.map(b => (
            <div key={b.id} className={`battle-card ${b.winner === user?.id ? 'battle-won' : b.winner && b.winner !== user?.id ? 'battle-lost' : ''}`}>
              <div className="battle-card-info">
                <span>{b.user_a_name} vs {b.user_b_name || '...'}</span>
                <span className="battle-type-badge">{b.type === 'speed' ? '⚡' : '🧠'}</span>
              </div>
              <div className="battle-card-score">
                {b.status === 'completed' ? (
                  <>
                    <span>{b.score_a} - {b.score_b}</span>
                    {b.winner === user?.id && <span className="badge-win">WON +30 XP</span>}
                    {b.winner && b.winner !== user?.id && <span className="badge-loss">LOST +10 XP</span>}
                    {!b.winner && b.status === 'completed' && <span className="badge-draw">DRAW</span>}
                  </>
                ) : (
                  <span className="battle-status">{b.status}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
