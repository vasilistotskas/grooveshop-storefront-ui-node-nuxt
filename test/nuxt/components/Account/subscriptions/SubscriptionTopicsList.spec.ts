import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import SubscriptionTopicsList from '~/components/Account/subscriptions/SubscriptionTopicsList.vue'
import SubscriptionCategoryGroup from '~/components/Account/subscriptions/SubscriptionCategoryGroup.vue'
import { makeSubscriptionTopic, makeUserSubscription } from '~~/test/fixtures/subscription'
import type { SubscriptionTopic } from '~~/shared/openapi/types.gen'

/**
 * The account's notification preferences: every topic, grouped by
 * category, with a switch that subscribes or unsubscribes. Mocked at the
 * request (`useRequestApi`, which both subscription composables fetch
 * through), so the real composables and child cards run.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('useRequestApi', () => () => api)

const { toastAdd } = vi.hoisted(() => ({ toastAdd: vi.fn() }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

const TOPICS = '/api/subscriptions/topics'
const MINE = '/api/subscriptions/user'

function topic(id: number, name: string, category: SubscriptionTopic['category']): SubscriptionTopic {
  return makeSubscriptionTopic({ id, translations: { el: { name, description: `Περιγραφή ${name}` } }, category, subscriberCount: 10 * id })
}

const subscription = (id: number, of: SubscriptionTopic) => makeUserSubscription({ id, topicDetails: of })

const OFFERS = topic(1, 'Προσφορές', 'MARKETING')
const WEEKLY = topic(2, 'Εβδομαδιαίο δελτίο', 'NEWSLETTER')
const DEALS = topic(3, 'Εκπτώσεις', 'MARKETING')
const UNFILED = topic(4, 'Διάφορα', undefined)

const page = <T>(results: T[]) => ({ count: results.length, results })

beforeEach(() => {
  clearNuxtData(['subscription:topics:list', 'subscription:user:list'])
  api.routes({
    [TOPICS]: page([OFFERS, WEEKLY, DEALS, UNFILED]),
    [MINE]: page([subscription(50, WEEKLY)]),
    '/api/subscriptions/topics/*': (url: string) => subscription(51, url.includes(`/${OFFERS.id}/`) ? OFFERS : DEALS),
    [`${MINE}/*`]: {},
  })
})

async function mountList() {
  const wrapper = await mountSuspended(SubscriptionTopicsList, { route: false })
  await flushPromises()
  return wrapper
}

const groups = (wrapper: VueWrapper) => wrapper.findAllComponents(SubscriptionCategoryGroup)
/** The switch on the card titled `name`. */
function switchFor(wrapper: VueWrapper, name: string) {
  const card = wrapper.findAll('h3').find(heading => heading.text() === name)!
  return card.element.closest('[data-slot="header"]')!.querySelector<HTMLButtonElement>('button[role="switch"]')!
}

describe('Account/subscriptions/SubscriptionTopicsList', () => {
  it('groups the topics under their category, a topic without one under "other"', async () => {
    const wrapper = await mountList()

    expect(groups(wrapper).map(group => [
      group.find('h3').text(),
      group.findAll('[data-slot="header"] h3').map(heading => heading.text()),
    ])).toEqual([
      ['Μάρκετινγκ', ['Προσφορές', 'Εκπτώσεις']],
      ['Ενημερωτικό Δελτίο', ['Εβδομαδιαίο δελτίο']],
      ['Άλλο', ['Διάφορα']],
    ])
  })

  it('switches on exactly the topics the shopper is subscribed to', async () => {
    const wrapper = await mountList()

    expect(switchFor(wrapper, 'Εβδομαδιαίο δελτίο').getAttribute('aria-checked')).toBe('true')
    expect(switchFor(wrapper, 'Προσφορές').getAttribute('aria-checked')).toBe('false')
  })

  it('subscribes to a topic switched on, then reloads both lists', async () => {
    const wrapper = await mountList()
    api.mockClear()

    switchFor(wrapper, 'Προσφορές').click()
    await flushPromises()

    expect(api.callsTo('/api/subscriptions/topics/*')).toEqual([
      { url: `/api/subscriptions/topics/${OFFERS.id}/subscribe`, options: expect.objectContaining({ method: 'POST' }) },
    ])
    expect(api.callsTo(MINE).map(call => call.options.method)).toEqual(['GET'])
    expect(api.callsTo(TOPICS)).toHaveLength(1)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
  })

  it('reads a topic unsubscribed by email as off, and subscribes it again through the topic', async () => {
    // Django keeps the row; it is no subscription, and a new row would
    // collide with it.
    api.routes({
      [TOPICS]: page([OFFERS, WEEKLY]),
      [MINE]: page([subscription(50, WEEKLY), { ...subscription(52, OFFERS), status: 'UNSUBSCRIBED' }]),
      '/api/subscriptions/topics/*': subscription(52, OFFERS),
    })
    const wrapper = await mountList()

    expect(switchFor(wrapper, 'Προσφορές').getAttribute('aria-checked')).toBe('false')
    switchFor(wrapper, 'Προσφορές').click()
    await flushPromises()

    expect(api.callsTo('/api/subscriptions/topics/*').map(call => call.url)).toEqual([`/api/subscriptions/topics/${OFFERS.id}/subscribe`])
  })

  it('deletes the subscription behind a topic switched off', async () => {
    const wrapper = await mountList()
    api.mockClear()

    switchFor(wrapper, 'Εβδομαδιαίο δελτίο').click()
    await flushPromises()

    expect(api.callsTo(`${MINE}/*`)).toEqual([
      { url: `${MINE}/50`, options: expect.objectContaining({ method: 'DELETE' }) },
    ])
  })

  it('says the change failed rather than throwing', async () => {
    const wrapper = await mountList()
    api.routes({
      [TOPICS]: page([OFFERS]),
      [MINE]: page([]),
      '/api/subscriptions/topics/*': () => {
        throw Object.assign(new Error('Bad Gateway'), { statusCode: 502 })
      },
    })

    switchFor(wrapper, 'Προσφορές').click()
    await flushPromises()

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
      title: useNuxtApp().$i18n.t('subscription_notifications.subscribe.error_title'),
      color: 'error',
    }))
  })

  it('shows the empty state when there are no topics', async () => {
    api.routes({ [TOPICS]: page([]), [MINE]: page([]) })

    const wrapper = await mountList()

    expect(wrapper.text()).toContain('Δεν υπάρχουν διαθέσιμα θέματα')
    expect(groups(wrapper)).toHaveLength(0)
  })

  it('shows the error when the topics cannot be loaded', async () => {
    api.routes({ [TOPICS]: () => {
      throw new Error('Bad Gateway')
    }, [MINE]: page([]) })

    const wrapper = await mountList()

    expect(wrapper.text()).toContain('Σφάλμα φόρτωσης')
    expect(groups(wrapper)).toHaveLength(0)
  })

  it('shows skeletons while the topics load', async () => {
    api.routes({ [TOPICS]: () => new Promise(() => {}), [MINE]: page([]) })

    const wrapper = await mountList()

    expect(wrapper.findAllComponents({ name: 'USkeleton' }).length).toBeGreaterThan(0)
    expect(groups(wrapper)).toHaveLength(0)
  })
})
