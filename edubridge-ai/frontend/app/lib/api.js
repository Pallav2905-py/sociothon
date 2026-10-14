/**
 * EduBridge AI — API Client
 * All backend communication goes through this module.
 * API keys are never stored in frontend code.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Token Storage ─────────────────────────────────────────────────────────────
export const getToken = () => {
  if (typeof window !== 'undefined') return localStorage.getItem('edubridge_token');
  return null;
};

export const setToken = (token) => {
  if (typeof window !== 'undefined') localStorage.setItem('edubridge_token', token);
};

export const removeToken = () => {
  if (typeof window !== 'undefined') localStorage.removeItem('edubridge_token');
};

// ── Base Fetch ────────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorDetail = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      errorDetail = data.detail || data.message || errorDetail;
    } catch (_) {}
    throw new Error(errorDetail);
  }

  if (res.status === 204) return null;
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) =>
    apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data) =>
    apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  getMe: () => apiFetch('/api/auth/me'),

  updateLanguage: (language) =>
    apiFetch(`/api/auth/me/language?language=${language}`, { method: 'PATCH' }),
};

// ── Documents ─────────────────────────────────────────────────────────────────
export const documentsAPI = {
  list: () => apiFetch('/api/documents'),

  get: (id) => apiFetch(`/api/documents/${id}`),

  preview: (id) => apiFetch(`/api/documents/${id}/preview`),

  upload: (formData) => {
    const token = getToken();
    return fetch(`${API_BASE}/api/documents/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Upload failed: ${res.status}`);
      }
      return res.json();
    });
  },

  delete: (id) =>
    apiFetch(`/api/documents/${id}`, { method: 'DELETE' }),

  reprocess: (id) =>
    apiFetch(`/api/documents/${id}/reprocess`, { method: 'POST' }),
};

// ── Chat ──────────────────────────────────────────────────────────────────────
export const chatAPI = {
  ask: (data) =>
    apiFetch('/api/chat', { method: 'POST', body: JSON.stringify(data) }),

  getHistory: () => apiFetch('/api/chat/history'),

  getSession: (id) => apiFetch(`/api/chat/${id}`),

  deleteSession: (id) =>
    apiFetch(`/api/chat/${id}`, { method: 'DELETE' }),
};

// ── Learning ──────────────────────────────────────────────────────────────────
export const learningAPI = {
  generateSummary: (data) =>
    apiFetch('/api/summary/generate', { method: 'POST', body: JSON.stringify(data) }),

  generateQuiz: (data) =>
    apiFetch('/api/quiz/generate', { method: 'POST', body: JSON.stringify(data) }),

  submitQuiz: (data) =>
    apiFetch('/api/quiz/submit', { method: 'POST', body: JSON.stringify(data) }),

  getProgress: () => apiFetch('/api/learning/progress'),
};

// ── System ────────────────────────────────────────────────────────────────────
export const systemAPI = {
  health: () => apiFetch('/api/health'),
};
