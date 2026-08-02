const API_BASE = 'http://localhost:8000/api/v1';

export async function uploadJobDescription(title, company, text, file) {
  const formData = new FormData();
  if (title) formData.append('title', title);
  if (company) formData.append('company', company);
  if (text) formData.append('raw_text', text);
  if (file) formData.append('file', file);

  const res = await fetch(`${API_BASE}/jobs/`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to create Job Description');
  return res.json();
}

export async function uploadResumes(files, redactPii = false) {
  const formData = new FormData();
  formData.append('redact_pii', redactPii);
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }

  const res = await fetch(`${API_BASE}/resumes/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload candidate resumes');
  return res.json();
}

export async function runAnalysis(mode, jobId, candidateIds, redactPii = false, targetRole = null, targetJdText = null) {
  const res = await fetch(`${API_BASE}/analyze/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode,
      job_id: jobId,
      candidate_ids: candidateIds,
      redact_pii: redactPii,
      target_role: targetRole,
      target_jd_text: targetJdText,
    }),
  });
  if (!res.ok) throw new Error('Failed to run analysis');
  return res.json();
}

export async function searchCandidates(query) {
  const res = await fetch(`${API_BASE}/search/?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Failed to execute search');
  return res.json();
}

export async function getAnalysisHistory() {
  const res = await fetch(`${API_BASE}/history/`);
  if (!res.ok) throw new Error('Failed to fetch analysis history');
  return res.json();
}
