'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import { documentsAPI } from '@/app/lib/api';

const STATUS_COLORS = {
  completed: 'badge-green',
  processing: 'badge-cyan',
  pending: 'badge-amber',
  failed: 'badge-red',
  scanned_pdf: 'badge-amber',
};

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    if (user.role !== 'teacher') { router.push('/dashboard/student'); return; }
    loadDocuments();
  }, [user]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await documentsAPI.list();
      setDocuments(docs);
    } catch {}
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this document and all its data? This cannot be undone.')) return;
    await documentsAPI.delete(id).catch(() => {});
    setDocuments(d => d.filter(doc => doc.id !== id));
  };

  if (!user) return null;

  const stats = {
    total: documents.length,
    ready: documents.filter(d => d.processing_status === 'completed').length,
    processing: documents.filter(d => ['pending', 'processing'].includes(d.processing_status)).length,
    failed: documents.filter(d => ['failed', 'scanned_pdf'].includes(d.processing_status)).length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-100 flex flex-col z-40">
        <div className="p-6 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">E</div>
            <span className="font-bold text-slate-900">EduBridge AI</span>
          </Link>
          <div className="mt-2 badge-amber text-xs">Teacher Portal</div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link href="/dashboard/teacher" className="sidebar-item-active">🏠 Dashboard</Link>
          <Link href="/dashboard/teacher/upload" className="sidebar-item">📤 Upload PDF</Link>
          <Link href="/documents" className="sidebar-item">📚 All Materials</Link>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-semibold text-sm">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">{user.name}</div>
              <div className="text-xs text-slate-500">Teacher</div>
            </div>
          </div>
          <button onClick={logout} className="btn-ghost w-full text-xs justify-start text-red-500 hover:bg-red-50">Sign Out</button>
        </div>
      </aside>

      <main className="ml-64 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Teacher Dashboard</h1>
            <p className="text-slate-500 mt-1">Manage your uploaded learning materials</p>
          </div>
          <Link href="/dashboard/teacher/upload" className="btn-primary">
            + Upload New PDF
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: '📁', value: stats.total, label: 'Total Documents', color: 'bg-slate-50' },
            { icon: '✅', value: stats.ready, label: 'Ready to Use', color: 'bg-emerald-50' },
            { icon: '⏳', value: stats.processing, label: 'Processing', color: 'bg-amber-50' },
            { icon: '❌', value: stats.failed, label: 'Failed / Scanned', color: 'bg-red-50' },
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

        {/* Documents Table */}
        <div className="card overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Uploaded Documents</h2>
            <button onClick={loadDocuments} className="btn-ghost text-xs">↻ Refresh</button>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 skeleton rounded-xl" />)}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📤</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No documents yet</h3>
              <p className="text-slate-500 mb-6">Upload your first educational PDF to get started.</p>
              <Link href="/dashboard/teacher/upload" className="btn-primary">Upload PDF →</Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {documents.map(doc => (
                <div key={doc.id} className="p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-navy to-navy-light flex items-center justify-center text-white flex-shrink-0">📄</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 truncate">{doc.title}</span>
                      <span className={`badge text-xs ${STATUS_COLORS[doc.processing_status] || 'badge-amber'}`}>
                        {doc.processing_status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {[doc.subject, doc.chapter].filter(Boolean).join(' › ')}
                      {doc.page_count > 0 && ` · ${doc.page_count} pages`}
                      {doc.file_size && ` · ${(doc.file_size / 1024).toFixed(0)}KB`}
                    </div>
                    {doc.processing_error && (
                      <div className="text-xs text-red-600 mt-1 truncate">⚠️ {doc.processing_error}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {doc.processing_status === 'completed' && (
                      <Link href={`/tutor?document=${doc.id}`} className="btn-secondary text-xs py-1.5 px-3">
                        Preview
                      </Link>
                    )}
                    {['failed', 'scanned_pdf'].includes(doc.processing_status) && (
                      <button onClick={async () => {
                        await documentsAPI.reprocess(doc.id).catch(() => {});
                        loadDocuments();
                      }} className="btn-ghost text-xs">↻ Retry</button>
                    )}
                    <button onClick={() => handleDelete(doc.id)} className="btn-ghost text-xs text-red-500 hover:bg-red-50">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
