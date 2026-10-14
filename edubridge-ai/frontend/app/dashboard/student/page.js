'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import { learningAPI, documentsAPI } from '@/app/lib/api';

const LANG_LABELS = { en: 'English', hi: 'हिंदी', mr: 'मराठी' };

function StatCard({ icon, value, label, color }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [progress, setProgress] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    if (user.role === 'teacher') { router.push('/dashboard/teacher'); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prog, docs] = await Promise.all([
        learningAPI.getProgress().catch(() => null),
        documentsAPI.list().catch(() => []),
      ]);
      setProgress(prog);
      setDocuments(docs);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const lang = user.preferred_language || 'en';

  const QUICK_ACTIONS = [
    { icon: '💬', label: 'Ask AI Tutor', sub: 'Get answers in your language', href: '/tutor', color: 'bg-cyan-50 border-cyan-200 hover:bg-cyan-100' },
    { icon: '📚', label: 'My Materials', sub: 'Browse uploaded chapters', href: '/documents', color: 'bg-blue-50 border-blue-200 hover:bg-blue-100' },
    { icon: '📝', label: 'Practice Quiz', sub: 'Test your understanding', href: '/quiz', color: 'bg-purple-50 border-purple-200 hover:bg-purple-100' },
    { icon: '📊', label: 'My Progress', sub: 'Track your learning', href: '/progress', color: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-100 flex flex-col z-40">
        <div className="p-6 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">E</div>
            <span className="font-bold text-slate-900">EduBridge AI</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link href="/dashboard/student" className="sidebar-item-active">🏠 Dashboard</Link>
          <Link href="/tutor" className="sidebar-item">💬 AI Tutor</Link>
          <Link href="/documents" className="sidebar-item">📚 Learning Materials</Link>
          <Link href="/quiz" className="sidebar-item">📝 Quiz Centre</Link>
          <Link href="/progress" className="sidebar-item">📊 My Progress</Link>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">{user.name}</div>
              <div className="text-xs text-slate-500">{LANG_LABELS[lang]}</div>
            </div>
          </div>
          <button onClick={logout} className="btn-ghost w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600 text-xs">
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === 'mr' ? `नमस्ते, ${user.name}! 👋` :
             lang === 'hi' ? `नमस्ते, ${user.name}! 👋` :
             `Welcome back, ${user.name}! 👋`}
          </h1>
          <p className="text-slate-500 mt-1">
            {lang === 'mr' ? 'आजचा अभ्यास सुरू करूया' :
             lang === 'hi' ? 'आज की पढ़ाई शुरू करते हैं' :
             "Let's continue your learning journey today."}
          </p>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1,2,3,4].map(i => <div key={i} className="h-24 skeleton rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon="💬" value={progress?.total_questions_asked ?? 0} label="Questions Asked" color="bg-cyan-50" />
            <StatCard icon="📖" value={progress?.total_sessions ?? 0} label="Learning Sessions" color="bg-blue-50" />
            <StatCard icon="📝" value={progress?.quizzes_completed ?? 0} label="Quizzes Done" color="bg-purple-50" />
            <StatCard icon="⭐" value={progress?.average_quiz_score ? `${progress.average_quiz_score.toFixed(1)}` : '–'} label="Avg Quiz Score" color="bg-amber-50" />
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {QUICK_ACTIONS.map(a => (
              <Link key={a.href} href={a.href}
                className={`card p-5 border-2 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${a.color}`}>
                <div className="text-3xl mb-3">{a.icon}</div>
                <div className="font-semibold text-slate-900 text-sm">{a.label}</div>
                <div className="text-xs text-slate-500 mt-1">{a.sub}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Documents */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Available Materials</h2>
              <Link href="/documents" className="text-cyan-600 text-sm hover:underline">View all →</Link>
            </div>
            {documents.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <div className="text-3xl mb-2">📚</div>
                <div className="text-sm">No learning materials yet.</div>
                <div className="text-xs mt-1">Ask your teacher to upload chapters.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.slice(0, 5).map(doc => (
                  <Link key={doc.id} href={`/tutor?document=${doc.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-navy to-navy-light flex items-center justify-center text-white text-sm flex-shrink-0">📄</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{doc.title}</div>
                      <div className="text-xs text-slate-500">{doc.subject || 'General'} · {doc.page_count} pages</div>
                    </div>
                    <span className={`badge text-xs ${doc.processing_status === 'completed' ? 'badge-green' : 'badge-amber'}`}>
                      {doc.processing_status === 'completed' ? 'Ready' : doc.processing_status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Recent Activity</h2>
              <Link href="/progress" className="text-cyan-600 text-sm hover:underline">View all →</Link>
            </div>
            {!progress?.recent_activity?.length ? (
              <div className="text-center py-8 text-slate-400">
                <div className="text-3xl mb-2">💭</div>
                <div className="text-sm">No activity yet.</div>
                <div className="text-xs mt-1">Start by asking the AI Tutor a question.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {progress.recent_activity.map((act, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50">
                    <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center text-sm flex-shrink-0">💬</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-700 truncate">{act.content}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{LANG_LABELS[act.language]} · {new Date(act.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
