import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import BalanceCheck from '~/components/GiftCard/BalanceCheck.vue'
import { failWith } from '~~/test/helpers/api'

/**
 * "Got a gift card?": the code goes to `POST /api/giftcard/check` and
 * what is left on it comes back. Django throttles the check and says why
 * in `detail`, which is shown as it comes.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const CARD = {
  code: 'GC-AAAA-BBBB',
  balance: 25,
  currency: 'EUR',
  expiresAt: null as string | null,
  isRedeemable: true,
}

beforeEach(() => {
  api.routes({ '/api/giftcard/check': CARD })
})

async function check(code: string) {
  const wrapper: VueWrapper = await mountSuspended(BalanceCheck, { route: false })
  await wrapper.find('input').setValue(code)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
  return wrapper
}

const text = (wrapper: VueWrapper) => wrapper.text().replace(/\u00A0/g, ' ')

describe('GiftCard/BalanceCheck', () => {
  it('checks the code trimmed and upper-cased, and shows what is left', async () => {
    const wrapper = await check('  gc-aaaa-bbbb ')

    expect(api.callsTo('/api/giftcard/check')).toEqual([
      { url: '/api/giftcard/check', options: expect.objectContaining({ method: 'POST', body: { code: 'GC-AAAA-BBBB' } }) },
    ])
    expect(wrapper.find('[role="status"]').text().replace(/\u00A0/g, ' ')).toContain('25,00 €')
    expect(text(wrapper)).toContain('GC-AAAA-BBBB')
  })

  it('shows the expiry when the card has one', async () => {
    api.routes({ '/api/giftcard/check': { ...CARD, expiresAt: '2099-03-01T12:00:00Z' } })

    const wrapper = await check('GC-AAAA-BBBB')

    expect(wrapper.find('[role="status"]').text()).toContain('2099')
  })

  it('says a card that cannot be used cannot be used', async () => {
    api.routes({ '/api/giftcard/check': { ...CARD, balance: 0, isRedeemable: false } })

    const wrapper = await check('GC-AAAA-BBBB')

    expect(wrapper.find('[role="status"]').text()).toContain('Η κάρτα δεν μπορεί να χρησιμοποιηθεί')
  })

  it('shows Django\'s own reason when the check is refused', async () => {
    api.routes({ '/api/giftcard/check': failWith(429, { detail: 'Πολλές προσπάθειες, δοκίμασε σε λίγο' }) })

    const wrapper = await check('GC-AAAA-BBBB')

    expect(text(wrapper)).toContain('Πολλές προσπάθειες, δοκίμασε σε λίγο')
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('shows the shape of a code Django issues', async () => {
    const wrapper = await mountSuspended(BalanceCheck, { route: false })

    expect(wrapper.find('input').attributes('placeholder')).toBe('GC-XXXX-XXXX-XXXX')
  })

  it('does not ask Django for an empty code', async () => {
    const wrapper = await check('   ')

    expect(api.callsTo('/api/giftcard/check')).toEqual([])
    expect(text(wrapper)).toContain('Συμπλήρωσε τον κωδικό')
  })
})
