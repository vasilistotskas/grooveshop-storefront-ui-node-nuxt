import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { reactive } from 'vue'
import SelectedBoxNowLocker from '~/components/Checkout/SelectedBoxNowLocker.vue'
import WebsideSelectedBoxNowLocker from '~/components/variants/webside/Checkout/SelectedBoxNowLocker.vue'
import { boxNowWidgetMessage, makeBoxNowSelectedLocker } from '~~/test/fixtures/boxnow'
import { trees } from '~~/test/helpers/trees'

/**
 * The BoxNow block of the shipping step: a "pick a locker" button, or a
 * summary card of the picked one with a "change" button. Either opens
 * the widget (`CheckoutBoxNowLockerPicker`), which is always mounted so
 * its `postMessage` listener is live; the widget's pick is written back
 * into the checkout form. Both trees carry byte-identical copies.
 */

function makeFormState(overrides: Record<string, unknown> = {}) {
  return reactive<Record<string, any>>({
    shippingMethod: 'box_now_locker',
    country: 'GR',
    boxnowLockerId: '',
    boxnowLocker: null,
    ...overrides,
  })
}

const picked = (overrides = {}) => makeFormState({ boxnowLockerId: '4', boxnowLocker: makeBoxNowSelectedLocker(overrides) })

const t = (key: string): string => useNuxtApp().$i18n.t(key)

describe.each(trees(SelectedBoxNowLocker, WebsideSelectedBoxNowLocker))('$tree Checkout/SelectedBoxNowLocker', ({ C }) => {
  async function mount(formState = makeFormState()) {
    return mountSuspended(C, { route: false, props: { formState, partnerId: '10391' } })
  }

  const widget = (wrapper: VueWrapper) => wrapper.findComponent({ name: 'CheckoutBoxNowLockerPicker' })
  const buttonText = (wrapper: VueWrapper) => wrapper.findAll('button').map(b => b.text())

  describe('before a locker is picked', () => {
    it('offers only the "pick a locker" button, with the widget closed', async () => {
      const wrapper = await mount()

      expect(buttonText(wrapper)).toContain(t('shipping.boxnow.select_locker'))
      expect(buttonText(wrapper)).not.toContain(t('shipping.boxnow.change_locker'))
      expect(wrapper.text()).not.toContain(t('shipping.boxnow.selected_locker.title'))
      expect(widget(wrapper).props('open')).toBe(false)
    })

    it('opens the widget from that button', async () => {
      const wrapper = await mount()

      await wrapper.findAll('button').find(b => b.text() === t('shipping.boxnow.select_locker'))!.trigger('click')

      expect(widget(wrapper).props('open')).toBe(true)
    })

    it('opens the widget on the delivery country\'s map', async () => {
      const wrapper = await mount(makeFormState({ country: 'CY' }))

      expect(widget(wrapper).props()).toMatchObject({ countryCode: 'CY', partnerId: '10391' })
    })
  })

  describe('with a locker picked', () => {
    it('summarises the locker: name, address, postcode and id', async () => {
      const wrapper = await mount(picked({ boxnowLockerAddressLine2: 'Ισόγειο', boxnowLockerNote: 'Δίπλα στο περίπτερο' }))

      const text = wrapper.text()
      for (const part of ['Χαλάνδρι ΟΠΑΠ Play', 'Λεωφ. Πεντέλης 125', 'Ισόγειο', '15234', 'Δίπλα στο περίπτερο', `${t('shipping.boxnow.selected_locker.id_label')}: 4`]) {
        expect(text).toContain(part)
      }
      expect(buttonText(wrapper)).not.toContain(t('shipping.boxnow.select_locker'))
    })

    it('names the locker by its id when the widget sent no name', async () => {
      const wrapper = await mount(makeFormState({
        boxnowLockerId: '4',
        boxnowLocker: makeBoxNowSelectedLocker({ boxnowLockerName: undefined }),
      }))

      const header = wrapper.find('[data-slot="header"]').text()
      expect(header.replace(t('shipping.boxnow.selected_locker.title'), '').trim()).toBe('4')
    })

    it('reopens the widget from "change locker"', async () => {
      const wrapper = await mount(picked())

      await wrapper.findAll('button').find(b => b.text() === t('shipping.boxnow.change_locker'))!.trigger('click')

      expect(widget(wrapper).props('open')).toBe(true)
    })
  })

  it('writes the locker the widget posts into the checkout form', async () => {
    const formState = makeFormState()
    const wrapper = await mount(formState)

    window.dispatchEvent(new MessageEvent('message', {
      origin: 'https://widget-v5.boxnow.gr',
      data: boxNowWidgetMessage({ boxnowLockerId: '7', boxnowLockerName: 'Κολωνός', boxnowLockerAddressLine1: 'Πατησίων 42' }),
    }))
    await flushPromises()

    expect(formState.boxnowLockerId).toBe('7')
    expect(formState.boxnowLocker).toEqual(makeBoxNowSelectedLocker({
      boxnowLockerId: '7',
      boxnowLockerName: 'Κολωνός',
      boxnowLockerAddressLine1: 'Πατησίων 42',
    }))
    expect(wrapper.text()).toContain('Κολωνός')
  })
})
