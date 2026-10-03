import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { getQuery } from 'h3'
import AddressesPage from '~/components/Storefront/Account/Addresses.vue'
import { makeUserAddress } from '~~/test/fixtures/user'

/**
 * The saved addresses as cards, the default first (checkout's order), a
 * new one through the address form's page, and a reload after a card
 * changes one.
 */
const state = vi.hoisted(() => ({ addresses: [] as unknown[] }))
mockNuxtImport('useRoute', () => () => ({ name: 'account-addresses___el', params: {}, query: {}, path: '/account/addresses', fullPath: '/account/addresses', hash: '', meta: {}, matched: [] }))

const asked: Record<string, unknown>[] = []

/** The card is covered by its own spec; here it only names the address and reports a change. */
const CardStub = defineComponent({
  props: { address: { type: Object, required: true } },
  emits: ['changed'],
  setup(props, { emit }) {
    return () => h('button', { 'data-card': '', 'onClick': () => emit('changed') }, (props.address as { title: string }).title)
  },
})

beforeEach(() => {
  asked.length = 0
  state.addresses = [makeUserAddress({ id: 1, title: 'Σπίτι' }), makeUserAddress({ id: 2, title: 'Γραφείο' })]
  clearNuxtData('account-addresses')
  registerEndpoint('/api/user/addresses', (event) => {
    asked.push(getQuery(event))
    return { count: state.addresses.length, results: state.addresses }
  })
})

async function mountPage() {
  const wrapper = await mountSuspended(AddressesPage, { global: { stubs: { AddressCard: CardStub } } })
  await flushPromises()
  return wrapper
}

describe('Storefront/Account/Addresses', () => {
  it('asks for the addresses default first, as checkout offers them', async () => {
    await mountPage()

    expect(asked[0]).toMatchObject({ pageSize: '50', ordering: '-isMain,-createdAt' })
  })

  it('shows a card per address and a way to add one', async () => {
    const wrapper = await mountPage()

    expect(wrapper.findAll('[data-card]').map(card => card.text())).toEqual(['Σπίτι', 'Γραφείο'])
    expect(wrapper.findAll('a').some(link => link.attributes('href') === useLocalePath()('account-addresses-new'))).toBe(true)
  })

  it('reloads the list when a card changes an address', async () => {
    const wrapper = await mountPage()

    await wrapper.get('[data-card]').trigger('click')
    await flushPromises()

    expect(asked).toHaveLength(2)
  })

  it('invites a shopper without addresses to save one', async () => {
    state.addresses = []

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Καμία αποθηκευμένη διεύθυνση')
  })
})
