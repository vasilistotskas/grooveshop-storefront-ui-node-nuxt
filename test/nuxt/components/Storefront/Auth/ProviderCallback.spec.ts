import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { resolve } from 'node:path'
import YAML from 'yaml'
import ProviderCallback from '~/components/Storefront/Auth/ProviderCallback.vue'
import WebsideProviderCallback from '~/components/variants/webside/Storefront/Auth/ProviderCallback.vue'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'
import { asProxiedError, makePendingFlowResponse } from '~~/test/fixtures/allauth'
import { failWith } from '~~/test/helpers/api'

/**
 * Where a social login lands, with `?provider=&process=`: the provider's
 * tokens sit in the server session (never in the URL), are read from
 * `/api/auth/oauth-params` and sent to allauth's provider-token endpoint.
 *
 * Navigation afterwards belongs to the auth plugin's `auth:change`
 * chain; this page only shows a failure. A first-time user's 401 with a
 * pending `provider_signup` flow is the "finish signing up" hand-off,
 * not a failure.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const { route, providerToken, navigateToMock } = vi.hoisted(() => ({
  route: { query: {} as Record<string, string> },
  providerToken: vi.fn((_body: unknown) => Promise.resolve()),
  navigateToMock: vi.fn(),
}))
mockNuxtImport('useRoute', () => () => ({
  query: route.query,
  params: {},
  path: '/account/provider/callback',
  fullPath: '/account/provider/callback',
  name: 'account-provider-callback___el',
  hash: '',
  matched: [],
  meta: {},
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ providerToken }))
mockNuxtImport('navigateTo', () => navigateToMock)

const OAUTH_PARAMS = '/api/auth/oauth-params'

/** allauth's `provider_signup` pending, thrown the way the Nuxt proxy re-throws it. */
function pendingSignup() {
  return Object.assign(new Error('Unauthorized'), asProxiedError(makePendingFlowResponse('provider_signup')))
}

describe.each([
  ['default', ProviderCallback, 'app/components/Storefront/Auth/ProviderCallback.vue'],
  ['webside', WebsideProviderCallback, 'app/components/variants/webside/Storefront/Auth/ProviderCallback.vue'],
])('ProviderCallback (%s tree)', (tree, Component, file) => {
  const block = parseSfc(resolve(REPO, file)).customBlocks.find(b => b.type === 'i18n')!
  const messages = YAML.parse(block.content).el

  async function mount(query: Record<string, string>) {
    route.query = query
    const wrapper = await mountSuspended(Component, { route: false })
    await flushPromises()
    return wrapper
  }

  function expectFailure(wrapper: Awaited<ReturnType<typeof mount>>) {
    expect(wrapper.text()).toContain(messages.title.error)
    expect(wrapper.text()).toContain(messages.description)
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  }

  function expectNoFailure(wrapper: Awaited<ReturnType<typeof mount>>) {
    expect(wrapper.text()).not.toContain(messages.title.error)
    expect(wrapper.text()).not.toContain(messages.description)
  }

  describe('with a provider and a process', () => {
    it('sends the tokens from the server session, never from the URL', async () => {
      api.routes({
        [OAUTH_PARAMS]: { provider: 'google', client_id: 'cid', id_token: 'idt', access_token: 'act', process: 'login' },
      })

      const wrapper = await mount({ provider: 'google', process: 'login', access_token: 'from-url' })

      expect(api.callsTo(OAUTH_PARAMS)).toHaveLength(1)
      expect(providerToken).toHaveBeenCalledWith({
        provider: 'google',
        token: { client_id: 'cid', id_token: 'idt', access_token: 'act' },
        process: 'login',
      })
      expectNoFailure(wrapper)
      expect(wrapper.find('[role="status"]').exists()).toBe(false)
    })

    it('titles the page with the message the provider flow sent back', async () => {
      api.routes({ [OAUTH_PARAMS]: { provider: 'google', client_id: 'cid', process: 'connect' } })

      const wrapper = await mount({ provider: 'google', process: 'connect', messages: 'Ο λογαριασμός συνδέθηκε' })

      // The heading follows the end of the onMounted exchange; waited on
      // rather than assumed settled after one flush.
      await vi.waitFor(() => expect(providerToken).toHaveBeenCalledTimes(1))
      await vi.waitFor(() => expect(wrapper.find('h1').text()).toBe('Ο λογαριασμός συνδέθηκε'))
      expect(wrapper.text()).not.toContain(messages.title.loading)
    })

    it('omits the tokens the provider did not issue', async () => {
      api.routes({ [OAUTH_PARAMS]: { provider: 'facebook', client_id: 'cid', access_token: 'act', process: 'login' } })

      await mount({ provider: 'facebook', process: 'login' })

      expect(providerToken.mock.calls[0]![0]).toMatchObject({ token: { client_id: 'cid', access_token: 'act' } })
      expect(providerToken.mock.calls[0]![0]).not.toHaveProperty('token.id_token')
    })

    it.each([['connect', 'connect'], ['login', 'login'], ['anything-else', 'connect']])(
      'maps the session process %s to %s',
      async (process, expected) => {
        api.routes({ [OAUTH_PARAMS]: { provider: 'google', client_id: 'cid', process } })

        await mount({ provider: 'google', process: 'login' })

        expect(providerToken.mock.calls[0]![0]).toMatchObject({ process: expected })
      },
    )

    it('hands a first-time user on to the signup step instead of failing', async () => {
      api.routes({ [OAUTH_PARAMS]: { provider: 'google', client_id: 'cid', process: 'login' } })
      providerToken.mockRejectedValue(pendingSignup())

      const wrapper = await mount({ provider: 'google', process: 'login' })

      expect(navigateToMock).toHaveBeenCalledWith(expect.objectContaining({ path: '/account/provider/signup' }))
      expectNoFailure(wrapper)
    })

    it('shows the failure when allauth rejects the token', async () => {
      api.routes({ [OAUTH_PARAMS]: { provider: 'google', client_id: 'cid', process: 'login' } })
      providerToken.mockRejectedValue(Object.assign(new Error('Bad Request'), { statusCode: 400 }))

      const wrapper = await mount({ provider: 'google', process: 'login' })

      expectFailure(wrapper)
      expect(navigateToMock).not.toHaveBeenCalled()
    })

    it('shows the failure when the session holds no OAuth params', async () => {
      api.routes({ [OAUTH_PARAMS]: failWith(404) })

      expectFailure(await mount({ provider: 'google', process: 'login' }))
      expect(providerToken).not.toHaveBeenCalled()
    })
  })

  // The tab says what the heading says; it said "connecting" for good.
  it.runIf(tree === 'default')('names the failure in the browser tab too', async () => {
    await mount({})

    // unhead writes the head to the DOM on its own schedule.
    await vi.waitFor(() => expect(document.title).toContain(messages.title.error))
  })

  it.each([
    ['no query at all', {}],
    ['only an error from the provider', { error: 'access_denied' }],
    ['a provider without a process', { provider: 'google' }],
  ])('shows the failure with %s', async (_case, query) => {
    const wrapper = await mount(query)

    expectFailure(wrapper)
    expect(providerToken).not.toHaveBeenCalled()
  })
})
