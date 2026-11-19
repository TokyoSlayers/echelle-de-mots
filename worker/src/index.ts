import { bytesToBase64, hashPassword, newSalt, signJwt, verifyJwt, verifyPassword } from './crypto'
import { cleanPseudo, validateCredentials, validateResult, type ResultInput } from './limits'
import type { Difficulty, Length } from '../../src/lib/types'

interface D1Prepared {
  bind(...values: unknown[]): D1Prepared
  first<T>(): Promise<T | null>
  all<T>(): Promise<{ results: T[] }>
  run(): Promise<unknown>
}

interface D1Database {
  prepare(query: string): D1Prepared
}

interface Env {
  DB: D1Database
  AUTH_SECRET?: string
  ALLOWED_ORIGIN?: string
}

type UserRow = { id: string; pseudo: string; password_hash: string; password_salt: string }
type ResultRow = {
  id: string
  pseudo: string
  score: number
  steps: number
  optimal: number
  seconds: number
  difficulty: Difficulty
  length: Length
  created_at: string
  result: 'win' | 'loss'
}

const COOKIE = 'echelle_session'
const WEEK = 60 * 60 * 24 * 7

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) return json({ error: 'Introuvable.' }, 404, request, env)
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) })
    }
    try {
      if (url.pathname === '/api/health' && request.method === 'GET') {
        return json({ ok: true, auth: Boolean(env.AUTH_SECRET && env.AUTH_SECRET.length >= 16) }, 200, request, env)
      }
      if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 16) {
        return json({ error: 'Le serveur n’est pas configuré.' }, 503, request, env)
      }
      if (url.pathname === '/api/register' && request.method === 'POST') return register(request, env)
      if (url.pathname === '/api/login' && request.method === 'POST') return login(request, env)
      if (url.pathname === '/api/logout' && request.method === 'POST') return logout(request, env)
      if (url.pathname === '/api/me' && request.method === 'GET') return me(request, env)
      if (url.pathname === '/api/leaderboard' && request.method === 'GET') return leaderboard(request, env)
      if (url.pathname === '/api/stats' && request.method === 'GET') return stats(request, env)
      if (url.pathname === '/api/results' && request.method === 'POST') return record(request, env)
      return json({ error: 'Introuvable.' }, 404, request, env)
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'erreur')
      return json({ error: 'Le serveur a rencontré un problème.' }, 500, request, env)
    }
  },
}

async function register(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request)
  const pseudo = cleanPseudo(String(body.pseudo ?? ''))
  const password = String(body.password ?? '')
  const invalid = validateCredentials(pseudo, password)
  if (invalid) return json({ error: invalid }, 400, request, env)
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local'
  if (await tooMany(env, `register:${ip}`)) {
    return json({ error: 'Trop de tentatives. Réessaie dans quelques minutes.' }, 429, request, env)
  }
  const salt = newSalt()
  const hash = await hashPassword(password, salt)
  const id = crypto.randomUUID()
  try {
    await env.DB.prepare(
      'INSERT INTO users (id, pseudo, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)',
    )
      .bind(id, pseudo, hash, bytesToBase64(salt), new Date().toISOString())
      .run()
  } catch (error) {
    await noteAttempt(env, `register:${ip}`)
    if (error instanceof Error && /UNIQUE/i.test(error.message)) {
      return json({ error: 'Ce pseudo est déjà pris.' }, 409, request, env)
    }
    throw error
  }
  return sessionResponse(request, env, { id, pseudo }, 201)
}

async function login(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request)
  const pseudo = cleanPseudo(String(body.pseudo ?? ''))
  const password = String(body.password ?? '')
  const invalid = validateCredentials(pseudo, password)
  if (invalid) return json({ error: 'Pseudo ou mot de passe incorrect.' }, 401, request, env)
  if (await tooMany(env, `login:${pseudo.toLowerCase()}`)) {
    return json({ error: 'Trop de tentatives. Réessaie dans quelques minutes.' }, 429, request, env)
  }
  const user = await env.DB.prepare(
    'SELECT id, pseudo, password_hash, password_salt FROM users WHERE pseudo = ? COLLATE NOCASE',
  )
    .bind(pseudo)
    .first<UserRow>()
  const matches = user ? await verifyPassword(password, user.password_salt, user.password_hash) : false
  if (!user || !matches) {
    await noteAttempt(env, `login:${pseudo.toLowerCase()}`)
    return json({ error: 'Pseudo ou mot de passe incorrect.' }, 401, request, env)
  }
  await env.DB.prepare('DELETE FROM attempts WHERE bucket = ?').bind(`login:${pseudo.toLowerCase()}`).run()
  return sessionResponse(request, env, user, 200)
}

function logout(request: Request, env: Env): Response {
  const headers = new Headers()
  headers.set('set-cookie', clearCookie(request))
  return json({ ok: true }, 200, request, env, headers)
}

async function me(request: Request, env: Env): Promise<Response> {
  const user = await currentUser(request, env)
  if (!user) return json({ pseudo: null }, 200, request, env)
  return json({ pseudo: user.pseudo }, 200, request, env)
}

async function leaderboard(request: Request, env: Env): Promise<Response> {
  return json({ scores: await topScores(env) }, 200, request, env)
}

async function stats(request: Request, env: Env): Promise<Response> {
  const user = await currentUser(request, env)
  if (!user) return json({ error: 'Connexion requise.' }, 401, request, env)
  return json(await statsFor(env, user.id), 200, request, env)
}

async function record(request: Request, env: Env): Promise<Response> {
  const user = await currentUser(request, env)
  if (!user) return json({ error: 'Connexion requise.' }, 401, request, env)
  const body = await readJson(request)
  const input: ResultInput = {
    id: String(body.id ?? ''),
    result: body.result === 'loss' ? 'loss' : 'win',
    score: Number(body.score),
    steps: Number(body.steps),
    optimal: Number(body.optimal),
    seconds: Number(body.seconds),
    difficulty: body.difficulty as ResultInput['difficulty'],
    length: Number(body.length) as ResultInput['length'],
  }
  const invalid = validateResult(input)
  if (invalid) return json({ error: invalid }, 400, request, env)
  const existing = await env.DB.prepare('SELECT id FROM results WHERE id = ?').bind(input.id).first<{ id: string }>()
  if (!existing) {
    await env.DB.prepare(
      `INSERT INTO results (id, user_id, result, score, steps, optimal, seconds, difficulty, length, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        input.id,
        user.id,
        input.result,
        input.result === 'win' ? input.score : 0,
        input.steps,
        input.optimal,
        input.seconds,
        input.difficulty,
        input.length,
        new Date().toISOString(),
      )
      .run()
  }
  return json({ stats: await statsFor(env, user.id), leaderboard: await topScores(env) }, 200, request, env)
}

async function topScores(env: Env) {
  const rows = await env.DB.prepare(
    `SELECT r.id, u.pseudo, r.score, r.steps, r.optimal, r.seconds, r.difficulty, r.length, r.created_at, r.result
     FROM results r JOIN users u ON u.id = r.user_id
     WHERE r.result = 'win'
     ORDER BY r.score DESC, r.created_at DESC
     LIMIT 10`,
  ).all<ResultRow>()
  return rows.results.map(toScore)
}

async function statsFor(env: Env, userId: string) {
  const rows = await env.DB.prepare(
    'SELECT result, created_at FROM results WHERE user_id = ? ORDER BY created_at ASC LIMIT 2000',
  )
    .bind(userId)
    .all<{ result: 'win' | 'loss'; created_at: string }>()
  const list = rows.results
  let wins = 0
  let best = 0
  let current = 0
  for (const row of list) {
    if (row.result === 'win') {
      wins += 1
      current += 1
      best = Math.max(best, current)
    } else {
      current = 0
    }
  }
  let streak = 0
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i]?.result !== 'win') break
    streak += 1
  }
  return { played: list.length, wins, streak, bestStreak: best }
}

function toScore(row: ResultRow) {
  return {
    id: row.id,
    pseudo: row.pseudo,
    score: row.score,
    steps: row.steps,
    optimal: row.optimal,
    seconds: row.seconds,
    difficulty: row.difficulty,
    length: row.length,
    date: row.created_at,
  }
}

async function currentUser(request: Request, env: Env): Promise<{ id: string; pseudo: string } | null> {
  const token = readCookie(request, COOKIE)
  if (!token || !env.AUTH_SECRET) return null
  const claims = await verifyJwt(env.AUTH_SECRET, token)
  if (!claims) return null
  const user = await env.DB.prepare('SELECT id, pseudo FROM users WHERE id = ?')
    .bind(claims.sub)
    .first<{ id: string; pseudo: string }>()
  return user ?? null
}

async function sessionResponse(request: Request, env: Env, user: { id: string; pseudo: string }, status: number) {
  const token = await signJwt(env.AUTH_SECRET ?? '', {
    sub: user.id,
    pseudo: user.pseudo,
    exp: Math.floor(Date.now() / 1000) + WEEK,
  })
  const headers = new Headers()
  headers.set('set-cookie', sessionCookie(request, token))
  return json({ pseudo: user.pseudo }, status, request, env, headers)
}

async function tooMany(env: Env, bucket: string): Promise<boolean> {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM attempts WHERE bucket = ? AND created_at > ?')
    .bind(bucket, since)
    .first<{ n: number }>()
  return (row?.n ?? 0) >= 8
}

async function noteAttempt(env: Env, bucket: string): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  await env.DB.prepare('DELETE FROM attempts WHERE created_at < ?').bind(cutoff).run()
  await env.DB.prepare('INSERT INTO attempts (bucket, created_at) VALUES (?, ?)').bind(bucket, new Date().toISOString()).run()
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = (await request.json()) as unknown
    if (!body || typeof body !== 'object' || Array.isArray(body)) return {}
    return body as Record<string, unknown>
  } catch {
    return {}
  }
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie') ?? ''
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

function secureRequest(request: Request): boolean {
  return new URL(request.url).protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https'
}

function sessionCookie(request: Request, token: string): string {
  const secure = secureRequest(request)
  return [
    `${COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${WEEK}`,
    secure ? 'SameSite=None' : 'SameSite=Lax',
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')
}

function clearCookie(request: Request): string {
  const secure = secureRequest(request)
  return [`${COOKIE}=`, 'HttpOnly', 'Path=/', 'Max-Age=0', secure ? 'SameSite=None' : 'SameSite=Lax', secure ? 'Secure' : '']
    .filter(Boolean)
    .join('; ')
}

function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers()
  const origin = request.headers.get('Origin')
  const allowed = env.ALLOWED_ORIGIN ?? ''
  if (origin && allowed && origin === allowed) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Credentials', 'true')
    headers.set('Access-Control-Allow-Headers', 'content-type')
    headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    headers.set('Vary', 'Origin')
  }
  return headers
}

function json(body: unknown, status: number, request: Request, env: Env, extra?: Headers): Response {
  const headers = corsHeaders(request, env)
  headers.set('content-type', 'application/json; charset=utf-8')
  headers.set('cache-control', 'no-store')
  headers.set('x-content-type-options', 'nosniff')
  extra?.forEach((value, key) => headers.set(key, value))
  return new Response(JSON.stringify(body), { status, headers })
}
