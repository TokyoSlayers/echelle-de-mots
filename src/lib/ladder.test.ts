import { describe, expect, it } from 'vitest'
import { freshGame, gameReducer } from './game-state'
import {
  CHALLENGE_BANDS,
  GRAPHS,
  createChallenge,
  dictionary,
  distance,
  letterDiff,
  validateMove,
} from './ladder'
import { normalize } from './normalize'
import { computeScore } from './score'
import { nextLoss, nextWin } from './storage'
import type { Difficulty, Length } from './types'

describe('normalize', () => {
  it('ignore les accents, la casse et les ligatures', () => {
    expect(normalize('  Tête ')).toBe('tete')
    expect(normalize('Été')).toBe('ete')
    expect(normalize('Cœur')).toBe('coeur')
    expect(normalize('ÇA')).toBe('ca')
  })
})

describe('défis solvables', () => {
  const levels: Difficulty[] = ['facile', 'moyen', 'difficile']

  it('propose toujours un chemin optimal réel', () => {
    for (const difficulty of levels) {
      const band = CHALLENGE_BANDS[difficulty]
      for (let i = 0; i < 30; i++) {
        const challenge = createChallenge(difficulty)
        expect(challenge.solution[0]).toBe(challenge.start)
        expect(challenge.solution[challenge.solution.length - 1]).toBe(challenge.target)
        expect(challenge.optimal).toBe(challenge.solution.length - 1)
        expect(challenge.optimal).toBeGreaterThanOrEqual(band.min)
        expect(challenge.optimal).toBeLessThanOrEqual(band.max)
        expect(distance(challenge.start, challenge.target, challenge.length)).toBe(challenge.optimal)
        const dict = dictionary(challenge.length)
        for (let step = 1; step < challenge.solution.length; step++) {
          const previous = challenge.solution[step - 1] ?? ''
          const word = challenge.solution[step] ?? ''
          expect(letterDiff(previous, word)).toBe(1)
          expect(dict.has(word)).toBe(true)
          const move = validateMove(previous, word, challenge.solution.slice(0, step), dict)
          expect(move).toEqual({ ok: true, word })
        }
      }
    }
  })

  it('connaît des mots français très courants', () => {
    expect(dictionary(3).has('est')).toBe(true)
    expect(dictionary(3).has('une')).toBe(true)
    expect(dictionary(4).has('avec')).toBe(true)
    expect(dictionary(4).has('chat')).toBe(true)
    expect(GRAPHS[3].playable.length).toBeGreaterThan(100)
    expect(GRAPHS[4].playable.length).toBeGreaterThan(300)
    expect(GRAPHS[5].playable.length).toBeGreaterThan(200)
  })
})

describe('validation des coups', () => {
  it('accepte une graphie accentuée équivalente', () => {
    const dict = dictionary(4)
    expect(dict.has('tete')).toBe(true)
    const previous = [...dict].find((word) => letterDiff(word, 'tete') === 1)
    expect(previous).toBeTruthy()
    const move = validateMove(previous ?? '', 'Tête', [previous ?? ''], dict)
    expect(move).toEqual({ ok: true, word: 'tete' })
  })

  it('refuse un mot inconnu, un écart de longueur et deux lettres', () => {
    const dict = dictionary(4)
    expect(validateMove('chat', 'zzzz', ['chat'], dict).ok).toBe(false)
    expect(validateMove('chat', 'chats', ['chat'], dict).ok).toBe(false)
    const pair = findPair(4, 2)
    expect(pair).not.toBeNull()
    if (!pair) return
    const refused = validateMove(pair[0], pair[1], [pair[0]], dict)
    expect(refused.ok).toBe(false)
    if (!refused.ok) expect(refused.message).toMatch(/une lettre/i)
  })
})

describe('score et série', () => {
  it('récompense un parcours optimal et rapide, et ne descend pas sous zéro', () => {
    const good = computeScore({ difficulty: 'facile', steps: 4, optimal: 4, seconds: 12, hints: 0 })
    expect(good.total).toBeGreaterThan(good.base)
    expect(good.precision).toBe(180)
    const wrecked = computeScore({
      difficulty: 'facile',
      steps: 30,
      optimal: 4,
      seconds: 400,
      hints: 8,
    })
    expect(wrecked.total).toBe(0)
    const hinted = computeScore({ difficulty: 'moyen', steps: 5, optimal: 5, seconds: 20, hints: 1 })
    expect(hinted.hintPenalty).toBe(100)
    expect(hinted.total).toBe(goodish(hinted))
  })

  it('compte les victoires et casse la série', () => {
    const won = nextWin({ played: 1, wins: 1, streak: 2, bestStreak: 2 })
    expect(won).toEqual({ played: 2, wins: 2, streak: 3, bestStreak: 3 })
    expect(nextLoss(won).streak).toBe(0)
    expect(nextLoss(won).bestStreak).toBe(3)
  })
})

describe('indice', () => {
  it('ne facture qu’une fois le même échelon, et l’annulation ne rembourse pas', () => {
    const challenge = createChallenge('facile')
    let state = freshGame(challenge, 1_000)
    const step = challenge.solution[1] ?? ''
    state = gameReducer(state, { type: 'hint', word: step })
    expect(state.paidFrom).toEqual([challenge.start])
    expect(state.input).toBe(step)
    state = gameReducer(state, { type: 'input', value: 'x' })
    state = gameReducer(state, { type: 'hint', word: step })
    expect(state.paidFrom).toHaveLength(1)
    expect(state.input).toBe(step)
    state = gameReducer(state, {
      type: 'submit',
      word: step,
      win: false,
      now: 2_000,
    })
    expect(state.chain).toEqual([challenge.start, step])
    state = gameReducer(state, { type: 'undo' })
    expect(state.chain).toEqual([challenge.start])
    expect(state.paidFrom).toHaveLength(1)
  })
})

function findPair(length: Length, diff: number): [string, string] | null {
  const words = GRAPHS[length].words
  for (let i = 0; i < words.length; i++) {
    const left = words[i]
    if (!left) continue
    for (let j = i + 1; j < Math.min(words.length, i + 40); j++) {
      const right = words[j]
      if (right && letterDiff(left, right) === diff) return [left, right]
    }
  }
  return null
}

function goodish(score: { base: number; timeBonus: number; precision: number; hintPenalty: number; total: number }) {
  return Math.max(0, score.base + score.timeBonus + score.precision - score.hintPenalty)
}
