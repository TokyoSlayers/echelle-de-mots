import { useState, type FormEvent } from 'react'
import { ApiError, api } from '../lib/api'
import { Button } from './ui/button'
import { Input } from './ui/input'

export function AuthForm({
  onAuthenticated,
  compact = false,
}: {
  onAuthenticated: (pseudo: string) => void
  compact?: boolean
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [pseudo, setPseudo] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (mode === 'register' && password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setBusy(true)
    try {
      const result = mode === 'register' ? await api.register(pseudo, password) : await api.login(pseudo, password)
      setPassword('')
      setConfirm('')
      onAuthenticated(result.pseudo)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Connexion impossible.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="flex gap-2 text-sm font-extrabold">
        <button
          type="button"
          className={mode === 'login' ? 'text-[#ff5a36]' : 'text-[#2a1845]/50'}
          onClick={() => setMode('login')}
        >
          Connexion
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'text-[#ff5a36]' : 'text-[#2a1845]/50'}
          onClick={() => setMode('register')}
        >
          Inscription
        </button>
      </div>
      <Input
        value={pseudo}
        onChange={(event) => setPseudo(event.target.value)}
        placeholder="Pseudo"
        autoComplete="username"
        maxLength={16}
        required
        className="h-12 normal-case tracking-normal"
      />
      <Input
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Mot de passe"
        type="password"
        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
        minLength={8}
        maxLength={72}
        required
        className="h-12 normal-case tracking-normal"
      />
      {mode === 'register' && (
        <Input
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="Confirmer le mot de passe"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
          className="h-12 normal-case tracking-normal"
        />
      )}
      {error && <p className="text-sm font-bold text-[#be123c]">{error}</p>}
      <Button type="submit" className="h-11 w-full" disabled={busy}>
        {busy ? 'Patiente…' : mode === 'register' ? 'Créer mon compte' : 'Se connecter'}
      </Button>
    </form>
  )
}
