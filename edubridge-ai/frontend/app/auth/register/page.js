'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';

const LANG_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिंदी (Hindi)' },
  { value: 'mr', label: 'मराठी (Marathi)' },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, user } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: searchParams.get('role') || 'student',
    preferred_language: 'en',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.push(user.role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student');
  }, [user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const u = await register(form.name, form.email, form.password, form.role, form.preferred_language);
      router.push(u.role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div className="min-h-screen flex">
      {/* Left */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-[#0a1628] via-[#0f2044] to-[#1e3a5f] p-12">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">E</div>
          <span className="text-white font-bold text-lg">EduBridge AI</span>
        </Link>
        <div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Start your journey.<br />
            <span className="gradient-text">Learn in your language.</span>
          </h2>
          <p className="text-slate-300 mb-8">
            Join thousands of students learning in Marathi, Hindi, and English with AI assistance.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { n: 'मराठी', sub: 'Marathi', bg: 'bg-orange-500/20 border-orange-500/30 text-orange-300' },
              { n: 'हिंदी', sub: 'Hindi', bg: 'bg-green-500/20 border-green-500/30 text-green-300' },
              { n: 'English', sub: 'English', bg: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300' },
            ].map(l => (
              <div key={l.sub} className={`${l.bg} border rounded-xl p-3 text-center`}>
                <div className="font-bold">{l.n}</div>
                <div className="text-xs opacity-70">{l.sub}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-slate-500 text-sm">Sociothon 2026 · SDG 4 · SDG 10</div>
      </div>

      {/* Right */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Create your account</h1>
            <p className="text-slate-500 text-sm">Join EduBridge AI today. It&apos;s free.</p>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {['student', 'teacher'].map(role => (
              <button
                key={role}
                type="button"
                onClick={() => setForm(f => ({ ...f, role }))}
                className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
                  form.role === role
                    ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {role === 'student' ? '🎓 Student' : '👩‍🏫 Teacher'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="label">Full Name</label>
              <input className="input" type="text" placeholder="Priya Sharma" value={form.name} onChange={set('name')} required minLength={2} />
            </div>

            <div>
              <label className="label">Email address</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
            </div>

            <div>
              <label className="label">Preferred Language</label>
              <select className="input" value={form.preferred_language} onChange={set('preferred_language')}>
                {LANG_OPTIONS.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="Min. 6 characters" value={form.password} onChange={set('password')} required minLength={6} />
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <input className="input" type="password" placeholder="Repeat your password" value={form.confirmPassword} onChange={set('confirmPassword')} required />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : `Create ${form.role === 'teacher' ? 'Teacher' : 'Student'} Account →`}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-cyan-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
