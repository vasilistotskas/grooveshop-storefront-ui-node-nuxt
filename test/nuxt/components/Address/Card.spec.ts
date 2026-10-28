import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import AddressCard from '~/components/Address/Card.vue'
import WebsideAddressCard from '~/components/variants/webside/Address/Card.vue'
import { makeUserAddress } from '~~/test/fixtures/user'
import { failWith } from '~~/test/helpers/api'
import { trees } from '~~/test/helpers/trees'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const { toastAdd } = vi.hoisted(() => ({ toastAdd: vi.fn() }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

/**
 * One saved address: deleting it (`useAddressRemoval`, shared by both
 * trees) and, in the default's card, its label, the address, Edit and
 * "Set as default". The default address can be neither deleted nor set as
 * the default again, so the default's card offers neither; the webside card
 * offers delete on every address and refuses it on the main one (Django
 * does not refuse it, so `useAddressRemoval` does).
 */
const OWN = {
  default: { deleted: 'Η διεύθυνση διαγράφηκε', deleteName: 'Διαγραφή της διεύθυνσης «Σπίτι»', changedEvent: 'changed' },
  webside: { deleted: 'Η διεύθυνση διαγράφηκε', deleteName: 'Διαγραφή', changedEvent: 'address-delete' },
}

describe.each(trees(AddressCard, WebsideAddressCard))('$tree Address/Card', ({ tree, C }) => {
  const own = OWN[tree]
  const mountCard = (address = makeUserAddress()) =>
    mountSuspended(C, { props: { address }, route: false })
  const button = (wrapper: Awaited<ReturnType<typeof mountCard>>, name: string) =>
    wrapper.findAll('button, a').find(control => control.text() === name || control.attributes('aria-label') === name)

  it('deletes it, says so, then reports the change', async () => {
    api.routes({ '/api/user/addresses/5': {} })
    const wrapper = await mountCard()

    await button(wrapper, own.deleteName)!.trigger('click')
    await flushPromises()

    expect(api.callsTo('/api/user/addresses/5').map(call => call.options?.method)).toEqual(['DELETE'])
    expect(toastAdd).toHaveBeenCalledWith({ title: own.deleted, color: 'success' })
    expect(wrapper.emitted(own.changedEvent)).toHaveLength(1)
  })

  it('reports a refused delete and changes nothing', async () => {
    api.routes({ '/api/user/addresses/5': failWith(400) })
    const wrapper = await mountCard()

    await button(wrapper, own.deleteName)!.trigger('click')
    await flushPromises()

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(wrapper.emitted(own.changedEvent)).toBeUndefined()
  })

  it.runIf(tree === 'webside')('never deletes the main address, and says why', async () => {
    const wrapper = await mountCard(makeUserAddress({ isMain: true }))

    await button(wrapper, own.deleteName)!.trigger('click')
    await flushPromises()

    expect(api.callsTo('/api/user/addresses/5')).toEqual([])
    expect(toastAdd).toHaveBeenCalledWith({
      title: 'Δεν μπορείς να διαγράψεις την κύρια διεύθυνσή σου, όρισε μια άλλη διεύθυνση ως κύρια και ξαναπροσπάθησε.',
      color: 'error',
    })
    expect(wrapper.emitted(own.changedEvent)).toBeUndefined()
  })

  describe.runIf(tree === 'default')('the default card', () => {
    it('shows the label, the name, the street, the postcode with the city and country, and the phone', async () => {
      const wrapper = await mountCard()

      expect(wrapper.get('h2').text()).toBe('Σπίτι')
      expect(wrapper.findAll('address span').map(line => line.text())).toEqual([
        'Μαρία Παπαδοπούλου',
        'Ερμού 12',
        '10563 Αθήνα, Ελλάδα',
        '+306912345678',
      ])
    })

    it('opens the address form for an edit', async () => {
      const wrapper = await mountCard()

      expect(button(wrapper, 'Επεξεργασία της διεύθυνσης «Σπίτι»')?.attributes('href'))
        .toBe(useLocalePath()({ name: 'account-addresses-id-edit', params: { id: 5 } }))
    })

    it('makes it the default through set-main, then reports the change', async () => {
      api.routes({ '/api/user/addresses/5/set-main': {} })
      const wrapper = await mountCard()

      await button(wrapper, 'Ορισμός ως προεπιλογή')!.trigger('click')
      await flushPromises()

      expect(api.callsTo('/api/user/addresses/5/set-main').map(call => call.options?.method)).toEqual(['POST'])
      expect(wrapper.emitted('changed')).toHaveLength(1)
    })

    it('marks the default address and offers neither delete nor set-as-default on it', async () => {
      const wrapper = await mountCard(makeUserAddress({ isMain: true }))

      expect(wrapper.text()).toContain('Προεπιλογή')
      expect(button(wrapper, 'Ορισμός ως προεπιλογή')).toBeUndefined()
      expect(button(wrapper, 'Διαγραφή της διεύθυνσης «Σπίτι»')).toBeUndefined()
    })
  })
})
