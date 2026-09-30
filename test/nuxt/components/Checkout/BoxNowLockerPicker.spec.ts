import { describe, it, expect, afterEach, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import BoxNowLockerPicker from '~/components/Checkout/BoxNowLockerPicker.vue'
import { boxNowWidgetMessage } from '~~/test/fixtures/boxnow'

/**
 * The BoxNow widget in a full-screen modal: an iframe on the delivery
 * country's map, and a `postMessage` listener that turns the shopper's
 * pick into a locker. Only messages from BoxNow's own origins, carrying
 * a locker of the map's own country, are accepted. A widget that never
 * loads says so after 15 s and offers a retry — before that, "the lockers
 * don't load" was indistinguishable from an endless skeleton.
 *
 * Shared by both trees (no webside copy). The modal teleports to
 * `document.body`, so the iframe is read from there; each test unmounts
 * its picker so exactly one modal and one listener exist at a time.
 */

const GR_WIDGET = 'https://widget-v5.boxnow.gr'

let mounted: VueWrapper | undefined
afterEach(() => {
  mounted?.unmount()
  mounted = undefined
  vi.useRealTimers()
})

async function mount(props: Partial<{ open: boolean, partnerId: string, countryCode: string }> = {}) {
  mounted = await mountSuspended(BoxNowLockerPicker, {
    route: false,
    props: { open: true, partnerId: '10391', countryCode: 'GR', ...props },
  })
  return mounted
}

const iframe = () => document.querySelector('iframe')
const src = () => new URL(iframe()!.getAttribute('src')!)
const bodyText = () => document.body.textContent ?? ''
const t = (key: string): string => useNuxtApp().$i18n.t(key)

function post(origin: string, data: unknown) {
  window.dispatchEvent(new MessageEvent('message', { origin, data }))
}

describe('Checkout/BoxNowLockerPicker', () => {
  describe('the widget iframe', () => {
    it.each([
      ['GR', 'https://widget-v5.boxnow.gr', 'gr'],
      ['CY', 'https://widget-v5.boxnow.cy', 'cy'],
    ])('embeds the %s map for this store\'s partner', async (countryCode, origin, param) => {
      await mount({ countryCode })

      const url = src()
      expect(`${url.origin}${url.pathname}`).toBe(`${origin}/iframe.html`)
      expect(Object.fromEntries(url.searchParams)).toMatchObject({
        partnerId: '10391',
        countryCode: param,
        gps: 'yes',
        autoselect: 'yes',
        autoclose: 'no',
        language: 'el',
      })
      expect(iframe()!.getAttribute('allow')).toBe('geolocation')
      expect(iframe()!.getAttribute('title')).toBe(t('shipping.boxnow.modal_title'))
    })

    it('speaks English when the page is browsed in English', async () => {
      const { $i18n } = useNuxtApp()
      $i18n.locale.value = 'en'
      try {
        await mount()

        expect(src().searchParams.get('language')).toBe('en')
      }
      finally {
        $i18n.locale.value = 'el'
      }
    })

    it.each([
      ['a country BoxNow has no map for', { countryCode: 'BG' }],
      ['no BoxNow partner id', { partnerId: '' }],
    ])('renders no iframe for %s, rather than crashing the form', async (_case, props) => {
      // `src=""` would navigate the frame back to the checkout page and
      // fire `load`, hiding the skeleton for nothing.
      await mount(props)

      expect(iframe()).toBeNull()
    })
  })

  describe('a locker posted by the widget', () => {
    it('is emitted, and the modal closes', async () => {
      const wrapper = await mount()

      post(GR_WIDGET, boxNowWidgetMessage())
      await flushPromises()

      expect(wrapper.emitted('selected')).toEqual([[expect.objectContaining({
        boxnowLockerId: '4',
        boxnowLockerPostalCode: '15234',
        boxnowLockerAddressLine1: 'Λεωφ. Πεντέλης 125',
        boxnowLockerCountryCode: 'GR',
      })]])
      expect(wrapper.emitted('update:open')).toEqual([[false]])
    })

    it('is accepted from the Cyprus map for a Cypriot delivery', async () => {
      const wrapper = await mount({ countryCode: 'CY' })

      post('https://widget-v5.boxnow.cy', boxNowWidgetMessage({ boxnowLockerPostalCode: '2008', boxnowCountry: 'CY' }))
      await flushPromises()

      expect(wrapper.emitted('selected')![0]![0]).toMatchObject({ boxnowLockerCountryCode: 'CY' })
    })

    it.each([
      ['an untrusted origin', 'https://attacker.com', boxNowWidgetMessage()],
      ['BoxNow\'s host over plain HTTP', 'http://widget-v5.boxnow.gr', boxNowWidgetMessage()],
      ['another country\'s map', 'https://widget-v5.boxnow.cy', boxNowWidgetMessage({ boxnowCountry: 'CY' })],
      ['no locker country', GR_WIDGET, boxNowWidgetMessage({ boxnowCountry: undefined })],
      ['missing required fields', GR_WIDGET, { boxnowLockerId: '4' }],
      ['a non-object payload', GR_WIDGET, 'some-string-payload'],
    ])('is ignored when it comes from %s', async (_case, origin, data) => {
      const wrapper = await mount()

      post(origin, data)
      await flushPromises()

      expect(wrapper.emitted('selected')).toBeUndefined()
      expect(wrapper.emitted('update:open')).toBeUndefined()
    })
  })

  describe('loading', () => {
    const LOADING = () => t('shipping.boxnow.iframe_loading')
    const FAILED = 'Ο χάρτης των lockers δεν φόρτωσε'

    it('shows the skeleton until the iframe loads', async () => {
      await mount()
      expect(bodyText()).toContain(LOADING())

      iframe()!.dispatchEvent(new Event('load'))
      await flushPromises()

      expect(bodyText()).not.toContain(LOADING())
    })

    it('keeps waiting quietly before the 15 s timeout', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      await mount()

      await vi.advanceTimersByTimeAsync(14_999)

      expect(bodyText()).toContain(LOADING())
      expect(bodyText()).not.toContain(FAILED)
    })

    it('surfaces a failure with a retry once the widget has not loaded in 15 s', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      await mount()

      await vi.advanceTimersByTimeAsync(15_000)

      expect(bodyText()).toContain(FAILED)
      expect(bodyText()).not.toContain(LOADING())
    })

    it('does not time out once the iframe has loaded', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      await mount()
      iframe()!.dispatchEvent(new Event('load'))

      await vi.advanceTimersByTimeAsync(15_000)

      expect(bodyText()).not.toContain(FAILED)
    })

    it('retry reloads a fresh iframe and restarts the wait', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      await mount()
      await vi.advanceTimersByTimeAsync(15_000)
      const failedFrame = iframe()

      const retry = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Δοκίμασε ξανά'))!
      retry.click()
      await vi.advanceTimersByTimeAsync(0)

      // Reassigning the same `src` does not reload a frame that failed.
      expect(iframe()).not.toBe(failedFrame)
      expect(bodyText()).toContain(LOADING())
      expect(bodyText()).not.toContain(FAILED)

      await vi.advanceTimersByTimeAsync(15_000)
      expect(bodyText()).toContain(FAILED)
    })
  })

  it('closes from the header\'s close button', async () => {
    const wrapper = await mount()

    const close = document.querySelector<HTMLButtonElement>('button[aria-label="Κλείσιμο"]')!
    close.click()
    await flushPromises()

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })
})
