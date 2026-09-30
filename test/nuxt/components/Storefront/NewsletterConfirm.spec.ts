import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import NewsletterConfirm from '~/components/Storefront/NewsletterConfirm.vue'
import { failWith } from '~~/test/helpers/api'

/**
 * The page a confirmation email links to. Opening it must confirm
 * NOTHING (mail scanners prefetch links); the button POSTs the token,
 * and each of Django's answers — 200, 410, 400 — is its own state.
 */
const TOKEN = 'a'.repeat(64)
const CONFIRM_URL = `/api/subscriptions/confirm/${TOKEN}`

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

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

/** The component's own `<i18n>` copy (el), which the global `$i18n` cannot reach. */
const COPY = {
  confirmedTitle: 'Η εγγραφή σου επιβεβαιώθηκε',
  confirmedDescription: 'Από εδώ και πέρα θα λαμβάνεις το ενημερωτικό μας δελτίο.',
  confirmedTopic: 'Από εδώ και πέρα θα λαμβάνεις: Weekly News.',
  expiredTitle: 'Ο σύνδεσμος έληξε',
  invalidTitle: 'Μη έγκυρος σύνδεσμος',
  failed: 'Η επιβεβαίωση δεν ολοκληρώθηκε. Δοκίμασε ξανά σε λίγο.',
  confirm: 'Επιβεβαίωση εγγραφής',
}

const mountPage = () => mountSuspended(NewsletterConfirm, { route: false })

const confirmButton = (wrapper: Awaited<ReturnType<typeof mountPage>>) =>
  wrapper.findAll('button').find(b => b.text() === COPY.confirm)

async function pressConfirm(wrapper: Awaited<ReturnType<typeof mountPage>>) {
  await confirmButton(wrapper)!.trigger('click')
  await flushPromises()
}

describe('NewsletterConfirm', () => {
  beforeEach(() => {
    api.routes({ [CONFIRM_URL]: { status: 'confirmed', topic: 'Weekly News' } })
  })

  it('confirms nothing on its own: it waits for the button', async () => {
    const wrapper = await mountPage()
    await flushPromises()

    expect(api.callsTo(CONFIRM_URL)).toEqual([])
    expect(confirmButton(wrapper)).toBeTruthy()
  })

  it('POSTs the token and names the confirmed topic', async () => {
    const wrapper = await mountPage()

    await pressConfirm(wrapper)

    expect(api.callsTo(CONFIRM_URL)).toEqual([{ url: CONFIRM_URL, options: { method: 'POST' } }])
    const status = wrapper.find('[role="status"]')
    expect(status.find('h2').text()).toBe(COPY.confirmedTitle)
    expect(status.find('p').text()).toBe(COPY.confirmedTopic)
    expect(confirmButton(wrapper)).toBeUndefined()
  })

  it('falls back to the generic confirmation when Django names no topic', async () => {
    api.routes({ [CONFIRM_URL]: { status: 'confirmed' } })
    const wrapper = await mountPage()

    await pressConfirm(wrapper)

    expect(wrapper.find('[role="status"] p').text()).toBe(COPY.confirmedDescription)
  })

  it.each([
    { status: 410, title: COPY.expiredTitle },
    { status: 400, title: COPY.invalidTitle },
  ])('shows its own final state on $status, without a retry button', async ({ status, title }) => {
    api.routes({ [CONFIRM_URL]: failWith(status, { detail: 'x' }) })
    const wrapper = await mountPage()

    await pressConfirm(wrapper)

    expect(wrapper.find('[role="alert"] h2').text()).toBe(title)
    expect(confirmButton(wrapper)).toBeUndefined()
  })

  it('keeps the button on any other failure, so the visitor can retry', async () => {
    api.routes({ [CONFIRM_URL]: failWith(503, { detail: 'x' }) })
    const wrapper = await mountPage()

    await pressConfirm(wrapper)

    expect(wrapper.find('[role="alert"]').text()).toBe(COPY.failed)
    await pressConfirm(wrapper)
    expect(api.callsTo(CONFIRM_URL)).toHaveLength(2)
  })

  it('sends one request however often the button is pressed while it is pending', async () => {
    let settle!: (value: unknown) => void
    api.routes({
      [CONFIRM_URL]: () => new Promise((resolve) => {
        settle = resolve
      }),
    })
    const wrapper = await mountPage()

    await confirmButton(wrapper)!.trigger('click')
    await confirmButton(wrapper)!.trigger('click')
    settle({ status: 'confirmed' })
    await flushPromises()

    expect(api.callsTo(CONFIRM_URL)).toHaveLength(1)
  })
})
