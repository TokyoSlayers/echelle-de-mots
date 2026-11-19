import { WORDS_BY_LENGTH } from '../data/words'
import { normalize } from './normalize'
import type { Difficulty, Length } from './types'

export const CHALLENGE_BANDS: Record<
  Difficulty,
  { min: number; max: number; lengths: Length[]; weights: number[] }
> = {
  facile: { min: 3, max: 4, lengths: [3, 4], weights: [3, 2] },
  moyen: { min: 5, max: 6, lengths: [3, 4, 5], weights: [2, 5, 2] },
  difficile: { min: 8, max: 10, lengths: [4, 5], weights: [3, 2] },
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'

export type Graph = {
  length: Length
  words: readonly string[]
  set: Set<string>
  adj: Map<string, string[]>
  rank: Map<string, number>
  playable: string[]
}

function uniqueWords(words: readonly string[]): string[] {
  const seen = new Set<string>()
  const unique: string[] = []
  for (const word of words) {
    if (seen.has(word)) continue
    seen.add(word)
    unique.push(word)
  }
  return unique
}

function neighborsOf(word: string, set: Set<string>): string[] {
  const chars = word.split('')
  const found: string[] = []
  for (let i = 0; i < chars.length; i++) {
    const original = chars[i] ?? ''
    for (const letter of ALPHABET) {
      if (letter === original) continue
      chars[i] = letter
      const next = chars.join('')
      if (set.has(next)) found.push(next)
    }
    chars[i] = original
  }
  return found
}

function largestComponent(words: readonly string[], adj: Map<string, string[]>): Set<string> {
  const seen = new Set<string>()
  let best: string[] = []
  for (const word of words) {
    if (seen.has(word)) continue
    const stack = [word]
    seen.add(word)
    const component: string[] = []
    while (stack.length > 0) {
      const current = stack.pop() ?? word
      component.push(current)
      for (const next of adj.get(current) ?? []) {
        if (!seen.has(next)) {
          seen.add(next)
          stack.push(next)
        }
      }
    }
    if (component.length > best.length) best = component
  }
  return new Set(best)
}

function buildGraph(length: Length, source: readonly string[]): Graph {
  const words = uniqueWords(source)
  const set = new Set(words)
  const adj = new Map<string, string[]>()
  for (const word of words) adj.set(word, neighborsOf(word, set))
  const giant = largestComponent(words, adj)
  const rank = new Map<string, number>()
  words.forEach((word, index) => rank.set(word, index))
  const playable = words.filter((word) => giant.has(word) && (adj.get(word)?.length ?? 0) >= 2)
  return { length, words, set, adj, rank, playable }
}

export const GRAPHS: Record<Length, Graph> = {
  3: buildGraph(3, WORDS_BY_LENGTH[3]),
  4: buildGraph(4, WORDS_BY_LENGTH[4]),
  5: buildGraph(5, WORDS_BY_LENGTH[5]),
}

export function dictionary(length: Length): Set<string> {
  return GRAPHS[length].set
}

/** Number of positions that differ. Length mismatch counts as extra differences. */
export function letterDiff(a: string, b: string): number {
  const shared = Math.min(a.length, b.length)
  let diff = Math.abs(a.length - b.length)
  for (let i = 0; i < shared; i++) if (a[i] !== b[i]) diff += 1
  return diff
}

type Search = { dist: Map<string, number>; prev: Map<string, string> }

function bfs(graph: Graph, start: string): Search {
  const dist = new Map<string, number>([[start, 0]])
  const prev = new Map<string, string>()
  const queue = [start]
  let index = 0
  while (index < queue.length) {
    const current = queue[index] ?? start
    index += 1
    const base = dist.get(current) ?? 0
    for (const next of graph.adj.get(current) ?? []) {
      if (dist.has(next)) continue
      dist.set(next, base + 1)
      prev.set(next, current)
      queue.push(next)
    }
  }
  return { dist, prev }
}

function reconstruct(prev: Map<string, string>, start: string, target: string): string[] | null {
  const path = [target]
  const guard = new Set<string>([target])
  let current = target
  while (current !== start) {
    const before = prev.get(current)
    if (!before || guard.has(before)) return null
    guard.add(before)
    path.push(before)
    current = before
  }
  path.reverse()
  return path
}

function isValidPath(path: string[], graph: Graph): boolean {
  if (path.length < 2) return false
  for (let i = 0; i < path.length; i++) {
    const word = path[i]
    if (!word || !graph.set.has(word)) return false
    const previous = path[i - 1]
    if (previous && letterDiff(previous, word) !== 1) return false
  }
  return true
}

function pickWeighted(items: Length[], weights: number[]): Length {
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  let roll = Math.random() * total
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i] ?? 0
    if (roll <= 0) return items[i] ?? items[0] ?? 4
  }
  return items[items.length - 1] ?? 4
}

export type Challenge = {
  id: string
  difficulty: Difficulty
  length: Length
  start: string
  target: string
  solution: string[]
  optimal: number
}

function attempt(difficulty: Difficulty, widen: boolean): Challenge | null {
  const band = CHALLENGE_BANDS[difficulty]
  const min = widen ? Math.max(2, band.min - 1) : band.min
  const max = widen ? band.max + 3 : band.max
  const lengths = widen ? ([3, 4, 5] as Length[]) : band.lengths
  const weights = widen ? lengths.map(() => 1) : band.weights
  const length = pickWeighted(lengths, weights)
  const graph = GRAPHS[length]
  const pool = graph.playable
  if (pool.length < 2) return null
  const startPool = pool.slice(0, Math.max(8, Math.ceil(pool.length * 0.75)))
  const start = startPool[Math.floor(Math.random() * startPool.length)] ?? pool[0]
  if (!start) return null
  const { dist, prev } = bfs(graph, start)
  const candidates: string[] = []
  for (const word of pool) {
    const steps = dist.get(word)
    if (steps !== undefined && steps >= min && steps <= max) candidates.push(word)
  }
  if (candidates.length === 0) return null
  candidates.sort((a, b) => (graph.rank.get(a) ?? 0) - (graph.rank.get(b) ?? 0))
  const shortlist = candidates.slice(0, Math.min(24, candidates.length))
  const target = shortlist[Math.floor(Math.random() * shortlist.length)]
  if (!target) return null
  const solution = reconstruct(prev, start, target)
  if (!solution || !isValidPath(solution, graph)) return null
  const optimal = solution.length - 1
  if (optimal !== dist.get(target)) return null
  return {
    id: crypto.randomUUID(),
    difficulty,
    length,
    start,
    target,
    solution,
    optimal,
  }
}

/** A start/target pair whose shortest path is known, so the puzzle is always solvable. */
export function createChallenge(difficulty: Difficulty): Challenge {
  let fallback: Challenge | null = null
  for (let i = 0; i < 80; i++) {
    const challenge = attempt(difficulty, i >= 35)
    if (!challenge) continue
    const band = CHALLENGE_BANDS[difficulty]
    if (challenge.optimal >= band.min && challenge.optimal <= band.max) return challenge
    fallback ??= challenge
  }
  if (fallback) return fallback
  throw new Error(`Impossible de créer un défi ${difficulty}`)
}

export function shortestPath(from: string, to: string, length: Length): string[] | null {
  if (from === to) return [from]
  const graph = GRAPHS[length]
  if (!graph.set.has(from) || !graph.set.has(to)) return null
  const { dist, prev } = bfs(graph, from)
  if (!dist.has(to)) return null
  return reconstruct(prev, from, to)
}

export function distance(from: string, to: string, length: Length): number {
  if (from === to) return 0
  const path = shortestPath(from, to, length)
  return path ? path.length - 1 : Number.POSITIVE_INFINITY
}

export function nextStep(from: string, to: string, length: Length): string | null {
  const path = shortestPath(from, to, length)
  if (!path || path.length < 2) return null
  return path[1] ?? null
}

export type MoveResult = { ok: true; word: string } | { ok: false; message: string }

export function validateMove(
  previous: string,
  raw: string,
  chain: readonly string[],
  dict: Set<string>,
): MoveResult {
  const word = normalize(raw)
  if (!word) return { ok: false, message: 'Écris un mot.' }
  if (!/^[a-z]+$/.test(word)) return { ok: false, message: 'Utilise seulement des lettres.' }
  if (word.length !== previous.length) {
    return {
      ok: false,
      message: `Il faut un mot de ${previous.length} lettres. Les accents ne comptent pas.`,
    }
  }
  if (!dict.has(word)) {
    return { ok: false, message: `« ${word} » n’est pas dans le dictionnaire des mots courants.` }
  }
  if (chain.includes(word)) {
    return {
      ok: false,
      message:
        word === previous
          ? 'C’est déjà le mot actuel. Les accents ne comptent pas.'
          : 'Ce mot est déjà sur l’échelle.',
    }
  }
  const diff = letterDiff(previous, word)
  if (diff !== 1) {
    return {
      ok: false,
      message:
        diff === 0
          ? 'Change exactement une lettre.'
          : `Change exactement une lettre — là, ${diff} lettres diffèrent.`,
    }
  }
  return { ok: true, word }
}

export function changedIndex(previous: string, word: string): number {
  for (let i = 0; i < word.length; i++) if (previous[i] !== word[i]) return i
  return -1
}
