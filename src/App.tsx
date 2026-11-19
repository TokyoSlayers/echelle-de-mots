import { Timer, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Game } from './components/Game'
import { RulesDialog } from './components/RulesDialog'
import { Scoreboard } from './components/Scoreboard'
import { Button } from './components/ui/button'
import { setMuted, playSound } from './lib/sounds'
import {
  loadMuted,
  loadPseudo,
  loadScores,
  loadStats,
  nextLoss,
  nextWin,
  rankScores,
  saveMuted,
  savePseudo,
  saveScores,
  saveStats,
  type ScoreEntry,
  type Stats,
} from './lib/storage'

type Tab = 'jeu' | 'scores'

export default function App() {
  const [tab, setTab] = useState<Tab>('jeu')
  const [stats, setStats] = useState<Stats>(() => loadStats())
  const [scores, setScores] = useState<ScoreEntry[]>(() => rankScores(loadScores()))
  const [pseudo, setPseudo] = useState(() => loadPseudo())
  const [muted, setMutedState] = useState(() => loadMuted())
  const [latestId, setLatestId] = useState<string | null>(null)

  useEffect(() => {
    setMuted(muted)
    saveMuted(muted)
  }, [muted])

  function onWin() {
    const next = nextWin(stats)
    saveStats(next)
    setStats(next)
  }

  function onLoss() {
    const next = nextLoss(stats)
    saveStats(next)
    setStats(next)
  }

  function onSaveScore(entry: ScoreEntry) {
    const next = rankScores([...scores, entry]).slice(0, 100)
    saveScores(next)
    savePseudo(entry.pseudo)
    setScores(next)
    setPseudo(entry.pseudo)
    setLatestId(entry.id)
  }

  return (
    <div className="page">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:py-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <LadderMark />
            <div>
              <p className="text-[11px] font-extrabold tracking-[0.18em] text-[#ff5a36] uppercase">Doublets</p>
              <h1 className="font-display text-4xl leading-none text-[#2a1845] sm:text-5xl">Échelle de mots</h1>
              <p className="mt-1 max-w-md text-sm text-[#2a1845]/70 sm:text-base">
                Change une seule lettre à chaque échelon, et grimpe jusqu’au sommet.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-sm font-bold text-[#2a1845] shadow-sm">
              <Timer className="size-4 text-[#0f9b8e]" />
              Série {stats.streak}
            </span>
            <RulesDialog />
            <Button
              variant="outline"
              size="icon"
              aria-label={muted ? 'Activer le son' : 'Couper le son'}
              aria-pressed={muted}
              onClick={() => {
                const next = !muted
                setMutedState(next)
                setMuted(next)
                if (!next) playSound('hint')
              }}
            >
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-1 rounded-full bg-white/70 p-1 shadow-sm lg:hidden" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'jeu'} className={tab === 'jeu' ? 'tab-on' : 'tab-off'} onClick={() => setTab('jeu')}>
            Jeu
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'scores'}
            className={tab === 'scores' ? 'tab-on' : 'tab-off'}
            onClick={() => setTab('scores')}
          >
            Scores
          </button>
        </div>

        <main className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className={tab === 'scores' ? 'hidden lg:block' : undefined}>
            <Game
              stats={stats}
              pseudo={pseudo}
              onWin={onWin}
              onLoss={onLoss}
              onSaveScore={onSaveScore}
              onShowScores={() => setTab('scores')}
            />
          </div>
          <div className={tab === 'jeu' ? 'hidden lg:block' : undefined}>
            <Scoreboard stats={stats} scores={scores} latestId={latestId} />
          </div>
        </main>

        <footer className="pb-4 text-center text-xs text-[#2a1845]/55">
          Inspiré des Doublets de Lewis Carroll. Les accents sont ignorés : tête et tete sont le même mot.
          Les scores restent dans ce navigateur.
        </footer>
      </div>
    </div>
  )
}

function LadderMark() {
  return (
    <svg viewBox="0 0 64 64" className="size-14 shrink-0 drop-shadow-sm" aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="#ff5a36" />
      <rect x="16" y="10" width="6" height="44" rx="3" fill="#ffe7a3" />
      <rect x="42" y="10" width="6" height="44" rx="3" fill="#ffe7a3" />
      <rect x="18" y="18" width="28" height="5" rx="2.5" fill="white" />
      <rect x="18" y="30" width="28" height="5" rx="2.5" fill="white" />
      <rect x="18" y="42" width="28" height="5" rx="2.5" fill="white" />
    </svg>
  )
}
