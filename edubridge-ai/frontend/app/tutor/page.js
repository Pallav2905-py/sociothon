'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import { chatAPI, documentsAPI, learningAPI } from '@/app/lib/api';

const LANGUAGES = [
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'hi', label: 'हिंदी', flag: '🇮🇳' },
  { value: 'mr', label: 'मराठी', flag: '🏔️' },
];

const DIFFICULTIES = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const SUGGESTED_PROMPTS = {
  en: [
    'Explain this topic simply',
    'Give me a real-life example',
    'Summarise this chapter',
    'What are the key points?',
    'Explain difficult terms',
  ],
  hi: [
    'इसे सरल भाषा में समझाएं',
    'एक वास्तविक उदाहरण दें',
    'इस अध्याय का सारांश',
    'मुख्य बिंदु क्या हैं?',
    'कठिन शब्दों को समझाएं',
  ],
  mr: [
    'हे सोप्या भाषेत समजावा',
    'एक वास्तविक उदाहरण द्या',
    'या प्रकरणाचा सारांश',
    'महत्त्वाचे मुद्दे कोणते?',
    'कठीण शब्द समजावा',
  ],
};

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">E</div>
      <div className="chat-bubble-ai py-3 px-4">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-slate-400 rounded-full typing-dot" />
          <span className="w-2 h-2 bg-slate-400 rounded-full typing-dot" />
          <span className="w-2 h-2 bg-slate-400 rounded-full typing-dot" />
        </div>
      </div>
    </div>
  );
}

function SourceCard({ source }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs">
      <div className="font-medium text-slate-700 mb-1 flex items-center gap-1">
        📄 {source.document_title}
        {source.page_number && <span className="badge-cyan ml-1">Page {source.page_number}</span>}
      </div>
      <div className="text-slate-500 leading-relaxed line-clamp-3">{source.excerpt}</div>
      <div className="mt-1 text-slate-400">Relevance: {(source.relevance_score * 100).toFixed(0)}%</div>
    </div>
  );
}

function Message({ msg }) {
  const [copied, setCopied] = useState(false);

  const copyText = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="chat-bubble-user">
          <div className={msg.language === 'mr' || msg.language === 'hi' ? 'devanagari' : ''}>
            {msg.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-1">E</div>
      <div className="flex-1 min-w-0">
        <div className="chat-bubble-ai">
          <div className={`ai-prose whitespace-pre-wrap ${msg.language === 'mr' || msg.language === 'hi' ? 'devanagari' : ''}`}>
            {msg.content}
          </div>
          {msg.insufficient && (
            <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
              ⚠️ Limited information found in the selected document.
            </div>
          )}
        </div>

        {/* Sources */}
        {msg.sources?.length > 0 && (
          <div className="mt-2 space-y-2">
            <div className="text-xs text-slate-400 font-medium">📎 Sources</div>
            {msg.sources.map((s, i) => <SourceCard key={i} source={s} />)}
          </div>
        )}

        {/* Actions */}
        <div className="mt-2 flex gap-2">
          <button onClick={copyText} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TutorContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [language, setLanguage] = useState('en');
  const [difficulty, setDifficulty] = useState('beginner');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [useLocalExample, setUseLocalExample] = useState(false);
  const [showSources, setShowSources] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    setLanguage(user.preferred_language || 'en');
    loadDocuments();
  }, [user]);

  useEffect(() => {
    const docId = searchParams.get('document');
    if (docId && documents.length > 0) {
      const doc = documents.find(d => d.id === parseInt(docId));
      if (doc) setSelectedDoc(doc);
    }
  }, [searchParams, documents]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadDocuments = async () => {
    try {
      const docs = await documentsAPI.list();
      setDocuments(docs.filter(d => d.processing_status === 'completed'));
    } catch {}
  };

  const sendMessage = async (text) => {
    const question = text || input.trim();
    if (!question || loading) return;

    setInput('');
    const userMsg = { role: 'user', content: question, language, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await chatAPI.ask({
        question,
        language,
        difficulty,
        document_id: selectedDoc?.id || null,
        session_id: sessionId || null,
        use_local_example: useLocalExample,
      });

      setSessionId(response.session_id);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.answer,
        language: response.language,
        sources: response.sources,
        insufficient: response.insufficient_context,
        id: response.message_id,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Error: ${err.message}`,
        language,
        sources: [],
        id: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId(null);
  };

  const generateSummary = async () => {
    if (!selectedDoc) return;
    const prompts = { en: 'Summarise this chapter', hi: 'इस अध्याय का सारांश करें', mr: 'या प्रकरणाचा सारांश करा' };
    sendMessage(prompts[language]);
  };

  if (!user) return null;

  const suggestions = SUGGESTED_PROMPTS[language] || SUGGESTED_PROMPTS.en;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* ── Left Sidebar ─────────────────────────────────── */}
      <aside className="w-72 bg-white border-r border-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <Link href="/dashboard/student" className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">E</div>
            <span className="font-semibold text-slate-900 text-sm">EduBridge AI</span>
          </Link>
          <h2 className="font-semibold text-slate-900 text-sm mb-3">Select Learning Material</h2>

          <div className="space-y-2">
            <div
              onClick={() => setSelectedDoc(null)}
              className={`p-3 rounded-xl cursor-pointer text-sm transition-all border ${!selectedDoc ? 'border-cyan-200 bg-cyan-50 text-cyan-700' : 'border-transparent hover:bg-slate-50 text-slate-600'}`}
            >
              <div className="font-medium">General Knowledge</div>
              <div className="text-xs opacity-70 mt-0.5">AI answers from general knowledge</div>
            </div>

            {documents.map(doc => (
              <div
                key={doc.id}
                onClick={() => { setSelectedDoc(doc); clearChat(); }}
                className={`p-3 rounded-xl cursor-pointer text-sm transition-all border ${selectedDoc?.id === doc.id ? 'border-cyan-200 bg-cyan-50 text-cyan-700' : 'border-transparent hover:bg-slate-50 text-slate-600'}`}
              >
                <div className="font-medium truncate">{doc.title}</div>
                <div className="text-xs opacity-70 mt-0.5">{doc.subject || 'General'} · {doc.page_count}p</div>
              </div>
            ))}

            {documents.length === 0 && (
              <div className="text-xs text-slate-400 text-center py-4">
                No documents available yet
              </div>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="p-4 flex-1 overflow-y-auto">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Settings</h3>

          <div className="mb-4">
            <label className="label text-xs">Response Language</label>
            <div className="space-y-1.5">
              {LANGUAGES.map(l => (
                <button
                  key={l.value}
                  onClick={() => setLanguage(l.value)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${language === l.value ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <span>{l.flag}</span> {l.label}
                  {language === l.value && <span className="ml-auto text-cyan-500">✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="label text-xs">Explanation Level</label>
            <div className="space-y-1.5">
              {DIFFICULTIES.map(d => (
                <button
                  key={d.value}
                  onClick={() => setDifficulty(d.value)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${difficulty === d.value ? 'bg-navy/10 text-navy border border-navy/20' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {d.label}
                  {difficulty === d.value && <span className="ml-auto">✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useLocalExample}
                onChange={e => setUseLocalExample(e.target.checked)}
                className="w-4 h-4 rounded accent-cyan-500"
              />
              <span className="text-sm text-slate-600">Include everyday example</span>
            </label>
            <p className="text-xs text-slate-400 mt-1 ml-6">Relatable examples from daily life</p>
          </div>

          {selectedDoc && (
            <button onClick={generateSummary} className="btn-secondary w-full text-xs py-2 justify-center">
              📋 Summarise Chapter
            </button>
          )}
        </div>

        <div className="p-4 border-t border-slate-100">
          <Link href="/dashboard/student" className="btn-ghost w-full text-xs justify-center">
            ← Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* ── Chat Area ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-slate-900">
              {selectedDoc ? selectedDoc.title : 'AI Learning Assistant'}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 bg-emerald-400 rounded-full" />
              <span className="text-xs text-slate-500">
                Answering in {LANGUAGES.find(l => l.value === language)?.label} · {difficulty}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button onClick={clearChat} className="btn-ghost text-xs text-red-500 hover:bg-red-50">
                Clear Chat
              </button>
            )}
            <Link href="/quiz" className="btn-secondary text-xs py-2">
              📝 Generate Quiz
            </Link>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">
                {language === 'mr' ? '🙏' : language === 'hi' ? '🙏' : '💬'}
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                {language === 'mr' ? 'प्रश्न विचारा, उत्तर मिळवा' :
                 language === 'hi' ? 'प्रश्न पूछें, उत्तर पाएं' :
                 'Ask anything, get clear answers'}
              </h2>
              <p className="text-slate-500 text-sm mb-8 max-w-md mx-auto">
                {language === 'mr' ? `${selectedDoc ? selectedDoc.title + ' बद्दल' : ''} कोणताही प्रश्न विचारा` :
                 language === 'hi' ? `${selectedDoc ? selectedDoc.title + ' के बारे में' : ''} कोई भी प्रश्न पूछें` :
                 `Ask about ${selectedDoc ? selectedDoc.title : 'any topic'} and get grounded AI explanations`}
              </p>

              {/* Suggested prompts */}
              <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-600 text-sm hover:border-cyan-300 hover:text-cyan-700 hover:bg-cyan-50 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => <Message key={msg.id || i} msg={msg} />)}
              {loading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-slate-100 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    language === 'mr' ? 'प्रश्न विचारा... (Shift+Enter for new line)' :
                    language === 'hi' ? 'प्रश्न पूछें... (Shift+Enter नई लाइन के लिए)' :
                    'Ask your question... (Shift+Enter for new line)'
                  }
                  rows={2}
                  className="input resize-none pr-4 text-sm leading-relaxed"
                  style={{ fontFamily: (language === 'mr' || language === 'hi') ? "'Noto Sans Devanagari', 'Inter', sans-serif" : undefined }}
                  disabled={loading}
                />
              </div>
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="btn-primary h-12 w-12 justify-center p-0 flex-shrink-0 rounded-xl"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : '↑'}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
              <span>EduBridge AI · Answers grounded in your documents</span>
              <span>{input.length}/2000</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TutorPage() {
  return (
    <Suspense>
      <TutorContent />
    </Suspense>
  );
}
