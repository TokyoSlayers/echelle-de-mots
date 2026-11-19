import type { Difficulty, Length } from './types'

export type Stats = {
  played: number
  wins: number
  streak: number
  bestStreak: number
}

export type ScoreEntry = {
  id: string
  pseudo: string
  score: number
  steps: number
  optimal: number
  seconds: number
  difficulty: Difficulty
  length: Length
  date: string
}

const STATS_KEY = 'echelle-mots:v1:stats'
const SCORES_KEY = 'echelle-mots:v1:scores'
const PSEUDO_KEY = 'echelle-mots:v1:pseudo'
const MUTE_KEY = 'echelle-mots:v1:mute'

export const EMPTY_STATS: Stats = { played: 0, wins: 0, streak: 0, bestStreak: 0 }

export function nextWin(stats: Stats): Stats {
  const streak = stats.streak + 1
  return {
    played: stats.played + 1,
    wins: stats.wins + 1,
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
  }
}

export function nextLoss(stats: Stats): Stats {
  return { ...stats, played: stats.played + 1, streak: 0 }
}

export function cleanPseudo(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 16)
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode or a full quota: the game still plays */
  }
}

export function loadStats(): Stats {
  const parsed = readJson<Partial<Stats>>(STATS_KEY)
  if (!parsed) return { ...EMPTY_STATS }
  return {
    played: numberOr(parsed.played, 0),
    wins: numberOr(parsed.wins, 0),
    streak: numberOr(parsed.streak, 0),
    bestStreak: numberOr(parsed.bestStreak, 0),
  }
}

export function saveStats(stats: Stats): void {
  writeJson(STATS_KEY, stats)
}

const DIFFICULTIES = new Set<Difficulty>(['facile', 'moyen', 'difficile'])

function isScoreEntry(value: unknown): value is ScoreEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as ScoreEntry
  return (
    typeof entry.id === 'string' &&
    typeof entry.pseudo === 'string' &&
    typeof entry.score === 'number' &&
    typeof entry.steps === 'number' &&
    typeof entry.optimal === 'number' &&
    typeof entry.seconds === 'number' &&
    typeof entry.date === 'string' &&
    (entry.length === 3 || entry.length === 4 || entry.length === 5) &&
    DIFFICULTIES.has(entry.difficulty)
  )
}

export function loadScores(): ScoreEntry[] {
  const parsed = readJson<unknown>(SCORES_KEY)
  if (!Array.isArray(parsed)) return []
  return parsed.filter(isScoreEntry).slice(0, 100)
}

export function saveScores(scores: ScoreEntry[]): void {
  writeJson(SCORES_KEY, scores.slice(0, 100))
}

export function rankScores(scores: ScoreEntry[]): ScoreEntry[] {
  return [...scores].sort((a, b) => b.score - a.score || b.date.localeCompare(a.date))
}

export function loadPseudo(): string {
  try {
    return cleanPseudo(localStorage.getItem(PSEUDO_KEY) ?? '')
  } catch {
    return ''
  }
}

export function savePseudo(pseudo: string): void {
  try {
    localStorage.setItem(PSEUDO_KEY, cleanPseudo(pseudo))
  } catch {
    /* ignore */
  }
}

export function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
