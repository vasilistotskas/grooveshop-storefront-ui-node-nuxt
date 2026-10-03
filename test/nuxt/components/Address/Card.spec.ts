import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import AddressCard from '~/components/Address/Card.vue'
import { makeUserAddress } from '~~/test/fixtures/user'
import { failWith } from '~~/test/helpers/api'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const { toastAdd } = vi.hoisted(() => ({ toastAdd: vi.fn() }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

const mountCard = (address = makeUserAddress()) =>
  mountSuspended(AddressCard, { props: { address }, route: false })
const button = (wrapper: Awaited<ReturnType<typeof mountCard>>, name: string) =>
  wrapper.findAll('button, a').find(control => control.text() === name || control.attributes('aria-label') === name)

/**
 * One saved address: its label, the address, Edit, "Set as default"
 * and delete. The default address can be neither deleted nor set as the
 * default again, so it offers neither.
 */
describe('Address/Card', () => {
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

  it('deletes it, then reports the change', async () => {
    api.routes({ '/api/user/addresses/5': {} })
    const wrapper = await mountCard()

    await button(wrapper, 'Διαγραφή της διεύθυνσης «Σπίτι»')!.trigger('click')
    await flushPromises()

    expect(api.callsTo('/api/user/addresses/5').map(call => call.options?.method)).toEqual(['DELETE'])
    expect(wrapper.emitted('changed')).toHaveLength(1)
  })

  it('reports a refused delete and changes nothing', async () => {
    api.routes({ '/api/user/addresses/5': failWith(400) })
    const wrapper = await mountCard()

    await button(wrapper, 'Διαγραφή της διεύθυνσης «Σπίτι»')!.trigger('click')
    await flushPromises()

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(wrapper.emitted('changed')).toBeUndefined()
  })

  it('marks the default address and offers neither delete nor set-as-default on it', async () => {
    const wrapper = await mountCard(makeUserAddress({ isMain: true }))

    expect(wrapper.text()).toContain('Προεπιλογή')
    expect(button(wrapper, 'Ορισμός ως προεπιλογή')).toBeUndefined()
    expect(button(wrapper, 'Διαγραφή της διεύθυνσης «Σπίτι»')).toBeUndefined()
  })
})
