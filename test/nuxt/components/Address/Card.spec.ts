import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { UserAddress } from '~~/shared/openapi/types.gen'
import AddressCard from '~/components/Address/Card.vue'
import { FIXTURE_TIMESTAMP, fixtureUuid } from '~~/test/fixtures/product'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const { toastAdd } = vi.hoisted(() => ({ toastAdd: vi.fn() }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

function makeAddress(overrides: Partial<UserAddress> = {}): UserAddress {
  const id = overrides.id ?? 5
  return {
    id,
    title: 'Σπίτι',
    firstName: 'Μαρία',
    lastName: 'Παπαδοπούλου',
    street: 'Ερμού',
    streetNumber: '12',
    city: 'Αθήνα',
    zipcode: '10563',
    floor: '',
    locationType: '',
    phone: '+306912345678',
    notes: '',
    isMain: false,
    user: 7,
    country: 'GR',
    region: 'GR-I',
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    uuid: fixtureUuid(11, id),
    ...overrides,
  }
}

/**
 * The card deletes through ofetch hooks, so a route answers by calling
 * the hook ofetch would call. On an error ofetch would also reject,
 * which the card does not catch (reported as a bug: the spinner stays
 * and the rejection is unhandled), so the error route stops at the hook.
 */
const respondOk = (_url: string, options: any) => options.onResponse?.({ response: { ok: true } })
const respondError = (_url: string, options: any) => options.onResponseError?.({ response: { _data: {} } })

const mountCard = (address = makeAddress()) =>
  mountSuspended(AddressCard, { props: { address }, route: false })
const deleteButton = (wrapper: Awaited<ReturnType<typeof mountCard>>) =>
  wrapper.findAll('button').find(button => button.text() === 'Διαγραφή')!

describe('Address/Card', () => {
  it('lists the address\'s recipient, street, town, country and phone, and links to its edit page', async () => {
    const wrapper = await mountCard(makeAddress({ floor: 'SECOND_FLOOR', notes: 'Κουδούνι 3' }))

    expect(wrapper.find('h3').text()).toBe('Σπίτι')
    const text = wrapper.text()
    for (const line of ['Μαρία Παπαδοπούλου', 'Ερμού 12', 'Αθήνα 10563', 'GR GR-I', '+306912345678', 'Κουδούνι 3']) {
      expect(text).toContain(line)
    }
    expect(wrapper.get('a').attributes('href')).toBe('/account/addresses/5/edit')
    expect(text).not.toContain('Κύρια διεύθυνση')
  })

  it('refuses to delete the main address, without asking the server', async () => {
    const wrapper = await mountCard(makeAddress({ isMain: true }))
    expect(wrapper.text()).toContain('Κύρια διεύθυνση')

    await deleteButton(wrapper).trigger('click')
    await flushPromises()

    expect(api.callsTo('/api/user/addresses/*')).toHaveLength(0)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(toastAdd.mock.calls[0]![0].title).toMatch(/^Δεν μπορείς να διαγράψεις την κύρια διεύθυνσή σου/)
  })

  it('deletes another address, confirms it and tells the list which one went', async () => {
    api.routes({ '/api/user/addresses/5': respondOk })
    const wrapper = await mountCard()

    await deleteButton(wrapper).trigger('click')
    await flushPromises()

    expect(api.callsTo('/api/user/addresses/5')).toEqual([
      { url: '/api/user/addresses/5', options: expect.objectContaining({ method: 'DELETE' }) },
    ])
    expect(toastAdd).toHaveBeenCalledWith({ title: 'Η διεύθυνση διαγράφηκε', color: 'success' })
    expect(wrapper.emitted('address-delete')).toEqual([[5]])
  })

  it('says so when the server refuses, and keeps the address', async () => {
    api.routes({ '/api/user/addresses/5': respondError })
    const wrapper = await mountCard()

    await deleteButton(wrapper).trigger('click')
    await flushPromises()

    expect(toastAdd).toHaveBeenCalledWith({ title: 'Η διεύθυνση δεν διαγράφηκε', color: 'error' })
    expect(wrapper.emitted('address-delete')).toBeUndefined()
  })
})
