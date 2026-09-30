import { describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { defineComponent, h, reactive } from 'vue'
import CheckoutSelectedGenericLocker from '~/components/Checkout/SelectedGenericLocker.vue'
import WebsideCheckoutSelectedGenericLocker from '~/components/variants/webside/Checkout/SelectedGenericLocker.vue'
import acsCarrier from '~~/shared/shipping/providers/acs'
import type { Locker } from '~~/shared/shipping/interfaces'
import { trees } from '~~/test/helpers/trees'

/**
 * The selected-locker card for carriers on the generic picker (ACS).
 * It knows nothing about the carrier's form keys: it reads the pick
 * through the adapter's `readSelectedLocker` and writes a new one
 * through `applyToFormState` — the real ACS adapter here, so a pick
 * lands on the keys the order-create payload reads. The picker modal
 * is its own spec; it is stubbed, and its `selected` event is the
 * contract. The trees differ only in the picker's `Webside` prefix.
 */
const t = (key: string, params: Record<string, unknown> = {}) => useNuxtApp().$i18n.t(key, params)

const LOCKER: Locker = {
  id: 'GR-1001',
  branchCode: 'ATH',
  name: 'ACS Smartpoint Σύνταγμα',
  addressLine1: 'Φιλελλήνων 4',
  addressLine2: null,
  city: 'Αθήνα',
  postalCode: '10557',
  countryCode: 'GR',
  lat: 37.97,
  lng: 23.73,
  workingHours: '08:00-20:00',
  raw: {},
}

const PickerStub = defineComponent({
  name: 'PickerStub',
  props: ['open', 'carrier', 'initialPostalCode', 'initialCity', 'countryCode'],
  emits: ['update:open', 'selected'],
  render: () => h('div'),
})

describe.each(trees(CheckoutSelectedGenericLocker, WebsideCheckoutSelectedGenericLocker))('$tree Checkout/SelectedGenericLocker', ({ C, own }) => {
  /** Mounted once the lazy picker chunk has resolved (the stub matches the inner component). */
  async function mount(formState: Record<string, unknown>) {
    const wrapper = await mountSuspended(C, {
      route: false,
      props: {
        'formState': formState,
        'onUpdate:formState': () => {},
        'carrier': acsCarrier,
        'initialPostalCode': '10557',
        'initialCity': 'Αθήνα',
        'countryCode': 'GR',
      },
      global: { stubs: { [own('CheckoutGenericLockerPicker')]: PickerStub } },
    })
    await vi.waitFor(() => expect(wrapper.findComponent(PickerStub).exists()).toBe(true))
    return wrapper
  }
  const picker = (wrapper: VueWrapper) => wrapper.findComponent(PickerStub)
  const buttonNamed = (wrapper: VueWrapper, name: string) =>
    wrapper.findAll('button').find(b => b.text() === name)!

  it('offers to choose a locker, naming the carrier, and opens the picker on it', async () => {
    const wrapper = await mount({})

    expect(picker(wrapper).props('open')).toBe(false)
    await buttonNamed(wrapper, t('shipping.locker_picker.choose', { carrier: 'ACS Courier' })).trigger('click')

    expect(picker(wrapper).props('open')).toBe(true)
  })

  it('hands the picker the carrier and the checkout address as its search hint', async () => {
    const wrapper = await mount({})

    expect(picker(wrapper).props()).toMatchObject({
      carrier: acsCarrier,
      initialPostalCode: '10557',
      initialCity: 'Αθήνα',
      countryCode: 'GR',
    })
  })

  it('writes the picked locker through the carrier and shows it', async () => {
    // Reactive, as the checkout form hands it over (`useCheckoutForm`).
    const formState = reactive<Record<string, unknown>>({})
    const wrapper = await mount(formState)

    picker(wrapper).vm.$emit('selected', LOCKER)
    await wrapper.vm.$nextTick()

    expect(formState).toMatchObject({ acsStationExternalId: 'GR-1001', acsStationBranch: 'ATH' })
    const text = wrapper.text()
    expect(text).toContain('ACS Smartpoint Σύνταγμα')
    expect(text).toContain('Φιλελλήνων 4')
    expect(text).toContain('10557 Αθήνα')
    expect(text).toContain('08:00-20:00')
    expect(text).toContain(`${t('shipping.locker_picker.id_label')}: GR-1001`)
  })

  it('shows a locker picked earlier and reopens the picker to change it', async () => {
    const formState: Record<string, unknown> = {}
    acsCarrier.applyToFormState(formState, LOCKER)
    const wrapper = await mount(formState)

    expect(wrapper.text()).toContain('ACS Smartpoint Σύνταγμα')
    await buttonNamed(wrapper, t('shipping.locker_picker.change')).trigger('click')

    expect(picker(wrapper).props('open')).toBe(true)
  })
})
