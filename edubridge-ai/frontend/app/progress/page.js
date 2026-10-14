'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import { learningAPI } from '@/app/lib/api';

const LANG_LABELS = { en: 'English', hi: 'हिंदी', mr: 'मराठी' };

export default function ProgressPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    learningAPI.getProgress()
      .then(setProgress)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const avgPct = progress?.average_quiz_score
    ? ((progress.average_quiz_score / (progress.total_questions_asked || 1)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard/student" className="text-slate-400 hover:text-slate-600">←</Link>
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">E</div>
        <span className="font-semibold text-slate-900">My Learning Progress</span>
      </div>

      <div className="max-w-5xl mx-auto p-8">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1,2,3,4].map(i => <div key={i} className="h-24 skeleton rounded-2xl" />)}
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { icon: '💬', label: 'Questions Asked', value: progress?.total_questions_asked ?? 0, color: 'bg-cyan-50 text-cyan-500' },
                { icon: '📖', label: 'Learning Sessions', value: progress?.total_sessions ?? 0, color: 'bg-blue-50 text-blue-500' },
                { icon: '📝', label: 'Quizzes Completed', value: progress?.quizzes_completed ?? 0, color: 'bg-purple-50 text-purple-500' },
                { icon: '⭐', label: 'Avg Quiz Score', value: progress?.average_quiz_score ? progress.average_quiz_score.toFixed(1) : '—', color: 'bg-amber-50 text-amber-500' },
              ].map((s, i) => (
                <div key={i} className="card p-5 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${s.color}`}>{s.icon}</div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900">{s.value}</div>
                    <div className="text-xs text-slate-500">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Recent Documents */}
              <div className="card p-6">
                <h2 className="font-semibold text-slate-900 mb-4">Recently Studied</h2>
                {!progress?.recent_documents?.length ? (
                  <div className="text-center py-8 text-slate-400">
                    <div className="text-3xl mb-2">📚</div>
                    <div className="text-sm">No documents studied yet</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {progress.recent_documents.map(doc => (
                      <Link key={doc.id} href={`/tutor?document=${doc.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="w-9 h-9 rounded-lg bg-navy/10 flex items-center justify-center text-navy text-sm">📄</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">{doc.title}</div>
                          <div className="text-xs text-slate-500">{doc.subject || 'General'}</div>
                        </div>
                        <span className="text-cyan-500 text-xs">→</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Questions */}
              <div className="card p-6">
                <h2 className="font-semibold text-slate-900 mb-4">Recent Questions</h2>
                {!progress?.recent_activity?.length ? (
                  <div className="text-center py-8 text-slate-400">
                    <div className="text-3xl mb-2">💭</div>
                    <div className="text-sm">No questions asked yet</div>
                    <Link href="/tutor" className="btn-primary text-xs mt-3 py-2 inline-flex">Ask AI Tutor →</Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {progress.recent_activity.map((act, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                        <span className="text-lg">💬</span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm text-slate-700 ${act.language === 'mr' || act.language === 'hi' ? 'devanagari' : ''}`}>
                            {act.content}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {LANG_LABELS[act.language]} · {new Date(act.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Encouragement */}
            {progress?.total_questions_asked === 0 && (
              <div className="mt-8 card-gradient p-8 text-center">
                <div className="text-4xl mb-3">🚀</div>
                <h3 className="text-xl font-bold text-white mb-2">Start Your Journey!</h3>
                <p className="text-white/70 mb-6">Ask your first question to the AI Tutor and begin tracking your progress.</p>
                <Link href="/tutor" className="btn-secondary bg-white text-navy font-semibold">
                  Open AI Tutor →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
