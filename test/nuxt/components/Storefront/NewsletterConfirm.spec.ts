import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import NewsletterConfirm from '~/components/Storefront/NewsletterConfirm.vue'

/**
 * The page a confirmation email links to. Opening it must confirm
 * NOTHING (mail scanners prefetch links); the button POSTs the token,
 * and each of Django's answers — 200, 410, 400 — is its own state.
 */
const TOKEN = 'a'.repeat(64)

mockNuxtImport('useRoute', () => () => ({
  params: { token: TOKEN },
  query: {},
  path: `/newsletter/confirm/${TOKEN}`,
  fullPath: `/newsletter/confirm/${TOKEN}`,
  name: 'newsletter-confirm-token___el',
  meta: {},
  matched: [],
  hash: '',
}))

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn((_url: unknown, _opts?: unknown) => Promise.resolve({})),
}))
mockNuxtImport('$api', () => mockFetch)

const CONFIRM_URL = `/api/subscriptions/confirm/${TOKEN}`

function confirmCalls() {
  return mockFetch.mock.calls.filter(([url]) => String(url) === CONFIRM_URL)
}

function rejectWith(statusCode: number) {
  mockFetch.mockImplementation((url: unknown) =>
    String(url) === CONFIRM_URL
      ? Promise.reject(Object.assign(new Error(String(statusCode)), {
          statusCode,
          data: { detail: 'x' },
        }))
      : Promise.resolve({}),
  )
}

async function pressConfirm(wrapper: Awaited<ReturnType<typeof mountSuspended>>) {
  await wrapper.find('button').trigger('click')
  await new Promise(resolve => setTimeout(resolve, 20))
}

describe('NewsletterConfirm', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockImplementation(() => Promise.resolve({}))
  })

  it('confirms nothing on its own: it waits for the button', async () => {
    const wrapper = await mountSuspended(NewsletterConfirm)

    expect(confirmCalls()).toHaveLength(0)
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('POSTs the token and shows the confirmed state with the topic', async () => {
    mockFetch.mockImplementation((url: unknown) =>
      String(url) === CONFIRM_URL
        ? Promise.resolve({ status: 'confirmed', topic: 'Weekly News' })
        : Promise.resolve({}),
    )
    const wrapper = await mountSuspended(NewsletterConfirm)

    await pressConfirm(wrapper)

    const calls = confirmCalls()
    expect(calls).toHaveLength(1)
    expect((calls[0]![1] as { method: string }).method).toBe('POST')
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Weekly News')
  })

  it('shows the expired state on 410', async () => {
    rejectWith(410)
    const wrapper = await mountSuspended(NewsletterConfirm)

    await pressConfirm(wrapper)

    const alert = wrapper.find('[role="alert"]')
    expect(alert.exists()).toBe(true)
    // The suite renders in the default locale (el).
    expect(alert.text()).toContain('έληξε')
  })

  it('shows the invalid state on 400', async () => {
    rejectWith(400)
    const wrapper = await mountSuspended(NewsletterConfirm)

    await pressConfirm(wrapper)

    const alert = wrapper.find('[role="alert"]')
    expect(alert.exists()).toBe(true)
    // Not the expired copy: the visitor is told the link is not valid.
    expect(alert.text()).not.toContain('έληξε')
  })

  it('keeps the button on any other failure, so the visitor can retry', async () => {
    rejectWith(503)
    const wrapper = await mountSuspended(NewsletterConfirm)

    await pressConfirm(wrapper)

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.find('button').exists()).toBe(true)
    await pressConfirm(wrapper)
    expect(confirmCalls()).toHaveLength(2)
  })
})
