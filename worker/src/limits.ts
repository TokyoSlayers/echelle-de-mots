import type { Difficulty, Length } from '../../src/lib/types'

const BASE: Record<Difficulty, number> = { facile: 500, moyen: 900, difficile: 1400 }

export type ResultInput = {
  id: string
  result: 'win' | 'loss'
  score: number
  steps: number
  optimal: number
  seconds: number
  difficulty: Difficulty
  length: Length
}

export function maxHonestScore(difficulty: Difficulty, optimal: number): number {
  return BASE[difficulty] + optimal * 100 + 180
}

export function validateResult(input: ResultInput): string | null {
  if (!/^[0-9a-f-]{36}$/i.test(input.id)) return 'Identifiant invalide.'
  if (input.result !== 'win' && input.result !== 'loss') return 'Résultat invalide.'
  if (input.difficulty !== 'facile' && input.difficulty !== 'moyen' && input.difficulty !== 'difficile') {
    return 'Difficulté invalide.'
  }
  if (input.length !== 3 && input.length !== 4 && input.length !== 5) return 'Longueur invalide.'
  if (!Number.isInteger(input.optimal) || input.optimal < 2 || input.optimal > 15) return 'Parcours invalide.'
  if (!Number.isInteger(input.steps) || input.steps < 0 || input.steps > 40) return 'Nombre de pas invalide.'
  if (!Number.isInteger(input.seconds) || input.seconds < 0 || input.seconds > 7200) return 'Temps invalide.'
  if (!Number.isInteger(input.score) || input.score < 0) return 'Score invalide.'
  if (input.result === 'win') {
    if (input.steps < input.optimal) return 'Une victoire ne peut pas être plus courte que le minimum.'
    if (input.score > maxHonestScore(input.difficulty, input.optimal)) return 'Ce score dépasse le maximum possible.'
  } else if (input.score !== 0) {
    return 'Une défaite n’a pas de score.'
  }
  return null
}

export function validateCredentials(pseudo: string, password: string): string | null {
  const clean = pseudo.replace(/\s+/g, ' ').trim()
  if (clean.length < 3 || clean.length > 16) return 'Le pseudo doit faire entre 3 et 16 caractères.'
  if (!/^[\p{L}\p{N} ._-]+$/u.test(clean)) return 'Le pseudo contient un caractère interdit.'
  if (password.length < 8 || password.length > 72) return 'Le mot de passe doit faire entre 8 et 72 caractères.'
  return null
}

export function cleanPseudo(pseudo: string): string {
  return pseudo.replace(/\s+/g, ' ').trim()
}
