'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import { learningAPI, documentsAPI } from '@/app/lib/api';

const LANG_OPTIONS = [
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'hi', label: 'हिंदी', flag: '🇮🇳' },
  { value: 'mr', label: 'मराठी', flag: '🏔️' },
];
const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy 🟢' },
  { value: 'medium', label: 'Medium 🟡' },
  { value: 'hard', label: 'Hard 🔴' },
];
const Q_OPTIONS = [5, 10, 15];

function QuizSetup({ onGenerate }) {
  const [documents, setDocuments] = useState([]);
  const [docId, setDocId] = useState('');
  const [language, setLanguage] = useState('en');
  const [difficulty, setDifficulty] = useState('medium');
  const [numQ, setNumQ] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    documentsAPI.list().then(docs => {
      const ready = docs.filter(d => d.processing_status === 'completed');
      setDocuments(ready);
      if (ready.length > 0) setDocId(ready[0].id.toString());
    }).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!docId) { setError('Please select a document'); return; }
    setError('');
    setLoading(true);
    try {
      const quiz = await learningAPI.generateQuiz({
        document_id: parseInt(docId),
        language,
        difficulty,
        num_questions: numQ,
      });
      onGenerate(quiz);
    } catch (err) {
      setError(err.message || 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📝</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Generate Practice Quiz</h2>
          <p className="text-slate-500">AI-generated questions from your learning material</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        <div className="space-y-5">
          <div>
            <label className="label">Select Chapter / Document</label>
            {documents.length === 0 ? (
              <div className="input text-slate-400 flex items-center">No documents available — ask teacher to upload</div>
            ) : (
              <select className="input" value={docId} onChange={e => setDocId(e.target.value)}>
                {documents.map(d => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="label">Quiz Language</label>
            <div className="grid grid-cols-3 gap-3">
              {LANG_OPTIONS.map(l => (
                <button key={l.value} type="button" onClick={() => setLanguage(l.value)}
                  className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all ${language === l.value ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Difficulty</label>
            <div className="grid grid-cols-3 gap-3">
              {DIFFICULTY_OPTIONS.map(d => (
                <button key={d.value} type="button" onClick={() => setDifficulty(d.value)}
                  className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all ${difficulty === d.value ? 'border-navy/50 bg-navy/5 text-navy' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Number of Questions</label>
            <div className="grid grid-cols-3 gap-3">
              {Q_OPTIONS.map(n => (
                <button key={n} type="button" onClick={() => setNumQ(n)}
                  className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all ${numQ === n ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {n} Questions
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleGenerate} disabled={loading || !docId}
            className="btn-primary w-full justify-center py-3 text-base mt-2">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating quiz with AI...
              </span>
            ) : '⚡ Generate Quiz'}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuizActive({ quiz, onFinish }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState(Array(quiz.questions.length).fill(-1));
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const q = quiz.questions[currentQ];
  const isDevanagari = quiz.language === 'mr' || quiz.language === 'hi';

  const selectAnswer = (optIdx) => {
    if (submitted) return;
    const newAnswers = [...answers];
    newAnswers[currentQ] = optIdx;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (answers.some(a => a === -1)) {
      setError('Please answer all questions before submitting');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await learningAPI.submitQuiz({
        quiz_id: quiz.quiz_id,
        answers,
      });
      setResult(res);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (submitted && result) {
    const pct = result.percentage;
    const emoji = pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '📚';
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card p-8 text-center mb-6">
          <div className="text-6xl mb-4">{emoji}</div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">{pct.toFixed(0)}%</h2>
          <p className="text-slate-500 text-lg mb-1">{result.correct_count} / {result.total_questions} correct</p>
          <div className={`inline-block mt-2 px-4 py-1 rounded-full text-sm font-medium ${pct >= 80 ? 'bg-emerald-100 text-emerald-700' : pct >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
            {pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Good job!' : 'Keep studying!'}
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <h3 className="font-semibold text-slate-900">Review Answers</h3>
          {result.questions.map((q, i) => {
            const userAns = result.user_answers[i];
            const correct = q.correct_answer;
            const isRight = userAns === correct;
            return (
              <div key={i} className={`card p-5 border-l-4 ${isRight ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
                <div className={`text-sm font-medium mb-3 ${isDevanagari ? 'devanagari' : ''}`}>
                  {i + 1}. {q.question}
                </div>
                <div className="space-y-2">
                  {q.options.map((opt, j) => (
                    <div key={j} className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${isDevanagari ? 'devanagari' : ''} ${
                      j === correct ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' :
                      j === userAns && !isRight ? 'bg-red-50 border border-red-200 text-red-700' :
                      'bg-slate-50 text-slate-600'
                    }`}>
                      <span>{j === correct ? '✓' : j === userAns && !isRight ? '✗' : '○'}</span>
                      {String.fromCharCode(65 + j)}. {opt}
                    </div>
                  ))}
                </div>
                {q.explanation && (
                  <div className={`mt-3 text-xs text-slate-500 bg-slate-50 rounded-lg p-3 ${isDevanagari ? 'devanagari' : ''}`}>
                    💡 {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-4">
          <button onClick={onFinish} className="btn-primary flex-1 justify-center">Try Another Quiz</button>
          <Link href="/tutor" className="btn-secondary flex-1 justify-center text-center">Back to Tutor</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Question {currentQ + 1} of {quiz.questions.length}</span>
          <span className="badge-cyan">{quiz.difficulty} · {quiz.language.toUpperCase()}</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQ + 1) / quiz.questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="card p-8">
        <div className={`text-lg font-semibold text-slate-900 mb-6 leading-relaxed ${isDevanagari ? 'devanagari' : ''}`}>
          {q.question}
        </div>

        <div className="space-y-3 mb-6">
          {q.options.map((opt, i) => (
            <button key={i} onClick={() => selectAnswer(i)}
              className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all flex items-center gap-3 ${isDevanagari ? 'devanagari' : ''} ${
                answers[currentQ] === i
                  ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
              }`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${answers[currentQ] === i ? 'bg-cyan-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          ))}
        </div>

        {error && <div className="mb-4 text-red-600 text-sm text-center">{error}</div>}

        <div className="flex justify-between gap-3">
          <button onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0}
            className="btn-secondary disabled:opacity-40">← Previous</button>

          {currentQ < quiz.questions.length - 1 ? (
            <button onClick={() => setCurrentQ(q => q + 1)} disabled={answers[currentQ] === -1}
              className="btn-primary disabled:opacity-50">Next →</button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              className="btn-primary bg-gradient-to-r from-emerald-500 to-green-500">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : '✓ Submit Quiz'}
            </button>
          )}
        </div>
      </div>

      {/* Question navigator */}
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {quiz.questions.map((_, i) => (
          <button key={i} onClick={() => setCurrentQ(i)}
            className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
              i === currentQ ? 'bg-cyan-500 text-white' :
              answers[i] !== -1 ? 'bg-emerald-100 text-emerald-700' :
              'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}>
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function QuizPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [quiz, setQuiz] = useState(null);

  useEffect(() => {
    if (!user) router.push('/auth/login');
  }, [user]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard/student" className="text-slate-400 hover:text-slate-600">←</Link>
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">E</div>
        <span className="font-semibold text-slate-900">Quiz Centre</span>
        {quiz && (
          <button onClick={() => setQuiz(null)} className="ml-auto btn-ghost text-sm">
            New Quiz
          </button>
        )}
      </div>
      <div className="p-8">
        {quiz ? (
          <QuizActive quiz={quiz} onFinish={() => setQuiz(null)} />
        ) : (
          <QuizSetup onGenerate={setQuiz} />
        )}
      </div>
    </div>
  );
}
