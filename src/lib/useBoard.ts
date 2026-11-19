import { useCallback, useEffect, useState } from 'react'
import { ApiError, api, apiExpected } from './api'
import {
  EMPTY_STATS,
  loadScores,
  loadStats,
  nextLoss,
  nextWin,
  rankScores,
  saveScores,
  saveStats,
  type ScoreEntry,
  type Stats,
} from './storage'

export function useBoard() {
  const expected = apiExpected()
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(expected)
  const [account, setAccount] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats>(() => (expected ? EMPTY_STATS : loadStats()))
  const [scores, setScores] = useState<ScoreEntry[]>(() => (expected ? [] : rankScores(loadScores())))
  const [banner, setBanner] = useState<string | null>(() =>
    expected ? null : 'Le classement en ligne n’est pas relié : aucune adresse d’API n’est configurée.',
  )

  const applyLocal = useCallback(() => {
    setConnected(false)
    setAccount(null)
    setStats(loadStats())
    setScores(rankScores(loadScores()))
  }, [])

  const refresh = useCallback(async () => {
    if (!expected) return
    try {
      const health = await api.health()
      if (!health.auth) {
        setBanner('L’API répond, mais son secret n’est pas encore posé. Rien de confidentiel n’est dans le site.')
        applyLocal()
        return
      }
      const [pseudo, board] = await Promise.all([api.me(), api.leaderboard()])
      setConnected(true)
      setAccount(pseudo)
      setScores(board)
      setStats(pseudo ? await api.stats() : { ...EMPTY_STATS })
      setBanner(null)
    } catch {
      setBanner('Le classement en ligne ne répond pas. Tu peux jouer ; en attendant, les scores restent sur cet appareil.')
      applyLocal()
    } finally {
      setLoading(false)
    }
  }, [applyLocal, expected])

  useEffect(() => {
    if (!expected) return
    void refresh()
  }, [expected, refresh])

  async function publish(entry: ScoreEntry, result: 'win' | 'loss'): Promise<string | null> {
    if (!connected) {
      if (result === 'win') {
        const next = rankScores([...loadScores(), entry]).slice(0, 100)
        saveScores(next)
        setScores(next)
      }
      return null
    }
    try {
      const data = await api.record({
        id: entry.id,
        result,
        score: result === 'win' ? entry.score : 0,
        steps: entry.steps,
        optimal: entry.optimal,
        seconds: entry.seconds,
        difficulty: entry.difficulty,
        length: entry.length,
      })
      setStats(data.stats)
      setScores(data.leaderboard)
      return null
    } catch (error) {
      return error instanceof ApiError ? error.message : 'Impossible d’enregistrer la partie.'
    }
  }

  function recordLocalWin() {
    if (connected) return
    const next = nextWin(stats)
    saveStats(next)
    setStats(next)
  }

  function recordLocalLoss() {
    if (connected) return
    const next = nextLoss(stats)
    saveStats(next)
    setStats(next)
  }

  async function noteLogin(pseudo: string) {
    setConnected(true)
    setAccount(pseudo)
    setBanner(null)
    try {
      const [nextStats, board] = await Promise.all([api.stats(), api.leaderboard()])
      setStats(nextStats)
      setScores(board)
    } catch (error) {
      setBanner(error instanceof ApiError ? error.message : 'Connecté, mais le classement n’a pas pu être relu.')
    }
  }

  async function noteLogout() {
    try {
      await api.logout()
    } catch {
      /* le cookie est effacé au mieux */
    }
    setAccount(null)
    setStats({ ...EMPTY_STATS })
    try {
      setScores(await api.leaderboard())
    } catch {
      setScores([])
    }
  }

  return {
    expected,
    connected,
    loading,
    account,
    stats,
    scores,
    banner,
    publish,
    recordLocalWin,
    recordLocalLoss,
    noteLogin,
    noteLogout,
  }
}
