import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { CalendarDate } from '@internationalized/date'
import LoyaltyTransactions from '~/components/Loyalty/Transactions.vue'
import { makeTransactionPage } from '~~/test/fixtures/loyalty'
import { failWith } from '~~/test/helpers/api'

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

const cells = (wrapper: VueWrapper, index: number) => rows(wrapper)[index]!.findAll('td')
const badgeColours = (wrapper: VueWrapper) =>
  wrapper.findAllComponents({ name: 'UBadge' }).map(badge => badge.props('color'))

describe('Loyalty/Transactions', () => {
  it('lists each transaction: date, description, type and signed points', async () => {
    const wrapper = await mountLedger()
    const { n } = useNuxtApp().$i18n

    expect(rows(wrapper)).toHaveLength(3)
    expect(rows(wrapper).map(row => row.findAll('td').map(cell => cell.text()).filter((_, index) => index > 0))).toEqual([
      [expect.stringContaining('Πόντοι από την παραγγελία #12345'), 'Κέρδος', n(100, { signDisplay: 'always' })],
      [expect.stringContaining('Εξαργύρωση για έκπτωση'), 'Εξαργύρωση', n(-50, { signDisplay: 'always' })],
      [expect.stringContaining('Μπόνους γενεθλίων'), 'Μπόνους', n(25, { signDisplay: 'always' })],
    ])
    expect([0, 1, 2].map(index => cells(wrapper, index)[0]!.find('time').attributes('datetime'))).toEqual([
      '2026-01-15T10:30:00.000Z',
      '2026-01-14T15:45:00.000Z',
      '2026-01-13T09:00:00.000Z',
    ])
  })

  it('repeats the date under the description for the phone layout, where the date column is hidden', async () => {
    const wrapper = await mountLedger()

    expect(cells(wrapper, 0)[1]!.find('time').attributes('datetime')).toBe('2026-01-15T10:30:00.000Z')
  })

  it('draws gains in the success colour and everything else in ink', async () => {
    // The class IS the contract: a semantic colour as TEXT is only legal
    // where Volt's token passes 4.5:1 on white, and a loss stays ink.
    const wrapper = await mountLedger()
    const pointsCell = (index: number) => cells(wrapper, index)[3]!.find('span')

    expect(pointsCell(0).classes()).toContain('text-success')
    expect(pointsCell(1).classes()).not.toContain('text-success')
    expect(pointsCell(1).classes()).toContain('text-highlighted')
  })

  it('tints the type badge by what the type is, not by the sign of the points', async () => {
    api.routes({
      [LEDGER]: makeTransactionPage([
        { transactionType: 'EARN' },
        { transactionType: 'REDEEM', points: -50 },
        { transactionType: 'BONUS' },
        { transactionType: 'EXPIRE', points: -10 },
        { transactionType: 'ADJUST', points: 5 },
      ]),
    })

    const wrapper = await mountLedger()

    expect(badgeColours(wrapper).filter(color => color !== undefined)).toEqual([
      'success', 'neutral', 'info', 'warning', 'neutral',
    ])
  })

  it('labels a type it does not know by its raw code, in a neutral badge', async () => {
    // A transaction type Django adds before the storefront knows it.
    api.routes({ [LEDGER]: makeTransactionPage([{ transactionType: 'LEGACY' as 'EARN' }]) })

    const wrapper = await mountLedger()

    expect(cells(wrapper, 0)[2]!.text()).toBe('LEGACY')
    expect(wrapper.findComponent({ name: 'UBadge' }).props('color')).toBe('neutral')
  })

  describe('filters', () => {
    it('asks for the first page with no filters to start with', async () => {
      await mountLedger()

      expect(lastQuery()).toEqual({ page: 1 })
    })

    it('offers "all types" and every type of the API enum', async () => {
      const wrapper = await mountLedger()

      const values = wrapper.findComponent({ name: 'USelect' }).props('items').map((item: { value: string }) => item.value)
      expect(values).toEqual(['all', ...zTransactionTypeEnum.options])
    })

    it('sends the chosen type and date range to Django', async () => {
      const wrapper = await mountLedger()

      await wrapper.findComponent({ name: 'USelect' }).setValue('REDEEM')
      // A pick in each date field, as the shopper makes it.
      const [from, to] = wrapper.findAllComponents({ name: 'UInputDate' })
      await from!.setValue(new CalendarDate(2026, 1, 1))
      await to!.setValue(new CalendarDate(2026, 1, 31))

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
      ['start date', (wrapper: VueWrapper) => wrapper.findAllComponents({ name: 'UInputDate' })[0]!.setValue(new CalendarDate(2026, 1, 1))],
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
    api.routes({ [LEDGER]: failWith(502) })
    const wrapper = await mountLedger()
    expect(wrapper.get('[role="alert"]').text()).toContain('Δεν μπορέσαμε να φορτώσουμε τις συναλλαγές σου.')

    api.routes({ [LEDGER]: makeTransactionPage([{ description: 'Ξανά εδώ' }]) })
    await wrapper.findAll('button').find(button => button.text() === 'Δοκίμασε ξανά')!.trigger('click')
    await flushPromises()

    expect(api.callsTo(LEDGER)).toHaveLength(2)
    expect(wrapper.text()).toContain('Ξανά εδώ')
  })
})
