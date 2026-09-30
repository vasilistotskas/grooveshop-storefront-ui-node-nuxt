import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import LoyaltyTransactions from '~/components/Loyalty/Transactions.vue'
import { makeTransactionPage } from '~~/test/fixtures/loyalty'

/**
 * The account's points ledger. Mocked at the request (`useRequestApi`,
 * which `useLoyalty` fetches through), so the filters are checked by
 * the query they actually send.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('useRequestApi', () => () => api)

const LEDGER = '/api/loyalty/transactions'

beforeEach(() => {
  clearNuxtData('loyalty-transactions')
  api.routes({
    [LEDGER]: makeTransactionPage([
      { points: 100, transactionType: 'EARN', description: 'Πόντοι από την παραγγελία #12345', createdAt: '2026-01-15T10:30:00Z' },
      { points: -50, transactionType: 'REDEEM', referenceOrder: null, description: 'Εξαργύρωση για έκπτωση', createdAt: '2026-01-14T15:45:00Z' },
      { points: 25, transactionType: 'BONUS', referenceOrder: null, description: 'Μπόνους γενεθλίων', createdAt: '2026-01-13T09:00:00Z' },
    ]),
  })
})

/**
 * Unmount after each test instead of leaving it to the next
 * `mountSuspended`: the ledger's `useAsyncData` key is shared, and a
 * still-mounted instance from the previous test kept the new one's
 * filter watch from refetching.
 */

async function mountLedger() {
  const wrapper = await mountSuspended(LoyaltyTransactions, { route: false })
  await flushPromises()
  return wrapper
}

const rows = (wrapper: VueWrapper) => wrapper.findAll('tbody tr')
const lastQuery = () => api.callsTo(LEDGER).at(-1)?.options.query
/**
 * A filter change refetches through `useAsyncData`'s `watch`, which
 * lands after more than one microtask flush — so wait for the request.
 */
const expectLastQuery = (query: Record<string, unknown>) =>
  vi.waitFor(() => expect(lastQuery()).toEqual(query))

describe('Loyalty/Transactions', () => {
  it('lists each transaction: signed points, type, description and its timestamp', async () => {
    const wrapper = await mountLedger()

    expect(rows(wrapper).map(row => row.findAll('td').map(cell => cell.text()).slice(0, 3))).toEqual([
      ['+100', 'Κέρδος', 'Πόντοι από την παραγγελία #12345'],
      ['-50', 'Εξαργύρωση', 'Εξαργύρωση για έκπτωση'],
      ['+25', 'Μπόνους', 'Μπόνους γενεθλίων'],
    ])
    expect(rows(wrapper).map(row => row.find('time').attributes('datetime'))).toEqual([
      '2026-01-15T10:30:00.000Z',
      '2026-01-14T15:45:00.000Z',
      '2026-01-13T09:00:00.000Z',
    ])
  })

  it('colours the points by sign, a shade darker than the fill token', async () => {
    // The class IS the contract: `text-success-700` rather than
    // `text-success` because the 500 fill measured 3.22:1 on the figure
    // (see the comment on the points column in Transactions.vue).
    const wrapper = await mountLedger()
    const pointsCell = (index: number) => rows(wrapper)[index]!.find('td span')

    expect(pointsCell(0).classes()).toContain('text-success-700')
    expect(pointsCell(1).classes()).toContain('text-error-700')
    expect(pointsCell(1).classes()).not.toContain('text-success-700')
  })

  it('labels a type it does not know by its raw code', async () => {
    // A transaction type Django adds before the storefront knows it.
    api.routes({ [LEDGER]: makeTransactionPage([{ transactionType: 'LEGACY' as 'EARN' }]) })

    const wrapper = await mountLedger()

    expect(rows(wrapper)[0]!.findAll('td')[1]!.text()).toBe('LEGACY')
  })

  describe('filters', () => {
    it('asks for the first page with no filters to start with', async () => {
      await mountLedger()

      expect(lastQuery()).toEqual({ page: 1 })
    })

    it('sends the chosen type and date range to Django', async () => {
      const wrapper = await mountLedger()

      await wrapper.findComponent({ name: 'USelect' }).setValue('REDEEM')
      const [from, to] = wrapper.findAll('input[type="date"]')
      await from!.setValue('2026-01-01')
      await to!.setValue('2026-01-31')

      await expectLastQuery({
        page: 1,
        transaction_type: 'REDEEM',
        created_after: '2026-01-01',
        created_before: '2026-01-31',
      })
    })

    it('drops the type filter again for "all types"', async () => {
      const wrapper = await mountLedger()
      const select = wrapper.findComponent({ name: 'USelect' })

      await select.setValue('EARN')
      await expectLastQuery({ page: 1, transaction_type: 'EARN' })
      await select.setValue('all')

      await expectLastQuery({ page: 1 })
    })
  })

  describe('pagination', () => {
    beforeEach(() => {
      api.routes({ [LEDGER]: makeTransactionPage([{}], { count: 30 }) })
    })

    const pageButton = (wrapper: VueWrapper, page: number) => wrapper.find(`nav button[aria-label="Page ${page}"]`)

    it('asks for the page clicked', async () => {
      const wrapper = await mountLedger()

      await pageButton(wrapper, 2).trigger('click')

      await expectLastQuery({ page: 2 })
    })

    it.each([
      ['type', (wrapper: VueWrapper) => wrapper.findComponent({ name: 'USelect' }).setValue('EARN')],
      ['start date', (wrapper: VueWrapper) => wrapper.findAll('input[type="date"]')[0]!.setValue('2026-01-01')],
    ])('goes back to page 1 when the %s filter changes', async (_filter, change) => {
      const wrapper = await mountLedger()
      await pageButton(wrapper, 3).trigger('click')
      await expectLastQuery({ page: 3 })

      await change(wrapper)

      await vi.waitFor(() => expect(lastQuery()).toMatchObject({ page: 1 }))
      expect(pageButton(wrapper, 1).attributes('aria-current')).toBe('page')
    })

    it('pages 12 rows at a time when Django does not say', async () => {
      api.routes({ [LEDGER]: makeTransactionPage([{}], { count: 24, pageSize: undefined, totalPages: 2 }) })

      const wrapper = await mountLedger()

      expect(pageButton(wrapper, 2).exists()).toBe(true)
      expect(pageButton(wrapper, 3).exists()).toBe(false)
    })

    it('shows no pagination for a single page', async () => {
      api.routes({ [LEDGER]: makeTransactionPage([{}]) })

      const wrapper = await mountLedger()

      expect(wrapper.find('nav').exists()).toBe(false)
    })
  })

  it('says so when there are no transactions', async () => {
    api.routes({ [LEDGER]: makeTransactionPage([]) })

    const wrapper = await mountLedger()

    expect(wrapper.text()).toContain('Δεν βρέθηκαν συναλλαγές')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('shows skeletons while the ledger loads', async () => {
    api.routes({ [LEDGER]: () => new Promise(() => {}) })

    const wrapper = await mountLedger()

    expect(wrapper.findAllComponents({ name: 'USkeleton' })).toHaveLength(4)
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('offers a retry that asks again when the ledger fails', async () => {
    api.routes({ [LEDGER]: () => { throw Object.assign(new Error('Bad Gateway'), { statusCode: 502 }) } })
    const wrapper = await mountLedger()
    expect(wrapper.text()).toContain('Αποτυχία φόρτωσης συναλλαγών')

    api.routes({ [LEDGER]: makeTransactionPage([{ description: 'Ξανά εδώ' }]) })
    await wrapper.findAll('button').find(button => button.text() === 'Δοκιμάστε ξανά')!.trigger('click')
    await flushPromises()

    expect(api.callsTo(LEDGER)).toHaveLength(2)
    expect(wrapper.text()).toContain('Ξανά εδώ')
  })
})
