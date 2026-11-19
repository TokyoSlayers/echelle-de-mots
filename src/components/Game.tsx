import { Flag, Lightbulb, Sparkles, Timer, Undo2 } from 'lucide-react'
import { useEffect, useReducer, useRef, useState, type FormEvent } from 'react'
import confetti from 'canvas-confetti'
import { gameReducer, freshGame } from '../lib/game-state'
import { createChallenge, dictionary, distance, nextStep, validateMove } from '../lib/ladder'
import { SCORE_RULES, computeScore, formatDuration, formatPoints, formatSigned } from '../lib/score'
import { playSound } from '../lib/sounds'
import { cleanPseudo, type ScoreEntry, type Stats } from '../lib/storage'
import { DIFFICULTY_HINT, DIFFICULTY_LABEL, DIFFICULTY_ORDER, type Difficulty } from '../lib/types'
import { AuthForm } from './AuthForm'
import { LadderView } from './LadderView'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Input } from './ui/input'

const COLORS = ['#ff5a36', '#ffb703', '#0f9b8e', '#3d7eff', '#7c3aed', '#ff4d8d']

export function Game({
  stats,
  pseudo,
  online,
  account,
  onWin,
  onLoss,
  onSaveScore,
  onShowScores,
  onAuthenticated,
}: {
  stats: Stats
  pseudo: string
  online: boolean
  account: string | null
  onWin: () => void
  onLoss: () => void
  onSaveScore: (entry: ScoreEntry) => Promise<string | null>
  onShowScores: () => void
  onAuthenticated: (pseudo: string) => void
}) {
  const [difficulty, setDifficulty] = useState<Difficulty>('facile')
  const [game, dispatch] = useReducer(gameReducer, undefined, () => freshGame(createChallenge('facile'), Date.now()))
  const [tick, setTick] = useState(() => Date.now())
  const [name, setName] = useState(account ?? pseudo)
  const [nameError, setNameError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const settled = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const victoryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (game.phase !== 'playing') return
    const id = window.setInterval(() => setTick(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [game.phase, game.challenge.id])

  useEffect(() => {
    if (game.phase !== 'won') return
    victoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const burst = (origin: { x: number; y: number }) => {
      void confetti({ particleCount: 90, spread: 75, startVelocity: 42, origin, colors: COLORS, scalar: 0.95 })
    }
    burst({ x: 0.5, y: 0.32 })
    const left = window.setTimeout(() => burst({ x: 0.18, y: 0.42 }), 180)
    const right = window.setTimeout(() => burst({ x: 0.84, y: 0.4 }), 320)
    return () => {
      window.clearTimeout(left)
      window.clearTimeout(right)
    }
  }, [game.phase, game.challenge.id])

  useEffect(() => {
    if (game.shake === 0) return
    inputRef.current?.focus()
  }, [game.shake])

  const challenge = game.challenge
  const current = game.chain[game.chain.length - 1] ?? challenge.start
  const steps = game.chain.length - 1
  const end = game.phase === 'playing' ? tick : (game.endedAt ?? tick)
  const elapsed = Math.max(0, end - game.startedAt)
  const hints = game.paidFrom.length
  const remaining = game.phase === 'won' ? 0 : distance(current, challenge.target, challenge.length)
  const projectedSteps = steps + (Number.isFinite(remaining) ? remaining : 0)
  const shownSteps = game.phase === 'playing' ? projectedSteps : steps
  const score = computeScore({
    difficulty: challenge.difficulty,
    steps: shownSteps,
    optimal: challenge.optimal,
    seconds: elapsed / 1000,
    hints,
  })
  const hintCost = SCORE_RULES[challenge.difficulty].hint
  const rungs = (game.phase === 'abandoned' ? challenge.solution : game.chain).map((word, index, list) => ({
    word,
    fresh: game.phase !== 'abandoned' && index === list.length - 1 && index > 0,
  }))

  function onNew() {
    let next
    try {
      next = createChallenge(difficulty)
    } catch {
      dispatch({ type: 'invalid', message: 'Impossible de préparer un défi. Réessaie.' })
      return
    }
    const progressed = game.phase === 'playing' && (game.chain.length > 1 || game.paidFrom.length > 0)
    if (progressed && !settled.current) {
      settled.current = true
      onLoss()
    }
    const now = Date.now()
    setTick(now)
    settled.current = false
    dispatch({ type: 'replace', challenge: next, now })
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (game.phase !== 'playing' || settled.current) return
    const result = validateMove(current, game.input, game.chain, dictionary(challenge.length))
    if (!result.ok) {
      dispatch({ type: 'invalid', message: result.message })
      playSound('bad')
      return
    }
    const win = result.word === challenge.target
    const now = Date.now()
    if (win) {
      settled.current = true
      onWin()
      playSound('win')
    } else {
      playSound('ok')
    }
    dispatch({ type: 'submit', word: result.word, win, now })
  }

  function onHint() {
    if (game.phase !== 'playing') return
    const word = nextStep(current, challenge.target, challenge.length)
    if (!word) {
      dispatch({ type: 'invalid', message: 'Aucun chemin depuis ce mot. Annule un pas.' })
      return
    }
    const already = game.paidFrom.includes(current)
    dispatch({ type: 'hint', word })
    if (!already) playSound('hint')
  }

  function onUndo() {
    if (game.phase !== 'playing' || game.chain.length < 2) return
    dispatch({ type: 'undo' })
  }

  function onAbandon() {
    if (game.phase !== 'playing' || settled.current) return
    settled.current = true
    onLoss()
    dispatch({ type: 'abandon', now: Date.now() })
  }

  async function onSave(event: FormEvent) {
    event.preventDefault()
    if (game.saved || game.phase !== 'won' || game.endedAt === null || saving) return
    if (online && !account) return
    const clean = cleanPseudo(name)
    if (!online && clean.length === 1) {
      setNameError('Deux caractères minimum.')
      return
    }
    const chosen = online ? (account ?? '') : clean.length === 0 ? 'Joueur' : clean
    const entry: ScoreEntry = {
      id: crypto.randomUUID(),
      pseudo: chosen,
      score: score.total,
      steps,
      optimal: challenge.optimal,
      seconds: Math.max(0, Math.round((game.endedAt - game.startedAt) / 1000)),
      difficulty: challenge.difficulty,
      length: challenge.length,
      date: new Date().toISOString(),
    }
    setSaving(true)
    const error = await onSaveScore(entry)
    setSaving(false)
    if (error) {
      setNameError(error)
      return
    }
    setName(chosen)
    setNameError(null)
    dispatch({ type: 'saved' })
  }

  return (
    <div className="space-y-4">
      <section className="panel">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.16em] text-[#7c3aed] uppercase">Prochain défi</p>
            <p className="text-sm text-[#2a1845]/65">Chaque tirage a une solution, calculée à l’avance.</p>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-[#2a1845]">
            <Timer className="size-4 text-[#ff5a36]" />
            <span className="tabular-nums">{formatDuration(elapsed)}</span>
            <span className="mx-1 text-[#2a1845]/25">·</span>
            <span>
              {game.phase === 'abandoned'
                ? '—'
                : `${formatPoints(score.total)} pts${game.phase === 'playing' ? ' estimés' : ''}`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Difficulté du prochain défi">
          {DIFFICULTY_ORDER.map((level) => {
            const selected = difficulty === level
            return (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setDifficulty(level)}
                className={`rounded-2xl border px-2 py-2 text-center transition ${
                  selected
                    ? 'border-[#ff5a36] bg-[#fff1ea] shadow-[0_0_0_3px_rgba(255,90,54,0.15)]'
                    : 'border-[#2a1845]/10 bg-white hover:bg-[#fffaf5]'
                }`}
              >
                <span className="block text-sm font-extrabold text-[#2a1845]">{DIFFICULTY_LABEL[level]}</span>
                <span className="block text-[11px] font-semibold text-[#2a1845]/55">{DIFFICULTY_HINT[level]}</span>
              </button>
            )
          })}
        </div>

        <Button variant="challenge" className="mt-3 h-16 w-full text-lg" onClick={onNew}>
          <Sparkles className="size-5" />
          Nouveau défi
        </Button>
      </section>

      {game.phase === 'won' && (
        <div ref={victoryRef} className="pop-in rounded-3xl bg-[linear-gradient(135deg,#12372a,#0f9b8e)] px-5 py-4 text-white shadow-lg">
          <p className="text-xs font-extrabold tracking-[0.16em] text-white/70 uppercase">Sommet atteint</p>
          <p className="font-display text-3xl">Bravo, l’échelle est gravie !</p>
          <p className="mt-1 text-sm text-white/85">
            {steps} pas · optimal {challenge.optimal} · {formatDuration(elapsed)}
            {hints > 0 ? ` · ${hints} indice${hints > 1 ? 's' : ''}` : ''}
          </p>
        </div>
      )}

      {game.phase === 'abandoned' && (
        <div className="rounded-3xl bg-[#2a1845] px-5 py-4 text-white">
          <p className="text-xs font-extrabold tracking-[0.16em] text-white/60 uppercase">Abandon</p>
          <p className="font-display text-2xl">Une solution en {challenge.optimal} pas</p>
          <p className="mt-1 text-sm text-white/75">
            Tu t’étais arrêté à « {current} ».
            {online && !account
              ? ' Connecte-toi pour que cette défaite compte dans ta série.'
              : ` La série retombe à zéro${stats.bestStreak > 0 ? ` (record : ${stats.bestStreak}).` : '.'}`}
          </p>
        </div>
      )}

      <LadderView
        rungs={rungs}
        target={challenge.target}
        optimal={challenge.optimal}
        remaining={remaining}
        difficulty={challenge.difficulty}
        length={challenge.length}
        phase={game.phase}
      />

      {game.phase === 'playing' && (
        <form onSubmit={onSubmit} className="panel">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label htmlFor="next-word" className="text-sm font-extrabold text-[#2a1845]">
              Mot suivant
            </label>
            <Badge tone={challenge.difficulty}>
              {steps} / {challenge.optimal} pas
            </Badge>
          </div>
          {game.hint && (
            <p className="mb-2 rounded-2xl bg-[#fff3cc] px-3 py-2 text-sm font-bold text-[#8a5a00]">
              Indice : <span className="tracking-widest uppercase">{game.hint}</span>
            </p>
          )}
          <div key={game.shake} className={game.error ? 'shake' : undefined}>
            <Input
              ref={inputRef}
              id="next-word"
              value={game.input}
              onChange={(event) =>
                dispatch({
                  type: 'input',
                  value: event.target.value.toLowerCase().replace(/[^a-zàâäéèêëïîôùûüçœæ]/g, '').slice(0, challenge.length + 2),
                })
              }
              placeholder={`${challenge.length} lettres, une seule change`}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              lang="fr"
              aria-invalid={game.error ? true : undefined}
              aria-describedby={game.error ? 'move-error' : undefined}
            />
          </div>
          {game.error && (
            <p id="move-error" role="alert" className="mt-2 text-sm font-bold text-[#be123c]">
              {game.error}
            </p>
          )}
          <Button variant="default" type="submit" className="mt-3 h-12 w-full text-base">
            Grimper
          </Button>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Button variant="outline" className="h-12 px-1 text-xs whitespace-normal sm:text-sm" onClick={onUndo} disabled={game.chain.length < 2}>
              <Undo2 className="size-4 shrink-0" />
              Annuler
            </Button>
            <Button variant="soft" className="h-12 px-1 text-xs whitespace-normal sm:text-sm" onClick={onHint}>
              <Lightbulb className="size-4 shrink-0" />
              <span className="flex flex-col items-start leading-none">
                <span>Indice</span>
                <span className="text-[10px] font-semibold opacity-70">−{hintCost} pts</span>
              </span>
            </Button>
            <Button variant="danger" className="h-12 px-1 text-xs whitespace-normal sm:text-sm" onClick={onAbandon}>
              <Flag className="size-4 shrink-0" />
              Abandonner
            </Button>
          </div>
        </form>
      )}

      {game.phase === 'won' && (
        <form onSubmit={onSave} className="panel">
          <h3 className="font-display text-2xl text-[#2a1845]">Ton score</h3>
          <dl className="mt-3 space-y-1.5 text-sm">
            <ScoreRow label="Base" value={formatSigned(score.base)} />
            <ScoreRow label="Rapidité" value={formatSigned(score.timeBonus)} />
            <ScoreRow label="Précision" value={formatSigned(score.precision)} />
            <ScoreRow label="Indices" value={formatSigned(-score.hintPenalty)} />
            <div className="flex items-center justify-between border-t border-[#2a1845]/10 pt-2 text-base font-extrabold">
              <dt>Total</dt>
              <dd className="text-[#ff5a36]">{formatPoints(score.total)} pts</dd>
            </div>
          </dl>
          {game.saved ? (
            <div className="mt-4">
              <p className="font-bold text-emerald-700">
                Score enregistré{online ? ' sur ton compte' : ` pour ${name}`}.
              </p>
              <Button variant="outline" className="mt-3" onClick={onShowScores}>
                Voir le tableau
              </Button>
            </div>
          ) : online && !account ? (
            <div className="mt-4">
              <p className="mb-3 text-sm font-semibold text-[#2a1845]/75">
                Connecte-toi pour publier ce score. Le mot de passe reste sur le serveur, jamais dans la page.
              </p>
              <AuthForm onAuthenticated={onAuthenticated} compact />
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {!online && (
                <div className="flex-1">
                  <label htmlFor="pseudo" className="mb-1 block text-xs font-extrabold tracking-wide text-[#2a1845]/55 uppercase">
                    Pseudo
                  </label>
                  <Input
                    id="pseudo"
                    value={name}
                    maxLength={16}
                    onChange={(event) => {
                      setName(event.target.value)
                      setNameError(null)
                    }}
                    placeholder="Ton pseudo"
                    className="normal-case tracking-normal"
                    autoComplete="nickname"
                  />
                </div>
              )}
              <div className="flex-1">
                {online && account && <p className="mb-2 text-sm font-bold text-[#2a1845]">Compte : {account}</p>}
                {nameError && <p className="mb-2 text-sm font-bold text-[#be123c]">{nameError}</p>}
                <Button type="submit" className="h-14 w-full sm:w-auto" disabled={saving}>
                  {saving ? 'Envoi…' : online ? 'Publier' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  )
}

function ScoreRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[#2a1845]/80">
      <dt>{label}</dt>
      <dd className="font-bold text-[#2a1845]">{value}</dd>
    </div>
  )
}
