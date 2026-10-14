'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import { documentsAPI } from '@/app/lib/api';

const MAX_SIZE_MB = 20;

export default function UploadPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileRef = useRef(null);

  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ title: '', subject: '', chapter: '', description: '' });
  const [status, setStatus] = useState('idle'); // idle | uploading | success | error
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  if (!user || user.role !== 'teacher') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">🚫</div>
          <p className="text-slate-600">Teacher access required</p>
          <Link href="/auth/login" className="btn-primary mt-4 inline-flex">Login</Link>
        </div>
      </div>
    );
  }

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are accepted.');
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_SIZE_MB}MB.`);
      return;
    }
    if (f.size === 0) {
      setError('File is empty.');
      return;
    }
    setError('');
    setFile(f);
    // Auto-fill title from filename
    if (!form.title) {
      const name = f.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
      setForm(prev => ({ ...prev, title: name }));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a PDF file.'); return; }
    if (!form.title.trim()) { setError('Document title is required.'); return; }

    setStatus('uploading');
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', form.title.trim());
    if (form.subject) formData.append('subject', form.subject.trim());
    if (form.chapter) formData.append('chapter', form.chapter.trim());
    if (form.description) formData.append('description', form.description.trim());

    try {
      const doc = await documentsAPI.upload(formData);
      setResult(doc);
      setStatus('success');
    } catch (err) {
      setError(err.message || 'Upload failed.');
      setStatus('error');
    }
  };

  if (status === 'success' && result) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="card p-10 max-w-lg w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload Successful!</h2>
          <p className="text-slate-500 mb-2">
            <strong className="text-slate-700">{result.title}</strong> has been uploaded.
          </p>
          <div className="badge-amber mx-auto mb-6 inline-flex">⏳ AI is processing the document...</div>
          <p className="text-sm text-slate-400 mb-8">
            Text extraction, chunking, and vector indexing are running in the background.
            This typically takes 30–120 seconds depending on document size.
          </p>
          <div className="flex gap-4">
            <Link href="/dashboard/teacher" className="btn-primary flex-1 justify-center">View Dashboard</Link>
            <button onClick={() => { setFile(null); setForm({ title: '', subject: '', chapter: '', description: '' }); setStatus('idle'); setResult(null); }}
              className="btn-secondary flex-1 justify-center">Upload Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard/teacher" className="text-slate-400 hover:text-slate-600">←</Link>
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">E</div>
        <span className="font-semibold text-slate-900">Upload Learning Material</span>
      </div>

      <div className="max-w-2xl mx-auto p-8">
        <div className="card p-8">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Upload Educational PDF</h1>
          <p className="text-slate-500 text-sm mb-6">
            Upload a chapter or textbook PDF. EduBridge AI will extract text, create chunks, 
            generate embeddings, and make it queryable by students.
          </p>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              ❌ {error}
            </div>
          )}

          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`mb-6 border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
              dragOver ? 'border-cyan-400 bg-cyan-50' :
              file ? 'border-emerald-300 bg-emerald-50' :
              'border-slate-200 hover:border-cyan-300 hover:bg-slate-50'
            }`}
          >
            <input ref={fileRef} type="file" accept=".pdf" className="hidden"
              onChange={e => handleFile(e.target.files?.[0])} />
            {file ? (
              <div>
                <div className="text-4xl mb-2">📄</div>
                <div className="font-medium text-emerald-700">{file.name}</div>
                <div className="text-sm text-emerald-600 mt-1">
                  {(file.size / 1024 / 1024).toFixed(2)} MB · Click to change
                </div>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3">📤</div>
                <div className="font-medium text-slate-700 mb-1">Drop your PDF here</div>
                <div className="text-sm text-slate-400">or click to browse · Max {MAX_SIZE_MB}MB</div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Document Title <span className="text-red-500">*</span></label>
              <input className="input" placeholder="e.g., Chapter 6 — Photosynthesis"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Subject</label>
                <input className="input" placeholder="e.g., Science, Maths"
                  value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
              </div>
              <div>
                <label className="label">Chapter / Topic</label>
                <input className="input" placeholder="e.g., Chapter 6"
                  value={form.chapter} onChange={e => setForm(f => ({ ...f, chapter: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="label">Description (optional)</label>
              <textarea className="input resize-none" rows={3}
                placeholder="Brief description of the content..."
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <button type="submit" disabled={status === 'uploading' || !file}
              className="btn-primary w-full justify-center py-3 text-base disabled:opacity-50">
              {status === 'uploading' ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Uploading & processing...
                </span>
              ) : '📤 Upload & Process PDF'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-slate-50 rounded-xl text-xs text-slate-500">
            <strong>What happens after upload:</strong>
            <ol className="mt-2 space-y-1 list-decimal list-inside">
              <li>Text is extracted from every page using PyMuPDF</li>
              <li>Content is split into overlapping chunks</li>
              <li>Multilingual embeddings are generated for each chunk</li>
              <li>Chunks are indexed in the FAISS vector database</li>
              <li>Students can immediately ask questions about the content</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
