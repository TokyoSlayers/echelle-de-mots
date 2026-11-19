export type Difficulty = 'facile' | 'moyen' | 'difficile'

export type Length = 3 | 4 | 5

export const DIFFICULTY_ORDER: Difficulty[] = ['facile', 'moyen', 'difficile']

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  facile: 'Facile',
  moyen: 'Moyen',
  difficile: 'Difficile',
}

export const DIFFICULTY_HINT: Record<Difficulty, string> = {
  facile: '3 à 4 pas',
  moyen: '5 à 6 pas',
  difficile: '8 à 10 pas',
}
