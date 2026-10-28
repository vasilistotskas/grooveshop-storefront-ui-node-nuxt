import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import FooterDesktop from '~/components/variants/webside/Footer/Desktop.vue'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * Webside's desktop footer offers the cookie settings only where the store
 * uses an optional service, the one rule the platform footers follow: a
 * store with none sets nothing optional, so there is nothing to configure.
 */
const NONE = { gaTrackingId: '', googleAdsConversionId: '', metaPixelId: '', tiktokPixelId: '', openaiPixelId: '' }
const COOKIE_SETTINGS = 'Ρυθμίσεις cookies'

const mountFooter = () => mountSuspended(FooterDesktop, { route: false })
const hasCookieSettings = (wrapper: Awaited<ReturnType<typeof mountFooter>>) =>
  wrapper.findAll('button').some(candidate => candidate.text() === COOKIE_SETTINGS)

describe('webside Footer/Desktop', () => {
  beforeEach(() => {
    setTenant({ ...NONE })
  })

  it('has no cookie settings for a store with no optional service', async () => {
    expect(hasCookieSettings(await mountFooter())).toBe(false)
  })

  it('opens the cookie settings for a store that uses one', async () => {
    setTenant({ ...NONE, metaPixelId: '123' })

    const wrapper = await mountFooter()
    const button = wrapper.findAll('button').find(candidate => candidate.text() === COOKIE_SETTINGS)!
    await button.trigger('click')

    expect(useCookieControl().isModalActive.value).toBe(true)
  })
})
