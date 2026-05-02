/**
 * API client for the FastAPI backend.
 * In dev, Vite proxies /api → http://127.0.0.1:8000/api.
 */

const BASE = '/api';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new ApiError(`${res.status}: ${detail}`, res.status);
  }
  return res.json();
}

export const api = {
  health: () => request('/health'),
  getFindings: () => request('/findings'),
  getSummary: (season) => request(`/summary/${season}`),
  getDefaultStory: (season) => request(`/story/${season}`),
  runPipeline: (season, question, opts = {}) =>
    request('/run', {
      method: 'POST',
      body: JSON.stringify({
        season,
        question: question || null,
        force_story: opts.forceStory ?? null,
      }),
    }),
  getChampionshipProgression: (season, topN = 6) =>
    request(`/championship-progression/${season}?top_n=${topN}`),
  getRacePace: (season, round) => request(`/race-pace/${season}/${round}`),
  getLapPositions: (season, round) => request(`/lap-positions/${season}/${round}`),
  getCircuit: (season, round, drivers) => {
    const q = drivers && drivers.length ? `?drivers=${encodeURIComponent(drivers.join(','))}` : '';
    return request(`/circuit/${season}/${round}${q}`);
  },
  getDossier: (season) => request(`/season/${season}/dossier`),
  getSeasonRaces: (season) => request(`/season/${season}/races`),
  getSeasonDrivers: (season) => request(`/season/${season}/drivers`),
  getLapTelemetry: (season, round, driver, lap) => 
    request(`/telemetry/${season}/${round}?driver=${encodeURIComponent(driver)}&lap=${lap}`),
  getAgentStatus: () => request('/agent-status'),
  rerunAgent: () => request('/agent-rerun', { method: 'POST' }),
};
