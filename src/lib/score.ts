import type { Difficulty } from './types'

export const SCORE_RULES: Record<Difficulty, { base: number; hint: number }> = {
  facile: { base: 500, hint: 70 },
  moyen: { base: 900, hint: 100 },
  difficile: { base: 1400, hint: 140 },
}

export type ScoreBreakdown = {
  base: number
  timeBonus: number
  precision: number
  hintPenalty: number
  total: number
}

export function computeScore(input: {
  difficulty: Difficulty
  steps: number
  optimal: number
  seconds: number
  hints: number
}): ScoreBreakdown {
  const rules = SCORE_RULES[input.difficulty]
  const base = rules.base
  const budget = input.optimal * 20
  const timeBonus = Math.max(0, Math.round((budget - input.seconds) * 5))
  const extra = Math.max(0, input.steps - input.optimal)
  const precision = extra === 0 ? 180 : -extra * 35
  const hintPenalty = input.hints * rules.hint
  const total = Math.max(0, base + timeBonus + precision - hintPenalty)
  return { base, timeBonus, precision, hintPenalty, total }
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function formatPoints(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value)
}

export function formatSigned(value: number): string {
  if (value > 0) return `+${formatPoints(value)}`
  return formatPoints(value)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
