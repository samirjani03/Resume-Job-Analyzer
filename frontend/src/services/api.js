export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api/v1';
const DEVICE_KEY = 'talentmatch_device_id';

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `anon-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

const DEVICE_HEADERS = { 'X-Device-ID': getDeviceId() };

function emitEvent(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const isForm = (options.body || null) instanceof FormData;
  if (!isForm) headers['Content-Type'] = 'application/json';
  Object.assign(headers, DEVICE_HEADERS);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let detail = null;
    try {
      const errBody = await res.json();
      detail = errBody.detail;
    } catch {
      detail = null;
    }
    const code = typeof detail === 'object' && detail ? detail.code : null;

    if (res.status === 401 && (code === 'provider_required' || !code)) {
      emitEvent('app:provider-required', { message: detail?.message });
    }
    if (res.status === 429 || code === 'quota_exceeded') {
      emitEvent('app:quota-exceeded', { message: detail?.message });
    }

    const msg = typeof detail === 'string' ? detail : (detail?.message || `Request failed (${res.status})`);
    throw new Error(msg);
  }

  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function uploadJobDescription(title, company, text, file) {
  const formData = new FormData();
  if (title) formData.append('title', title);
  if (company) formData.append('company', company);
  if (text) formData.append('raw_text', text);
  if (file) formData.append('file', file);
  return request('/jobs/', { method: 'POST', body: formData });
}

export async function uploadResumes(files, redactPii = false) {
  const formData = new FormData();
  formData.append('redact_pii', redactPii);
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }
  return request('/resumes/upload', { method: 'POST', body: formData });
}

export async function runAnalysis(mode, jobId, candidateIds, redactPii = false, targetRole = null, targetJdText = null) {
  return request('/analyze/', {
    method: 'POST',
    body: JSON.stringify({
      mode,
      job_id: jobId,
      candidate_ids: candidateIds,
      redact_pii: redactPii,
      target_role: targetRole,
      target_jd_text: targetJdText,
    }),
  });
}

export async function searchCandidates(query) {
  return request(`/search/?q=${encodeURIComponent(query)}`);
}

export async function getAnalysisHistory() {
  return request('/history/');
}

// ---------- AI Provider Settings ----------

export function getProviderStatus() {
  return request('/settings/status');
}

export function getProviderCatalog() {
  return request('/settings/catalog');
}

export function saveProviderKey(payload) {
  return request('/settings/keys', { method: 'POST', body: JSON.stringify(payload) });
}

export function deleteProviderKey(provider) {
  return request(`/settings/keys/${provider}`, { method: 'DELETE' });
}

export function testProviderKey(payload) {
  return request('/settings/keys/test', { method: 'POST', body: JSON.stringify(payload) });
}

export function getQuota() {
  return request('/settings/quota');
}

// ---------- AI Interview ----------

export function startInterview(payload) {
  return request('/interviews/start', { method: 'POST', body: JSON.stringify(payload) });
}

export function answerInterview(sessionId, answer) {
  return request(`/interviews/${sessionId}/answer`, {
    method: 'POST',
    body: JSON.stringify({ answer }),
  });
}

export function getInterview(sessionId) {
  return request(`/interviews/${sessionId}`);
}

export function sendInterviewReports(sessionId, payload) {
  return request(`/interviews/${sessionId}/send-reports`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function endInterview(sessionId, action) {
  return request(`/interviews/${sessionId}/end`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}