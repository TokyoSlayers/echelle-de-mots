import { Medal, Trophy } from 'lucide-react'
import { formatDate, formatDuration, formatPoints } from '../lib/score'
import type { ScoreEntry, Stats } from '../lib/storage'
import { DIFFICULTY_LABEL } from '../lib/types'
import { AuthForm } from './AuthForm'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

export function Scoreboard({
  stats,
  scores,
  latestId,
  loading,
  online,
  account,
  onAuthenticated,
  onLogout,
}: {
  stats: Stats
  scores: ScoreEntry[]
  latestId: string | null
  loading: boolean
  online: boolean
  account: string | null
  onAuthenticated: (pseudo: string) => void
  onLogout: () => void
}) {
  const top = scores.slice(0, 10)
  return (
    <section className="panel" aria-labelledby="scores-title">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-[#fff1cc] text-[#a16207]">
          <Trophy className="size-5" />
        </span>
        <div>
          <h2 id="scores-title" className="font-display text-2xl leading-none text-[#2a1845]">
            Tableau des scores
          </h2>
          <p className="mt-1 text-sm text-[#2a1845]/65">
            {online ? 'Les 10 meilleures ascensions, tous joueurs.' : 'Les 10 meilleures ascensions sur cet appareil.'}
          </p>
        </div>
      </div>

      {online &&
        (account ? (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-[#e8fbf6] px-3 py-2">
            <p className="text-sm font-bold text-[#0f6e64]">Connecté : {account}</p>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              Se déconnecter
            </Button>
          </div>
        ) : (
          <div className="mb-4 rounded-2xl bg-[#fffaf5] p-3">
            <AuthForm onAuthenticated={onAuthenticated} compact />
          </div>
        ))}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Parties" value={stats.played} />
        <Stat label="Victoires" value={stats.wins} />
        <Stat label="Série" value={stats.streak} />
        <Stat label="Record" value={stats.bestStreak} />
      </div>

      {loading ? (
        <p className="mt-4 text-sm font-semibold text-[#2a1845]/60">Chargement du classement…</p>
      ) : top.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[#2a1845]/15 bg-[#fffaf5] px-4 py-8 text-center">
          <Medal className="mx-auto size-8 text-[#ff8a1e]" />
          <p className="mt-2 font-bold text-[#2a1845]">Aucun score enregistré.</p>
          <p className="mt-1 text-sm text-[#2a1845]/65">
            {online ? 'La première victoire publiée s’affichera ici.' : 'Gagne une partie et inscris ton pseudo.'}
          </p>
        </div>
      ) : (
        <ol className="mt-4 space-y-2">
          {top.map((entry, index) => (
            <li
              key={entry.id}
              className={`rounded-2xl border px-3 py-3 ${entry.id === latestId ? 'border-[#ff8a1e] bg-[#fff7eb]' : 'border-[#2a1845]/10 bg-white'}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-extrabold text-[#2a1845]">
                  <span className="mr-1 text-[#2a1845]/40">{index + 1}.</span>
                  {entry.pseudo}
                </p>
                <p className="font-display text-xl text-[#ff5a36]">{formatPoints(entry.score)}</p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-[#2a1845]/70">
                <Badge tone={entry.difficulty}>{DIFFICULTY_LABEL[entry.difficulty]}</Badge>
                <span>
                  {entry.steps}/{entry.optimal} pas
                </span>
                <span>{formatDuration(entry.seconds * 1000)}</span>
                <span>{formatDate(entry.date)}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[#fff6ee] px-3 py-2">
      <p className="text-[11px] font-extrabold tracking-wide text-[#2a1845]/50 uppercase">{label}</p>
      <p className="font-display text-2xl text-[#2a1845]">{value}</p>
    </div>
  )
}
