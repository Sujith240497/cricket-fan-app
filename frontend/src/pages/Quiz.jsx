import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const OPTION_KEYS = ['A', 'B', 'C', 'D'];
const OPTION_FIELDS = { A: 'option_a', B: 'option_b', C: 'option_c', D: 'option_d' };

export default function Quiz() {
  const { updateUser } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [score, setScore] = useState({ correct: 0, xpEarned: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [difficulty, setDifficulty] = useState('');
  const [levelUpMsg, setLevelUpMsg] = useState(null);

  function loadQuestions(diff) {
    setLoading(true);
    api.getQuestions(diff || undefined)
      .then(data => setQuestions(data.questions))
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadQuestions(difficulty); }, []);

  function handleDifficultyChange(diff) {
    setDifficulty(diff);
    setScore({ correct: 0, xpEarned: 0 });
    setCurrent(0);
    setSelected(null);
    setResult(null);
    setLevelUpMsg(null);
    loadQuestions(diff);
  }

  async function handleSelect(option) {
    if (result || submitting) return;
    setSelected(option);
    setSubmitting(true);
    setLevelUpMsg(null);

    try {
      const data = await api.submitAnswer(questions[current].id, option);
      setResult(data);
      updateUser({ xp: data.totalXp, level: data.level });
      if (data.correct) {
        setScore(s => ({ correct: s.correct + 1, xpEarned: s.xpEarned + data.xpEarned }));
      }
      if (data.levelUp?.leveledUp) {
        setLevelUpMsg(`Level Up! You are now a ${data.levelUp.newLevelName}!`);
      }
    } catch {
      setResult({ error: true });
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    setCurrent(c => c + 1);
    setSelected(null);
    setResult(null);
    setLevelUpMsg(null);
  }

  function handleRestart() {
    setScore({ correct: 0, xpEarned: 0 });
    setCurrent(0);
    setSelected(null);
    setResult(null);
    setLevelUpMsg(null);
    loadQuestions(difficulty);
  }

  if (loading) return <div className="loading">Loading questions...</div>;

  return (
    <div className="quiz">
      <h1>Cricket Quiz</h1>

      <div className="difficulty-selector">
        {['', 'easy', 'medium', 'hard'].map(d => (
          <button
            key={d}
            className={`diff-btn ${difficulty === d ? 'active' : ''}`}
            onClick={() => handleDifficultyChange(d)}
          >
            {d ? d.charAt(0).toUpperCase() + d.slice(1) : 'All'}
          </button>
        ))}
      </div>

      {questions.length === 0 ? (
        <div className="quiz-status">
          <p>No questions available for this difficulty. Try another!</p>
          <Link to="/" className="btn-play" style={{ marginTop: '1rem', display: 'inline-block' }}>
            Back to Dashboard
          </Link>
        </div>
      ) : current >= questions.length ? (
        <div className="quiz-complete">
          <h2>Quiz Complete!</h2>
          <div className="score">{score.correct} / {questions.length} correct</div>
          <div className="xp-earned">+{score.xpEarned} XP earned</div>
          <button className="btn" onClick={handleRestart}>Play Again</button>
        </div>
      ) : (
        <>
          {levelUpMsg && <div className="level-up-toast">{levelUpMsg}</div>}

          <div className="question-card">
            <div className="question-meta">
              <span>Question {current + 1} of {questions.length}</span>
              <span className={`diff-tag diff-${questions[current].difficulty}`}>
                {questions[current].difficulty}
              </span>
              <span>{questions[current].category}</span>
            </div>
            <div className="question-text">{questions[current].question}</div>
            <div className="options">
              {OPTION_KEYS.map(key => {
                let className = 'option-btn';
                if (result && !result.error) {
                  if (key === result.correctOption) className += ' correct';
                  else if (key === selected && !result.correct) className += ' incorrect';
                }
                return (
                  <button
                    key={key}
                    className={className}
                    onClick={() => handleSelect(key)}
                    disabled={!!result}
                  >
                    <strong>{key}.</strong> {questions[current][OPTION_FIELDS[key]]}
                  </button>
                );
              })}
            </div>
            {result && !result.error && (
              <>
                <div className={`result-msg ${result.correct ? 'correct' : 'incorrect'}`}>
                  {result.message}
                </div>
                {result.explanation && (
                  <div className="explanation">{result.explanation}</div>
                )}
              </>
            )}
            {result && (
              <button className="btn" onClick={handleNext} style={{ marginTop: '1rem' }}>
                {current + 1 < questions.length ? 'Next Question' : 'See Results'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
