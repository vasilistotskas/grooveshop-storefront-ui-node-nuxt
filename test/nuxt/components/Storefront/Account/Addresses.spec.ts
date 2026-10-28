import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { getQuery } from 'h3'
import AddressesPage from '~/components/Storefront/Account/Addresses.vue'
import WebsideAddressesPage from '~/components/variants/webside/Storefront/Account/Addresses.vue'
import { makeUserAddress } from '~~/test/fixtures/user'
import { trees } from '~~/test/helpers/trees'

/**
 * The saved addresses (`useAccountAddresses`, shared by both trees): one
 * request under one key, a card per address, a way to add one through the
 * address form's page, and a reload after a card deletes one. The default
 * asks for the default address first, as checkout offers them, 50 to a
 * page; the webside page sorts by what the shopper picked, 8 to a page.
 */
const state = vi.hoisted(() => ({ addresses: [] as unknown[] }))
mockNuxtImport('useRoute', () => () => ({ name: 'account-addresses___el', params: {}, query: {}, path: '/account/addresses', fullPath: '/account/addresses', hash: '', meta: {}, matched: [] }))

const asked: Record<string, unknown>[] = []

beforeEach(() => {
  asked.length = 0
  state.addresses = [makeUserAddress({ id: 1, title: 'Σπίτι' }), makeUserAddress({ id: 2, title: 'Γραφείο' })]
  clearNuxtData('account-addresses')
  registerEndpoint('/api/user/addresses', (event) => {
    asked.push(getQuery(event))
    return { count: state.addresses.length, results: state.addresses }
  })
  registerEndpoint('/api/user/addresses/1', {
    method: 'DELETE',
    handler: () => {
      state.addresses = state.addresses.slice(1)
      return null
    },
  })
})

/** What each tree asks for and how it words things (el). */
const OWN = {
  default: { query: { pageSize: '50', ordering: '-isMain,-createdAt' }, empty: 'Καμία αποθηκευμένη διεύθυνση', deleteName: 'Διαγραφή της διεύθυνσης «Σπίτι»' },
  webside: { query: { pageSize: '8', ordering: '-createdAt' }, empty: 'Δεν έχεις καμία διεύθυνση', deleteName: 'Διαγραφή' },
}

describe.each(trees(AddressesPage, WebsideAddressesPage))('$tree Storefront/Account/Addresses', ({ tree, C }) => {
  const own = OWN[tree]

  async function mountPage() {
    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()
    return wrapper
  }
  const cards = async (wrapper: VueWrapper) => {
    await vi.waitFor(() => expect(wrapper.text()).toContain('Σπίτι'))
    return wrapper
  }

  it('asks for the addresses the way its page lists them', async () => {
    await mountPage()

    expect(asked[0]).toMatchObject(own.query)
  })

  it('shows a card per address and a way to add one', async () => {
    const wrapper = await cards(await mountPage())

    expect(wrapper.text()).toContain('Γραφείο')
    expect(wrapper.findAll('a').some(link => link.attributes('href') === useLocalePath()('account-addresses-new'))).toBe(true)
  })

  it('reloads the list when a card deletes an address', async () => {
    const wrapper = await cards(await mountPage())
    const requests = asked.length

    await wrapper.findAll('button, a').find(control => control.text() === own.deleteName || control.attributes('aria-label') === own.deleteName)!.trigger('click')
    await vi.waitFor(() => expect(asked.length).toBeGreaterThan(requests))
    await flushPromises()

    expect(wrapper.text()).not.toContain('Σπίτι')
    expect(wrapper.text()).toContain('Γραφείο')
  })

  it('invites a shopper without addresses to save one', async () => {
    state.addresses = []

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain(own.empty)
  })
})
