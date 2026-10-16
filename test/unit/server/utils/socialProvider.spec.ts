/**
 * `/auth/<provider>` starts OAuth only for a provider the store offers:
 * the list its sign-in buttons draw, read from its allauth config. A
 * store that switched Facebook off (`SOCIAL_LOGIN_PROVIDERS = ["google"]`
 * on demo and webside, 2026-10-16) still sent shoppers through
 * Facebook's consent screen before.
 */
import { describe, expect, it } from 'vitest'
import { requireSocialProvider } from '~~/server/utils/socialProvider'
import { makeAllAuthConfig } from '~~/test/fixtures/allauth'
import { backend, createTestEvent, jsonResponse } from '~~/test/helpers/nitro'

const GOOGLE = { id: 'google', name: 'Google', flows: ['provider_redirect' as const] }
const FACEBOOK = { id: 'facebook', name: 'Facebook', flows: ['provider_redirect' as const] }

function offering(...providers: Array<typeof GOOGLE & { client_id?: string }>) {
  backend.reply(makeAllAuthConfig({ socialaccount: { providers } }))
}

const check = (provider: string) => requireSocialProvider(createTestEvent({ host: 'demo.test' }), provider)

describe('requireSocialProvider', () => {
  it('lets the flow start for a provider the store offers', async () => {
    offering(GOOGLE)

    await expect(check('google')).resolves.toBeUndefined()
  })

  it('answers 404 for a provider the store does not list', async () => {
    offering(GOOGLE)

    await expect(check('facebook')).rejects.toMatchObject({ statusCode: 404 })
  })

  it('answers 404 for a listed provider without a client id, which has no button', async () => {
    offering(GOOGLE, { ...FACEBOOK, client_id: '' })

    await expect(check('facebook')).rejects.toMatchObject({ statusCode: 404 })
  })

  it('answers 404 when the store has social sign-in off altogether', async () => {
    backend.reply(makeAllAuthConfig({ socialaccount: undefined }))

    await expect(check('google')).rejects.toMatchObject({ statusCode: 404 })
  })

  it('asks the store the request is for', async () => {
    offering(GOOGLE)

    await check('google')

    expect(backend.lastRequest.path).toBe('http://backend.test/_allauth/app/v1/config')
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('demo.test')
  })

  it('fails rather than starting a flow when the config cannot be read', async () => {
    backend.reply(jsonResponse({ detail: 'boom' }, 500))

    await expect(check('google')).rejects.toMatchObject({ statusCode: 500 })
  })
})
