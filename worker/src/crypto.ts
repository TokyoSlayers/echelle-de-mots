const PBKDF2_ITERATIONS = 120_000

export type SessionClaims = { sub: string; pseudo: string; exp: number }

export function newSalt(): Uint8Array {
  const salt = new Uint8Array(16)
  crypto.getRandomValues(salt)
  return salt
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4)
  return base64ToBytes(padded)
}

export async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS },
    key,
    256,
  )
  return bytesToBase64(new Uint8Array(bits))
}

export function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let diff = 0
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i)
  return diff === 0
}

export async function verifyPassword(password: string, saltBase64: string, expectedHash: string): Promise<boolean> {
  const actual = await hashPassword(password, base64ToBytes(saltBase64))
  return safeEqual(actual, expectedHash)
}

async function sign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return bytesToBase64Url(new Uint8Array(signature))
}

export async function signJwt(secret: string, claims: SessionClaims): Promise<string> {
  const header = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(claims)))
  const signature = await sign(secret, `${header}.${payload}`)
  return `${header}.${payload}.${signature}`
}

export async function verifyJwt(secret: string, token: string): Promise<SessionClaims | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, payload, signature] = parts
  if (!header || !payload || !signature) return null
  const expected = await sign(secret, `${header}.${payload}`)
  if (!safeEqual(signature, expected)) return null
  try {
    const claims = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as SessionClaims
    if (!claims.sub || !claims.pseudo || typeof claims.exp !== 'number') return null
    if (claims.exp < Math.floor(Date.now() / 1000)) return null
    return claims
  } catch {
    return null
  }
}
