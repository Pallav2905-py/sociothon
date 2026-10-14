'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';

const LANG_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिंदी (Hindi)' },
  { value: 'mr', label: 'मराठी (Marathi)' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.push(user.role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student');
  }, [user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = await login(form.email, form.password);
      router.push(u.role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student');
    } catch (err) {
      setError(err.message || 'Login failed. Check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  // Quick demo fill
  const demoFill = (role) => {
    setForm({ email: `demo_${role}@edubridge.ai`, password: 'demo1234' });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-[#0a1628] via-[#0f2044] to-[#1e3a5f] p-12">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">E</div>
          <span className="text-white font-bold text-lg">EduBridge AI</span>
        </Link>
        <div>
          <h2 className="text-4xl font-bold text-white mb-4">
            शिकणे आता<br />
            <span className="gradient-text">भाषेच्या पलीकडे</span>
          </h2>
          <p className="text-slate-300 text-lg mb-8">
            Learn in your language. Learn without limits.
          </p>
          <div className="space-y-4">
            {[
              { flag: '🌍', text: 'Multilingual AI explanations in Marathi, Hindi & English' },
              { flag: '📄', text: 'Upload your textbook PDFs and ask anything' },
              { flag: '📝', text: 'Auto-generate practice quizzes from your chapters' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-300">
                <span className="text-xl">{item.flag}</span>
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-slate-500 text-sm">Sociothon 2026 · SDG 4 · SDG 10</div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link href="/" className="flex items-center gap-2 lg:hidden mb-6">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">E</div>
              <span className="font-bold text-slate-900">EduBridge AI</span>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h1>
            <p className="text-slate-500 text-sm">Sign in to continue your learning journey</p>
          </div>

          {/* Demo buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button onClick={() => demoFill('student')} className="text-xs py-2 px-3 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition-colors">
              Demo: Student
            </button>
            <button onClick={() => demoFill('teacher')} className="text-xs py-2 px-3 rounded-lg border border-navy/20 bg-navy/5 text-navy hover:bg-navy/10 transition-colors">
              Demo: Teacher
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="label">Email address</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In →'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-cyan-600 font-medium hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
