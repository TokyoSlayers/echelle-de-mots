import { Flag } from 'lucide-react'
import { changedIndex } from '../lib/ladder'
import type { Phase } from '../lib/game-state'
import { Badge } from './ui/badge'
import { DIFFICULTY_LABEL, type Difficulty } from '../lib/types'

type Rung = { word: string; fresh?: boolean }

export function LadderView({
  rungs,
  target,
  optimal,
  remaining,
  difficulty,
  length,
  phase,
}: {
  rungs: Rung[]
  target: string
  optimal: number
  remaining: number
  difficulty: Difficulty
  length: number
  phase: Phase
}) {
  return (
    <div className="space-y-3">
      {phase === 'playing' && (
        <div className="summit pop-in" key={`${target}-${optimal}`}>
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.18em] text-white/75 uppercase">Sommet</p>
            <div className="mt-2">
              <Tiles word={target} tone="summit" />
            </div>
          </div>
          <div className="text-right">
            <Badge tone={difficulty}>{DIFFICULTY_LABEL[difficulty]}</Badge>
            <p className="mt-2 text-sm font-semibold text-white/90">{length} lettres</p>
            <p className="font-display text-2xl leading-none text-white">{optimal} pas</p>
            <p className="text-xs text-white/75">minimum</p>
          </div>
        </div>
      )}

      <div className="flex items-stretch gap-2 sm:gap-3">
        <div className="rail" aria-hidden="true" />
        <ol className="flex min-w-0 flex-1 flex-col gap-2" aria-label="Échelle en cours">
          {rungs.map((rung, index) => {
            const previous = index > 0 ? rungs[index - 1]?.word : undefined
            const label =
              index === 0
                ? 'Départ'
                : index === rungs.length - 1 && phase !== 'playing'
                  ? 'Sommet'
                  : index === rungs.length - 1
                    ? 'Actuel'
                    : `Pas ${index}`
            const shift = letterShift(previous, rung.word)
            return (
              <li key={`${rung.word}-${index}`} className={rung.fresh ? 'rung-enter' : undefined}>
                <div className="flex items-center justify-between gap-2 rounded-[1.15rem] bg-white/95 px-2 py-2 shadow-[0_8px_20px_rgba(70,32,16,0.06)] sm:px-3">
                  <div className="min-w-0">
                    <p className="mb-1 text-[10px] font-extrabold tracking-[0.14em] text-[#2a1845]/45 uppercase">
                      {label}
                    </p>
                    <Tiles word={rung.word} previous={previous} />
                  </div>
                  {shift && (
                    <span className="shrink-0 rounded-full bg-[#fff3cc] px-2 py-1 text-[11px] font-extrabold text-[#8a5a00] sm:text-xs">
                      {shift}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
        <div className="rail" aria-hidden="true" />
      </div>

      {phase === 'playing' && Number.isFinite(remaining) && (
        <p className="flex items-center justify-center gap-2 text-sm font-semibold text-[#2a1845]/70">
          <Flag className="size-4 text-[#7c3aed]" />
          {remaining === 0
            ? 'Le sommet est là.'
            : `Encore ${remaining} pas au mieux depuis ici.`}
        </p>
      )}
    </div>
  )
}

function Tiles({ word, previous, tone }: { word: string; previous?: string; tone?: 'summit' }) {
  return (
    <div className="flex gap-1 sm:gap-1.5" aria-label={word.toUpperCase()}>
      {word.split('').map((letter, index) => {
        const changed = previous !== undefined && previous[index] !== letter
        return (
          <span key={`${word}-${index}`} className={`tile ${tone === 'summit' ? 'tile-summit' : ''} ${changed ? 'tile-hot' : ''}`}>
            {letter}
          </span>
        )
      })}
    </div>
  )
}

function letterShift(previous: string | undefined, word: string): string | null {
  if (!previous) return null
  const index = changedIndex(previous, word)
  if (index < 0) return null
  const from = previous[index] ?? ''
  const to = word[index] ?? ''
  return `${from} → ${to}`.toUpperCase()
}
