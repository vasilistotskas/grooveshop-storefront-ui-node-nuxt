import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { nextTick, reactive } from 'vue'
import AcsAddressSuggestion from '~/components/Checkout/AcsAddressSuggestion.vue'
import WebsideAcsAddressSuggestion from '~/components/variants/webside/Checkout/AcsAddressSuggestion.vue'
import { trees } from '~~/test/helpers/trees'

/**
 * "Did you mean …" under the checkout address: once street, number,
 * postcode and city are all typed, ACS's address validation runs, and a
 * cleaner spelling is offered as a chip the shopper can apply. Applying
 * it also stashes ACS's routing hints on the form for the voucher.
 * Failures are silent by design — they live in the composable.
 *
 * `useAcsAddressValidation` (its 600 ms debounce and request) is the
 * boundary here and is mocked; the chip's own logic — when to ask, when
 * a suggestion is worth showing, what applying writes — is what these
 * tests pin. Both trees carry byte-identical copies.
 */

const acs = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    resolved: ref<Record<string, unknown> | null>(null),
    isLoading: ref(false),
    errorMessage: ref<string | null>(null),
    validate: vi.fn(),
    cancel: vi.fn(),
  }
})
mockNuxtImport('useAcsAddressValidation', () => () => acs)

const TYPED = { street: 'Pireos', streetNumber: '25', zipcode: '11111', city: 'Ταύρος' }

const RESOLVED = {
  resolvedStreet: 'ΠΕΙΡΑΙΩΣ',
  resolvedStreetNum: '25',
  resolvedZip: '17778',
  resolvedArea: 'ΤΑΥΡΟΣ',
  resolvedProvidence: 'ΑΤΤΙΚΗΣ',
  resolvedLat: 37.96,
  resolvedLong: 23.7,
  resolvedStationId: 'ΑΘ',
  resolvedBranchId: 12,
  geoId: 99,
  addressId: 'A-1',
}

const t = (key: string): string => useNuxtApp().$i18n.t(key)

describe.each(trees(AcsAddressSuggestion, WebsideAcsAddressSuggestion))('$tree Checkout/AcsAddressSuggestion', ({ C }) => {
  beforeEach(() => {
    acs.resolved.value = null
    acs.isLoading.value = false
    acs.errorMessage.value = null
  })

  const mount = (formState: Record<string, any>, enabled = true) =>
    mountSuspended(C, { route: false, props: { formState, enabled } })

  const hasChip = (wrapper: Awaited<ReturnType<typeof mount>>) =>
    wrapper.text().includes(t('shipping.acs.address_suggestion.title'))

  describe('when it asks ACS', () => {
    it('asks with the four fields joined once all of them are typed', async () => {
      await mount(reactive({ street: 'Πειραιώς', streetNumber: '25', zipcode: '17778', city: 'Ταύρος' }))

      expect(acs.validate).toHaveBeenCalledWith('Πειραιώς 25 17778 Ταύρος')
    })

    it('waits while any field is empty, and asks the moment the last one is typed', async () => {
      const formState = reactive({ street: 'Πειραιώς', streetNumber: '', zipcode: '17778', city: 'Ταύρος' })
      await mount(formState)
      expect(acs.validate).not.toHaveBeenCalled()

      formState.streetNumber = '25'
      await nextTick()

      expect(acs.validate).toHaveBeenCalledWith('Πειραιώς 25 17778 Ταύρος')
    })

    it('never asks when switched off, and cancels anything in flight', async () => {
      await mount(reactive({ ...TYPED }), false)

      expect(acs.validate).not.toHaveBeenCalled()
      expect(acs.cancel).toHaveBeenCalled()
    })

    it('cancels a pending lookup when it unmounts', async () => {
      const wrapper = await mount(reactive({ ...TYPED }))
      acs.cancel.mockClear()

      wrapper.unmount()

      expect(acs.cancel).toHaveBeenCalled()
    })
  })

  describe('the suggestion', () => {
    it('offers ACS\'s spelling when it differs from what was typed', async () => {
      acs.resolved.value = RESOLVED
      const wrapper = await mount(reactive({ ...TYPED }))

      expect(hasChip(wrapper)).toBe(true)
      expect(wrapper.text()).toContain('ΠΕΙΡΑΙΩΣ 25, 17778 ΤΑΥΡΟΣ')
    })

    it('stays hidden when ACS agrees with the typed address, whatever the case', async () => {
      acs.resolved.value = { ...RESOLVED, resolvedStreet: 'πειραιώς', resolvedZip: '17778' }
      const wrapper = await mount(reactive({ street: 'Πειραιώς ', streetNumber: '25', zipcode: '17778', city: 'Ταύρος' }))

      expect(hasChip(wrapper)).toBe(false)
    })

    it('says it is checking while the lookup runs', async () => {
      acs.isLoading.value = true
      const wrapper = await mount(reactive({ ...TYPED }))

      expect(wrapper.text()).toContain(t('shipping.acs.address_suggestion.checking'))
    })

    it('applies the spelling to the visible fields, keeps the city, and stores ACS\'s routing hints', async () => {
      acs.resolved.value = RESOLVED
      const formState = reactive<Record<string, any>>({ ...TYPED })
      const wrapper = await mount(formState)

      await wrapper.findAll('button').find(b => b.text() === t('shipping.acs.address_suggestion.apply'))!.trigger('click')

      expect(formState).toMatchObject({
        street: 'ΠΕΙΡΑΙΩΣ',
        streetNumber: '25',
        zipcode: '17778',
        // `resolvedArea` is the neighbourhood, not the city.
        city: 'Ταύρος',
        acsResolvedAddress: {
          geoId: 99,
          lat: 37.96,
          lng: 23.7,
          stationId: 'ΑΘ',
          branchId: 12,
          providence: 'ΑΤΤΙΚΗΣ',
          addressId: 'A-1',
        },
      })
      // Applied: what is typed now matches, so the chip goes away.
      expect(hasChip(wrapper)).toBe(false)
    })
  })
})
