import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockComponent, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { createError, getQuery, readBody } from 'h3'
import { resolve } from 'node:path'
import YAML from 'yaml'
import Notifications from '~/components/Storefront/Account/Notifications.vue'
import { makeNotificationUserDetail } from '~~/test/fixtures/user'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'

/**
 * The account's Notifications page: the shopper's notifications newest
 * first, filtered by read state from the URL, opened (marking an unread
 * one read), flipped read/unread, or all marked read — each followed by a
 * refetch so the list and the unread count stay true. A list that could
 * not load says so rather than "no notifications".
 */
const state = vi.hoisted(() => ({ query: {} as Record<string, string>, rows: [] as unknown[], unseen: 0, fail: false, failMark: false }))
const { navigate } = vi.hoisted(() => ({ navigate: vi.fn((_to: string) => Promise.resolve()) }))

mockNuxtImport('useRoute', () => () => ({ name: 'account-notifications___el', params: {}, query: state.query, path: '/account/notifications', fullPath: '/account/notifications', hash: '', meta: {}, matched: [] }))
mockNuxtImport('navigateTo', () => navigate)
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(true),
  user: ref({ id: 7 }),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

// UTooltip needs UApp's TooltipProvider, which a bare mount does not have.
mockComponent('UTooltip', { template: '<div><slot /></div>' })

const messages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/Storefront/Account/Notifications.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el
const itemMessages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/Account/Notifications/Item.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el

const asked: Record<string, unknown>[] = []
const posted: Record<string, unknown[]> = {}

function mark(path: string) {
  registerEndpoint(`/api/notification/user/${path}`, async (event) => {
    if (state.failMark) throw createError({ statusCode: 502 })
    const body = await readBody(event).catch(() => undefined)
    posted[path] = [...(posted[path] ?? []), body]
    return { success: true }
  })
}

beforeEach(() => {
  asked.length = 0
  Reflect.ownKeys(posted).forEach(key => Reflect.deleteProperty(posted, key))
  navigate.mockClear()
  state.query = {}
  state.fail = false
  state.failMark = false
  state.unseen = 0
  state.rows = [
    makeNotificationUserDetail({ id: 1, seen: false, notification: { id: 11, link: '/account/orders/42', category: 'ORDER', translations: { el: { title: 'Η παραγγελία στάλθηκε', message: 'Το δέμα έφυγε' } } } }),
    makeNotificationUserDetail({ id: 2, seen: true, notification: { id: 12, link: null, category: 'WISHLIST', translations: { el: { title: 'Ξανά σε απόθεμα', message: 'Διαθέσιμο' } } } }),
  ]
  clearNuxtData(['userNotifications7', 'unseenNotificationsCount'])
  registerEndpoint('/api/user/account/7/notifications', (event) => {
    asked.push(getQuery(event))
    if (state.fail) throw createError({ statusCode: 502 })
    return { count: state.rows.length, links: { next: null, previous: null }, results: state.rows }
  })
  registerEndpoint('/api/notification/user/unseen-count', () => ({ count: state.unseen }))
  for (const path of ['mark-as-seen', 'mark-as-unseen', 'mark-all-as-seen']) mark(path)
})

async function mountPage() {
  const wrapper = await mountSuspended(Notifications)
  await flushPromises()
  return wrapper
}

const rowOf = (wrapper: VueWrapper, title: string) => wrapper.findAll('ol > li').find(item => item.text().includes(title))!
const openButton = (wrapper: VueWrapper, title: string) => rowOf(wrapper, title).findAll('button').find(button => button.text().includes(title))!
const tabs = (wrapper: VueWrapper) => wrapper.findAll('[role="tab"]')

describe('Storefront/Account/Notifications', () => {
  it('asks for the newest ten notifications of every read state first', async () => {
    await mountPage()

    expect(asked[0]).toMatchObject({ page: '1', pageSize: '10', ordering: '-createdAt' })
    expect(asked[0]).not.toHaveProperty('seen')
  })

  it.each([
    ['unseen', 'false'],
    ['seen', 'true'],
  ])('asks only for %s notifications when the filter says so', async (filter, seen) => {
    state.query = { filter }

    await mountPage()

    expect(asked[0]).toMatchObject({ seen })
  })

  it('lists each notification with its title and message, the unread one marked', async () => {
    const wrapper = await mountPage()
    const items = wrapper.findAll('ol > li')

    expect(wrapper.get('h1').text()).toBe(messages.title)
    expect(items).toHaveLength(2)
    expect(items[0]!.text()).toContain('Η παραγγελία στάλθηκε')
    expect(items[0]!.text()).toContain('Το δέμα έφυγε')
    expect(items[0]!.text()).toContain(itemMessages.unread)
    expect(items[1]!.text()).not.toContain(itemMessages.unread)
  })

  it('shows how many are unread on the Unread tab', async () => {
    state.unseen = 3

    const wrapper = await mountPage()
    const unreadTab = () => tabs(wrapper).find(tab => tab.text().includes(messages.filters.unseen))!
    await vi.waitFor(() => expect(unreadTab().text()).toContain('3'))

    expect(tabs(wrapper)).toHaveLength(3)
  })

  it('puts the tab chosen into the URL and back on page one', async () => {
    state.query = { page: '3' }
    const wrapper = await mountPage()
    const replace = vi.spyOn(useRouter(), 'replace').mockResolvedValue(undefined)

    // Reka's tab trigger selects on mousedown, not click.
    await tabs(wrapper).find(tab => tab.text().includes(messages.filters.seen))!.trigger('mousedown')

    expect(replace).toHaveBeenCalledWith({ query: { page: undefined, filter: 'seen' } })
  })

  it('opening an unread notification marks it read, refetches, and follows its link', async () => {
    const wrapper = await mountPage()

    await openButton(wrapper, 'Η παραγγελία στάλθηκε').trigger('click')
    await flushPromises()

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(useLocalePath()('/account/orders/42')))
    expect(posted['mark-as-seen']).toEqual([{ notificationUserIds: [1] }])
    expect(asked.length).toBeGreaterThan(1)
  })

  it('opening a read notification without a link marks nothing and goes nowhere', async () => {
    const wrapper = await mountPage()

    await openButton(wrapper, 'Ξανά σε απόθεμα').trigger('click')
    await flushPromises()

    expect(posted['mark-as-seen']).toBeUndefined()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('flips an unread row to read, and a read row to unread, without opening it', async () => {
    const wrapper = await mountPage()

    await rowOf(wrapper, 'Η παραγγελία στάλθηκε').get(`button[aria-label="${itemMessages.mark_seen}"]`).trigger('click')
    await flushPromises()
    await rowOf(wrapper, 'Ξανά σε απόθεμα').get(`button[aria-label="${itemMessages.mark_unseen}"]`).trigger('click')
    await flushPromises()

    expect(posted['mark-as-seen']).toEqual([{ notificationUserIds: [1] }])
    expect(posted['mark-as-unseen']).toEqual([{ notificationUserIds: [2] }])
    expect(navigate).not.toHaveBeenCalled()
  })

  it('marks everything read from the button and refetches', async () => {
    const wrapper = await mountPage()

    await wrapper.findAll('button').find(button => button.text() === messages.mark_all.cta)!.trigger('click')
    await flushPromises()

    await vi.waitFor(() => expect(asked.length).toBeGreaterThan(1))
    expect(posted['mark-all-as-seen']).toHaveLength(1)
  })

  it('offers no mark-all when everything in view is read', async () => {
    state.rows = [makeNotificationUserDetail({ id: 2, seen: true })]

    const wrapper = await mountPage()

    expect(wrapper.findAll('button').some(button => button.text() === messages.mark_all.cta)).toBe(false)
  })

  it('keeps the list as it was when a flip fails', async () => {
    const wrapper = await mountPage()
    state.failMark = true

    await rowOf(wrapper, 'Η παραγγελία στάλθηκε').get(`button[aria-label="${itemMessages.mark_seen}"]`).trigger('click')
    await flushPromises()

    expect(asked).toHaveLength(1)
    expect(rowOf(wrapper, 'Η παραγγελία στάλθηκε').text()).toContain(itemMessages.unread)
  })

  it('says the list did not load, not that it is empty, and tries again', async () => {
    state.fail = true

    const wrapper = await mountPage()

    expect(wrapper.get('[role="alert"]').text()).toContain(messages.load_error)
    expect(wrapper.text()).not.toContain(messages.empty.title)

    state.fail = false
    await wrapper.get('[role="alert"] button').trigger('click')
    await vi.waitFor(() => expect(wrapper.findAll('ol > li')).toHaveLength(2))
  })

  it.each([
    [undefined, 'title'],
    ['unseen', 'unseen_title'],
  ])('says there is nothing to show for the %s filter', async (filter, key) => {
    state.rows = []
    state.query = filter ? { filter } : {}

    const wrapper = await mountPage()
    await vi.waitFor(() => expect(wrapper.text()).toContain(messages.empty[key]))

    expect(wrapper.findAll('ol > li')).toHaveLength(0)
  })
})
