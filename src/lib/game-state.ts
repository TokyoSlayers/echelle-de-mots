import type { Challenge } from './ladder'

export type Phase = 'playing' | 'won' | 'abandoned'

export type GameState = {
  challenge: Challenge
  chain: string[]
  phase: Phase
  startedAt: number
  endedAt: number | null
  input: string
  error: string | null
  hint: string | null
  paidFrom: string[]
  shake: number
  saved: boolean
}

export function freshGame(challenge: Challenge, now: number): GameState {
  return {
    challenge,
    chain: [challenge.start],
    phase: 'playing',
    startedAt: now,
    endedAt: null,
    input: '',
    error: null,
    hint: null,
    paidFrom: [],
    shake: 0,
    saved: false,
  }
}

export type GameAction =
  | { type: 'replace'; challenge: Challenge; now: number }
  | { type: 'input'; value: string }
  | { type: 'invalid'; message: string }
  | { type: 'submit'; word: string; win: boolean; now: number }
  | { type: 'undo' }
  | { type: 'hint'; word: string }
  | { type: 'abandon'; now: number }
  | { type: 'saved' }

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'replace':
      return freshGame(action.challenge, action.now)
    case 'input':
      if (state.phase !== 'playing') return state
      return { ...state, input: action.value, error: null }
    case 'invalid':
      return { ...state, error: action.message, shake: state.shake + 1 }
    case 'submit': {
      if (state.phase !== 'playing') return state
      const chain = [...state.chain, action.word]
      if (action.win) {
        return {
          ...state,
          chain,
          phase: 'won',
          endedAt: action.now,
          input: '',
          error: null,
          hint: null,
        }
      }
      return { ...state, chain, input: '', error: null, hint: null }
    }
    case 'undo': {
      if (state.phase !== 'playing' || state.chain.length < 2) return state
      return {
        ...state,
        chain: state.chain.slice(0, -1),
        input: '',
        error: null,
        hint: null,
      }
    }
    case 'hint': {
      if (state.phase !== 'playing') return state
      const current = state.chain[state.chain.length - 1] ?? state.challenge.start
      if (state.hint === action.word && state.input === action.word) return state
      const already = state.paidFrom.includes(current)
      return {
        ...state,
        hint: action.word,
        input: action.word,
        error: null,
        paidFrom: already ? state.paidFrom : [...state.paidFrom, current],
      }
    }
    case 'abandon':
      if (state.phase !== 'playing') return state
      return {
        ...state,
        phase: 'abandoned',
        endedAt: action.now,
        input: '',
        error: null,
        hint: null,
      }
    case 'saved':
      return { ...state, saved: true }
    default:
      return state
  }
}
