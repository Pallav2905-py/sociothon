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

const STATUS_LABELS = {
  completed: '✓ Ready',
  processing: '⟳ Processing',
  pending: '⏳ Pending',
  failed: '✗ Failed',
  scanned_pdf: '⚠️ Scanned PDF',
};

export default function DocumentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
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
    if (!confirm('Delete this document? This cannot be undone.')) return;
    try {
      await documentsAPI.delete(id);
      setDocuments(d => d.filter(doc => doc.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={user.role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student'} className="text-slate-400 hover:text-slate-600">←</Link>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">E</div>
          <span className="font-semibold text-slate-900">Learning Materials</span>
        </div>
        {user.role === 'teacher' && (
          <Link href="/dashboard/teacher/upload" className="btn-primary text-sm py-2">
            + Upload PDF
          </Link>
        )}
      </div>

      <div className="max-w-5xl mx-auto p-8">
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-20 skeleton rounded-2xl" />)}
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">📚</div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">No learning materials yet</h2>
            <p className="text-slate-500 mb-6">
              {user.role === 'teacher' ? 'Upload your first PDF to get started.' : 'Ask your teacher to upload chapter PDFs.'}
            </p>
            {user.role === 'teacher' && (
              <Link href="/dashboard/teacher/upload" className="btn-primary">Upload PDF →</Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map(doc => (
              <div key={doc.id} className="card p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-navy to-navy-light flex items-center justify-center text-white text-xl flex-shrink-0">
                  📄
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900 truncate">{doc.title}</span>
                    <span className={`badge text-xs ${STATUS_COLORS[doc.processing_status] || 'badge-amber'}`}>
                      {STATUS_LABELS[doc.processing_status] || doc.processing_status}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500">
                    {[doc.subject, doc.chapter].filter(Boolean).join(' › ')}
                    {doc.page_count > 0 && ` · ${doc.page_count} pages`}
                    {doc.description && ` · ${doc.description.substring(0, 60)}`}
                  </div>
                  {doc.processing_error && (
                    <div className="text-xs text-red-600 mt-1">⚠️ {doc.processing_error}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {doc.processing_status === 'completed' && (
                    <Link href={`/tutor?document=${doc.id}`} className="btn-secondary text-xs py-2">
                      💬 Ask AI
                    </Link>
                  )}
                  {user.role === 'teacher' && (
                    <>
                      {(doc.processing_status === 'failed' || doc.processing_status === 'scanned_pdf') && (
                        <button onClick={async () => {
                          await documentsAPI.reprocess(doc.id).catch(() => {});
                          loadDocuments();
                        }} className="btn-ghost text-xs">
                          ↻ Retry
                        </button>
                      )}
                      <button onClick={() => handleDelete(doc.id)} className="btn-ghost text-xs text-red-500 hover:bg-red-50">
                        🗑
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
