import { describe, expect, it } from 'vitest'
import plugin from '~~/server/plugins/startup-validation'
import { runNitroPlugin, setRuntimeConfig } from '~~/test/helpers/nitro'

/** A misconfigured deployment must fail at boot, not on the first sealed session. */
describe('server/plugins/startup-validation', () => {
  it('boots with a 32+ character session password and a secret key', async () => {
    await expect(runNitroPlugin(plugin)).resolves.toEqual({ hooks: expect.any(Object) })
  })

  it.each([
    ['the session password is unset', { session: { password: '' } }, 'NUXT_SESSION_PASSWORD is not set'],
    ['the session password is shorter than 32 characters', { session: { password: 'x'.repeat(31) } }, 'at least 32 characters'],
    // What decides which calls carry the edge secret: a value that is
    // not an absolute URL must stop the boot, not silently match nothing.
    ['the API base URL is unset', { apiBaseUrl: '' }, 'NUXT_API_BASE_URL'],
    ['the API base URL is not absolute', { apiBaseUrl: '/api/v1' }, 'NUXT_API_BASE_URL'],
    ['the Django URL is not a URL', { djangoUrl: 'backend:8000' }, 'NUXT_DJANGO_URL'],
  ])('refuses to boot when %s', async (_label, config, message) => {
    setRuntimeConfig(config)

    await expect(runNitroPlugin(plugin)).rejects.toThrow(message)
  })
})
