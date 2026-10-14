'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';

const LANGUAGES = [
  { code: 'mr', label: 'मराठी', sub: 'Marathi', color: 'from-orange-400 to-amber-500' },
  { code: 'hi', label: 'हिंदी', sub: 'Hindi', color: 'from-green-400 to-emerald-500' },
  { code: 'en', label: 'English', sub: 'English', color: 'from-cyan-400 to-blue-500' },
];

const FEATURES = [
  {
    icon: '🧠',
    title: 'AI-Powered Understanding',
    desc: 'Ask questions in your language and get clear, contextual explanations grounded in your textbook content.',
  },
  {
    icon: '📄',
    title: 'Document Intelligence',
    desc: 'Upload any educational PDF and let EduBridge AI process, index, and make it fully interactive.',
  },
  {
    icon: '🌍',
    title: 'Truly Multilingual',
    desc: 'Ask in Marathi, get answers in Marathi. Ask in Hindi, get answers in Hindi. No translation distortion.',
  },
  {
    icon: '📝',
    title: 'AI Quiz Generator',
    desc: 'Generate practice quizzes from your chapters with difficulty settings and instant feedback.',
  },
  {
    icon: '💡',
    title: 'Local Examples',
    desc: 'Understand abstract concepts with relatable everyday examples from agriculture, markets, and daily life.',
  },
  {
    icon: '📊',
    title: 'Learning Analytics',
    desc: 'Track your questions, quiz scores, and learning sessions with a personal progress dashboard.',
  },
];

const STEPS = [
  { step: '01', title: 'Teacher Uploads', desc: 'Upload chapter PDFs with title and subject tags', icon: '📤' },
  { step: '02', title: 'AI Processes', desc: 'EduBridge AI extracts, indexes, and understands the content', icon: '⚡' },
  { step: '03', title: 'Student Asks', desc: 'Ask any question in your preferred language', icon: '💬' },
  { step: '04', title: 'AI Explains', desc: 'Get grounded, source-cited explanations with examples', icon: '✨' },
];

const SDG_ITEMS = [
  {
    number: '4',
    title: 'Quality Education',
    color: 'from-red-500 to-orange-500',
    points: [
      'Equitable access to educational content',
      'AI tutoring for underserved students',
      'Support for regional language learners',
    ],
  },
  {
    number: '10',
    title: 'Reduced Inequalities',
    color: 'from-pink-500 to-rose-500',
    points: [
      'Breaks the English medium barrier',
      'Supports first-generation learners',
      'Democratises quality explanation',
    ],
  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleStart = () => {
    if (user) {
      router.push(user.role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student');
    } else {
      router.push('/auth/login');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-md' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">E</div>
            <span className={`font-bold text-lg ${scrolled ? 'text-slate-900' : 'text-white'}`}>EduBridge AI</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <button onClick={handleStart} className="btn-primary py-2 px-4 text-sm">
                Go to Dashboard →
              </button>
            ) : (
              <>
                <Link href="/auth/login" className={`text-sm font-medium transition-colors ${scrolled ? 'text-slate-600 hover:text-slate-900' : 'text-white/80 hover:text-white'}`}>
                  Sign In
                </Link>
                <Link href="/auth/register" className="btn-primary py-2 px-4 text-sm">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-[#0a1628] via-[#0f2044] to-[#1e3a5f]">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/5 rounded-full blur-3xl" />
          {/* Grid pattern */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-32 grid lg:grid-cols-2 gap-16 items-center">
          <div className="animate-fade-in-up">
            {/* Hackathon badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
              Sociothon 2026 — Problem S3: Education Beyond Language Barriers
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Learn in your language.{' '}
              <span className="gradient-text">Learn without limits.</span>
            </h1>

            <p className="text-xl text-slate-300 leading-relaxed mb-8">
              Your personal multilingual AI tutor. Understand difficult concepts, explore your textbooks,
              and learn confidently in{' '}
              <span className="text-amber-300 font-medium">मराठी</span>,{' '}
              <span className="text-green-300 font-medium">हिंदी</span>, and{' '}
              <span className="text-cyan-300 font-medium">English</span>.
            </p>

            {/* Language pills */}
            <div className="flex gap-3 mb-10">
              {LANGUAGES.map(lang => (
                <div key={lang.code} className={`px-4 py-2 rounded-xl bg-gradient-to-r ${lang.color} bg-opacity-20 border border-white/10 text-white text-center`}>
                  <div className="text-lg font-bold">{lang.label}</div>
                  <div className="text-xs text-white/60">{lang.sub}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <button onClick={handleStart} className="btn-primary text-base px-8 py-4 animate-pulse-glow">
                Start Learning Free →
              </button>
              <a href="#features" className="btn-secondary text-base px-8 py-4 bg-white/10 text-white border-white/20 hover:bg-white/20">
                Explore Features
              </a>
            </div>

            <div className="mt-10 flex items-center gap-6 text-sm text-slate-400">
              <div className="flex items-center gap-1.5"><span className="text-green-400">✓</span> Free for students</div>
              <div className="flex items-center gap-1.5"><span className="text-green-400">✓</span> No English required</div>
              <div className="flex items-center gap-1.5"><span className="text-green-400">✓</span> Works offline-ready</div>
            </div>
          </div>

          {/* Hero illustration */}
          <div className="hidden lg:flex justify-center items-center">
            <div className="relative">
              {/* Mock AI Chat Card */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-6 w-96 shadow-2xl">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold">E</div>
                  <div>
                    <div className="text-white font-semibold text-sm">EduBridge AI</div>
                    <div className="text-cyan-300 text-xs">● Online • मराठी</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-cyan-500/20 rounded-xl rounded-tr-sm px-4 py-3 ml-8 text-cyan-100 text-sm">
                    प्रकाशसंश्लेषण म्हणजे काय?
                  </div>
                  <div className="bg-white/10 rounded-xl rounded-tl-sm px-4 py-3 mr-4 text-white text-sm leading-relaxed">
                    प्रकाशसंश्लेषण म्हणजे वनस्पती सूर्यप्रकाश, पाणी आणि कार्बन डायऑक्साइड वापरून स्वतःसाठी अन्न तयार करण्याची प्रक्रिया आहे. 🌱
                  </div>
                  <div className="bg-white/5 rounded-lg px-3 py-2 text-xs text-slate-300">
                    📄 Source: Chapter 6 — Photosynthesis, Page 4
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <div className="flex-1 bg-white/10 rounded-xl px-3 py-2 text-sm text-slate-300">
                    प्रश्न विचारा...
                  </div>
                  <div className="w-9 h-9 bg-cyan-500 rounded-xl flex items-center justify-center text-white text-sm">↑</div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-medium shadow-lg">
                ✓ Source cited
              </div>
              <div className="absolute -bottom-4 -left-4 bg-amber-500 text-white px-3 py-1.5 rounded-xl text-xs font-medium shadow-lg">
                📝 Quiz ready
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────── */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="badge-cyan mx-auto mb-3">How It Works</div>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Simple. Powerful. In your language.</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">From classroom textbook to interactive AI conversation in four steps.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={i} className="card p-6 relative overflow-hidden">
                <div className="text-4xl mb-3">{s.icon}</div>
                <div className="text-cyan-500 text-xs font-bold mb-1">STEP {s.step}</div>
                <h3 className="font-semibold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-slate-500 text-sm">{s.desc}</p>
                {i < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 text-slate-300 text-xl z-10">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="badge-navy mx-auto mb-3">Features</div>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Everything a learner needs</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              EduBridge AI is not just translation. It's genuine, grounded, multilingual understanding.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="card p-6 hover:border-cyan-200 hover:shadow-lg hover:shadow-cyan-50 transition-all duration-200">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SDG Impact ─────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-[#0f2044] to-[#1e3a5f]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm font-medium mb-4">
              🌍 Social Impact
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">Aligned with Global Goals</h2>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto">
              EduBridge AI directly addresses two United Nations Sustainable Development Goals.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {SDG_ITEMS.map((sdg) => (
              <div key={sdg.number} className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-8">
                <div className={`inline-flex items-center gap-3 mb-4 px-4 py-2 rounded-xl bg-gradient-to-r ${sdg.color}`}>
                  <span className="text-white font-black text-2xl">SDG {sdg.number}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-4">{sdg.title}</h3>
                <ul className="space-y-2">
                  {sdg.points.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-300 text-sm">
                      <span className="text-cyan-400 mt-0.5">✓</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Ready to learn in your language?
          </h2>
          <p className="text-slate-500 text-lg mb-10">
            Join EduBridge AI and experience education without language barriers.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/auth/register?role=student" className="btn-primary text-base px-8 py-4">
              I'm a Student →
            </Link>
            <Link href="/auth/register?role=teacher" className="btn-secondary text-base px-8 py-4">
              I'm a Teacher
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">E</div>
            <span className="text-white font-semibold">EduBridge AI</span>
            <span className="text-slate-600">|</span>
            <span className="text-sm">Sociothon 2026</span>
          </div>
          <div className="text-sm">
            Built for SDG 4 · SDG 10 · Supporting learners across language barriers
          </div>
        </div>
      </footer>
    </div>
  );
}
