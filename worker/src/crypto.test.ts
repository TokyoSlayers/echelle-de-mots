import { describe, expect, it } from 'vitest'
import { bytesToBase64, hashPassword, newSalt, signJwt, verifyJwt, verifyPassword } from './crypto'
import { maxHonestScore, validateResult } from './limits'

describe('mots de passe', () => {
  it('vérifie le bon mot de passe et refuse le mauvais', async () => {
    const salt = newSalt()
    const hash = await hashPassword('phrase-secrète', salt)
    const saltB64 = bytesToBase64(salt)
    expect(await verifyPassword('phrase-secrète', saltB64, hash)).toBe(true)
    expect(await verifyPassword('autre-phrase', saltB64, hash)).toBe(false)
  })
})

describe('session', () => {
  it('signe un jeton et refuse un secret différent ou un jeton modifié', async () => {
    const token = await signJwt('secret-de-test-assez-long', {
      sub: 'user-1',
      pseudo: 'Camille',
      exp: Math.floor(Date.now() / 1000) + 60,
    })
    expect(await verifyJwt('secret-de-test-assez-long', token)).toMatchObject({ pseudo: 'Camille' })
    expect(await verifyJwt('autre-secret-assez-long', token)).toBeNull()
    expect(await verifyJwt('secret-de-test-assez-long', `${token}x`)).toBeNull()
  })
})

describe('scores honnêtes', () => {
  it('plafonne le score et refuse une victoire trop courte', () => {
    expect(maxHonestScore('facile', 4)).toBe(1080)
    expect(
      validateResult({
        id: '11111111-1111-1111-1111-111111111111',
        result: 'win',
        score: 5000,
        steps: 4,
        optimal: 4,
        seconds: 10,
        difficulty: 'facile',
        length: 4,
      }),
    ).toMatch(/maximum/)
    expect(
      validateResult({
        id: '11111111-1111-1111-1111-111111111111',
        result: 'win',
        score: 700,
        steps: 2,
        optimal: 4,
        seconds: 10,
        difficulty: 'facile',
        length: 4,
      }),
    ).toMatch(/minimum/)
  })
})
