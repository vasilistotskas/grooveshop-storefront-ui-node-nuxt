import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import LegalFooter from '~/components/Checkout/LegalFooter.vue'

/**
 * The checkout's foot: terms and privacy always (every store is seeded
 * them), the return policy only when the store published one, and the
 * merchant's phone when it has one.
 */
const { state } = vi.hoisted(() => ({
  state: { slugs: [] as string[], phone: '' },
}))

mockNuxtImport('useFooterContentPages', () => () => ({
  links: computed(() => []),
  published: computed(() => new Set(state.slugs)),
}))
mockNuxtImport('useMerchantIdentity', () => () => ({
  identity: computed(() => ({ phone: state.phone })),
}))

const mount = () => mountSuspended(LegalFooter, { route: false })
const links = (wrapper: Awaited<ReturnType<typeof mount>>) =>
  wrapper.findAll('a').map(a => ({ text: a.text(), href: a.attributes('href') }))

describe('Checkout/LegalFooter', () => {
  beforeEach(() => {
    state.slugs = []
    state.phone = ''
  })

  it('links the terms and the privacy policy on every store', async () => {
    const wrapper = await mount()

    expect(links(wrapper)).toEqual([
      { text: 'Όροι χρήσης', href: '/terms-of-use' },
      { text: 'Πολιτική απορρήτου', href: '/privacy-policy' },
    ])
  })

  it('links the return policy once the store has published one', async () => {
    state.slugs = ['terms', 'privacy', 'return-policy']

    const wrapper = await mount()

    expect(links(wrapper)).toContainEqual({ text: 'Πολιτική επιστροφών', href: '/return-policy' })
  })

  it('offers the merchant\'s phone as a call link', async () => {
    state.phone = '+30 2310 000000'

    const wrapper = await mount()

    expect(links(wrapper)).toContainEqual({ text: 'Βοήθεια: +30 2310 000000', href: 'tel:+302310000000' })
  })
})
