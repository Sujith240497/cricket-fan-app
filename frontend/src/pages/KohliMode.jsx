import { useEffect, useState, useRef } from 'react';
import { api } from '../api';

export default function KohliMode() {
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [started, setStarted] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    api.getKohliChallenge()
      .then(data => setChallenge(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (started && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    } else if (started && timeLeft === 0) {
      handleTimeout();
    }
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, started]);

  function startChallenge() {
    setStarted(true);
    setStartTime(Date.now());
    setTimeLeft(challenge.timePerQuestion);
  }

  function handleTimeout() {
    // Auto-submit empty answer on timeout
    handleAnswer('X'); // X = no answer
  }

  async function handleAnswer(option) {
    clearTimeout(timerRef.current);
    const timeTaken = Date.now() - startTime;

    const newAnswers = [...answers, {
      questionId: challenge.questions[currentQ].id,
      selectedOption: option,
      timeTaken
    }];
    setAnswers(newAnswers);

    if (currentQ < challenge.questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setTimeLeft(challenge.timePerQuestion);
      setStartTime(Date.now());
    } else {
      // Submit
      setStarted(false);
      try {
        const res = await api.submitKohliAnswers(newAnswers);
        setResult(res);
      } catch (err) {
        setResult({ error: err.message });
      }
    }
  }

  if (loading) return <div className="loading">Loading Kohli Mode...</div>;

  if (!started && !result) {
    return (
      <div className="kohli-page">
        <div className="kohli-intro">
          <h1>🏏 Kohli Mode</h1>
          <div className="kohli-desc">
            <p><strong>The Chase is ON!</strong></p>
            <p>5 pressure questions. 15 seconds each. Score 4/5 to chase successfully.</p>
            <ul>
              <li>⏱️ {challenge?.timePerQuestion || 15}s per question</li>
              <li>🎯 Target: {challenge?.targetScore || 4}/5 correct</li>
              <li>💰 +35 XP per correct answer</li>
              <li>🏆 Chase successfully for bonus titles</li>
            </ul>
          </div>
          <button className="btn-kohli-start" onClick={startChallenge}>
            Start the Chase 🏏
          </button>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="kohli-page">
        <div className={`kohli-result ${result.chaseSuccess ? 'kohli-success' : 'kohli-fail'}`}>
          <h2>{result.chaseSuccess ? '🎉 Chase Successful!' : '😤 Chase Failed!'}</h2>
          <div className="kohli-score-big">{result.correct}/{result.total}</div>
          <p className="kohli-xp">+{result.xpEarned} XP earned</p>
          {result.levelUp && <p className="kohli-levelup">🎊 Level Up: {result.levelUp.newLevelName}!</p>}
          <div className="kohli-results-list">
            {result.results?.map((r, i) => (
              <div key={i} className={`kohli-result-item ${r.correct ? 'correct' : 'wrong'}`}>
                <span>Q{i + 1}: {r.correct ? '✓' : '✗'}</span>
                {r.explanation && <span className="kohli-explanation">{r.explanation}</span>}
              </div>
            ))}
          </div>
          <div className="kohli-actions">
            <button className="btn-kohli-start" onClick={() => window.location.reload()}>
              Try Again
            </button>
            <button className="btn-share-achievement" onClick={() => {
              api.logShareEvent('kohli_mode', { score: result.correct });
            }}>
              Share Result 📣
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = challenge.questions[currentQ];
  const timerPercent = (timeLeft / challenge.timePerQuestion) * 100;

  return (
    <div className="kohli-page">
      <div className="kohli-play">
        <div className="kohli-header">
          <span className="kohli-q-num">Q{currentQ + 1}/{challenge.questions.length}</span>
          <div className={`kohli-timer ${timeLeft <= 5 ? 'timer-danger' : ''}`}>
            <div className="kohli-timer-bar" style={{ width: `${timerPercent}%` }} />
            <span className="kohli-timer-text">{timeLeft}s</span>
          </div>
        </div>
        <div className="kohli-question">{q.question}</div>
        <div className="kohli-options">
          {['A', 'B', 'C', 'D'].map(opt => (
            <button key={opt} className="kohli-option" onClick={() => handleAnswer(opt)}>
              <span className="opt-letter">{opt}</span>
              {q[`option_${opt.toLowerCase()}`]}
            </button>
          ))}
        </div>
        <div className="kohli-chase-target">
          Target: {challenge.targetScore}/{challenge.questions.length} | Current: {answers.filter((a, i) => {
            const correctOpt = challenge.questions[i]?.correct_option;
            return a?.selectedOption?.toUpperCase() === correctOpt?.toUpperCase();
          }).length}/{answers.length}
        </div>
      </div>
    </div>
  );
}
