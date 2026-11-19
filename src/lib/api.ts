import type { Difficulty, Length } from './types'
import type { ScoreEntry, Stats } from './storage'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export type Health = { ok: true; auth: boolean }

export type ResultPayload = {
  id: string
  result: 'win' | 'loss'
  score: number
  steps: number
  optimal: number
  seconds: number
  difficulty: Difficulty
  length: Length
}

/** Public address of the API. It is not a database password. */
export function apiBase(): string {
  const raw = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/$/, '')
  if (!raw) return ''
  const remote = /^https:\/\/[a-z0-9.-]+$/i.test(raw)
  const local = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(raw)
  return remote || local ? raw : ''
}

export function apiExpected(): boolean {
  return import.meta.env.DEV || apiBase().length > 0
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(8000),
  })
  const data = (await response.json().catch(() => ({}))) as { error?: string }
  if (!response.ok) throw new ApiError(data.error || 'Le serveur a refusé la demande.', response.status)
  return data as T
}

export const api = {
  health: () => request<Health>('/api/health'),
  me: async () => {
    const data = await request<{ pseudo: string | null }>('/api/me')
    return data.pseudo
  },
  leaderboard: async () => {
    const data = await request<{ scores: ScoreEntry[] }>('/api/leaderboard')
    return data.scores
  },
  stats: () => request<Stats>('/api/stats'),
  register: (pseudo: string, password: string) =>
    request<{ pseudo: string }>('/api/register', { method: 'POST', body: JSON.stringify({ pseudo, password }) }),
  login: (pseudo: string, password: string) =>
    request<{ pseudo: string }>('/api/login', { method: 'POST', body: JSON.stringify({ pseudo, password }) }),
  logout: () => request<{ ok: true }>('/api/logout', { method: 'POST', body: '{}' }),
  record: (payload: ResultPayload) =>
    request<{ stats: Stats; leaderboard: ScoreEntry[] }>('/api/results', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}
