import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { resolve } from 'node:path'
import YAML from 'yaml'
import Privacy from '~/components/Storefront/Account/Privacy.vue'
import { failWith } from '~~/test/helpers/api'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'

/**
 * The account's "Your data" page: the data export with its latest status
 * (polled while it is being built), and the account deletion behind a typed
 * confirmation, with a warning when the shopper would lose points or a
 * gift-card balance. Copy is read through the app's own i18n, so the specs
 * pin what the shopper reads, not the Greek string.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const session = vi.hoisted(() => ({ clear: vi.fn(() => Promise.resolve()) }))
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(true),
  user: ref({ id: 7 }),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: session.clear,
}))

const EXPORTS = '/api/user/account/7/data-exports'
const REQUEST = '/api/user/account/7/request-data-export'
const DELETE = '/api/user/account/7/delete-account'
const SUMMARY = '/api/user/account/summary'

const messages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/Storefront/Account/Privacy.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el

/**
 * The page's Greek copy at `key`, with `{name}` placeholders filled; for
 * a plural ("one | many"), the form `count` picks (vue-i18n's two-form
 * rule: 1 is the first, anything else the second).
 */
const text = (key: string, params: Record<string, string> = {}, count?: number): string => {
  const copy = key.split('.').reduce((node, part) => node[part], messages) as string
  const forms = copy.split(' | ')
  const chosen = count === undefined || forms.length === 1 ? copy : forms[count === 1 ? 0 : 1]!
  return Object.entries(params).reduce((filled, [name, value]) => filled.replace(`{${name}}`, value), chosen)
}

function makeExport(overrides: Partial<UserDataExport> = {}): UserDataExport {
  return {
    id: 1,
    status: 'ready',
    token: 'tok',
    fileSize: 2048,
    expiresAt: '2026-10-11T10:00:00Z',
    createdAt: '2026-10-04T10:00:00Z',
    downloadUrl: 'https://api.example.test/export/tok',
    ...overrides,
  }
}

function makeSummary(overrides: Partial<AccountSummary> = {}): AccountSummary {
  return {
    ordersCount: 3,
    loyalty: { pointsBalance: 0, tier: null },
    giftCardBalance: null,
    businessStatus: null,
    ...overrides,
  }
}

function given({ exports = [] as UserDataExport[], summary = makeSummary() } = {}) {
  api.routes({
    [EXPORTS]: () => ({ results: exports }),
    [SUMMARY]: () => summary,
  })
}

const mountPage = async () => {
  const wrapper = await mountSuspended(Privacy, { route: false })
  await flushPromises()
  return wrapper
}

const buttonByText = (root: ParentNode, label: string) =>
  [...root.querySelectorAll('button')].find(button => button.textContent?.trim() === label)

const deleteSection = (wrapper: VueWrapper) => wrapper.findAll('section')[1]!
const words = (value: string) => value.replace(/\s+/g, ' ').trim()

beforeEach(() => {
  clearNuxtData('account-summary')
  given()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Storefront/Account/Privacy', () => {
  it('draws the heading and states that the export is a JSON file', async () => {
    const wrapper = await mountPage()

    expect(wrapper.get('h1').text()).toBe(text('title'))
    expect(wrapper.findAll('h2').map(heading => heading.text())).toEqual([text('export.title'), text('delete.title')])
    expect(wrapper.text()).toContain('JSON')
    expect(wrapper.text()).not.toMatch(/\bZIP\b/i)
  })

  it('shows no status before an export has been requested', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).not.toContain(text('export.status.ready'))
    expect(wrapper.text()).not.toContain(text('export.status.pending'))
    expect(buttonByText(wrapper.element, text('export.request'))).toBeTruthy()
  })

  it('requests an export, then shows it as pending', async () => {
    const wrapper = await mountPage()
    api.routes({
      [EXPORTS]: () => ({ results: [makeExport({ status: 'pending', downloadUrl: null, fileSize: null, expiresAt: null })] }),
      [REQUEST]: () => ({}),
      [SUMMARY]: () => makeSummary(),
    })

    await wrapper.findAll('button').find(button => button.text() === text('export.request'))!.trigger('click')
    await flushPromises()

    expect(api.callsTo(REQUEST)).toEqual([{ url: REQUEST, options: expect.objectContaining({ method: 'POST' }) }])
    expect(wrapper.text()).toContain(text('export.status.pending'))
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(true)
    expect(wrapper.findAll('button').find(button => button.text() === text('export.request'))!.attributes('disabled')).toBeDefined()
  })

  it('polls while the export is processing and stops once it is ready', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    given({ exports: [makeExport({ status: 'processing', downloadUrl: null, fileSize: null, expiresAt: null })] })
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain(text('export.status.processing'))
    expect(api.callsTo(EXPORTS)).toHaveLength(1)

    given({ exports: [makeExport({ status: 'ready' })] })
    await vi.advanceTimersByTimeAsync(3000)
    await flushPromises()

    expect(api.callsTo(EXPORTS)).toHaveLength(2)
    expect(wrapper.text()).toContain(text('export.status.ready'))

    await vi.advanceTimersByTimeAsync(9000)
    expect(api.callsTo(EXPORTS)).toHaveLength(2)
  })

  it('shows a ready export with its date, expiry, size and a download that opens the file', async () => {
    given({ exports: [makeExport()] })
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain(text('export.status.ready'))
    expect(wrapper.text()).toContain(text('export.requested_at'))
    expect(wrapper.text()).toContain(text('export.expires_at'))
    expect(wrapper.findAll('time').map(time => time.attributes('datetime'))).toEqual(['2026-10-04T10:00:00.000Z', '2026-10-11T10:00:00.000Z'])
    expect(wrapper.text()).toContain('2 KB')
    expect(buttonByText(wrapper.element, text('export.request_again'))).toBeTruthy()

    await wrapper.findAll('button').find(button => button.text() === text('export.download'))!.trigger('click')

    expect(open).toHaveBeenCalledWith('https://api.example.test/export/tok', '_blank', 'noopener,noreferrer')
  })

  it('says a failed export failed and lets the shopper ask again', async () => {
    given({ exports: [makeExport({ status: 'failed', downloadUrl: null, fileSize: null, expiresAt: null })] })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain(text('export.status.failed'))
    expect(wrapper.get('[role="alert"]').text()).toBe(text('export.failed_description'))
    expect(buttonByText(wrapper.element, text('export.request'))!.hasAttribute('disabled')).toBe(false)
    expect(buttonByText(wrapper.element, text('export.download'))).toBeUndefined()
  })

  it('says an expired export expired and offers no download', async () => {
    given({ exports: [makeExport({ status: 'expired', downloadUrl: null })] })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain(text('export.status.expired'))
    expect(buttonByText(wrapper.element, text('export.download'))).toBeUndefined()
    expect(buttonByText(wrapper.element, text('export.request'))!.hasAttribute('disabled')).toBe(false)
  })

  describe('the deletion warning', () => {
    it('names the points and the gift-card balance the shopper would lose', async () => {
      given({ summary: makeSummary({ loyalty: { pointsBalance: 2340, tier: null }, giftCardBalance: 42 }) })
      const { $i18n } = useNuxtApp()

      const wrapper = await mountPage()

      expect(words(deleteSection(wrapper).text())).toContain(words(text('delete.lost_both', { points: $i18n.n(2340), balance: $i18n.n(42, 'currency') }, 2340)))
    })

    it('names only the points when there is no balance', async () => {
      given({ summary: makeSummary({ loyalty: { pointsBalance: 2340, tier: null }, giftCardBalance: 0 }) })
      const { $i18n } = useNuxtApp()

      const wrapper = await mountPage()

      expect(words(deleteSection(wrapper).text())).toContain(words(text('delete.lost_points', { points: $i18n.n(2340) }, 2340)))
    })

    it('says one point in the singular', async () => {
      given({ summary: makeSummary({ loyalty: { pointsBalance: 1, tier: null }, giftCardBalance: 0 }) })

      const wrapper = await mountPage()

      expect(words(deleteSection(wrapper).text())).toContain('Έχεις 1 πόντο, που χάνεται όταν διαγραφεί ο λογαριασμός')
    })

    it('names only the balance when there are no points', async () => {
      given({ summary: makeSummary({ loyalty: { pointsBalance: 0, tier: null }, giftCardBalance: 42 }) })
      const { $i18n } = useNuxtApp()

      const wrapper = await mountPage()

      expect(words(deleteSection(wrapper).text())).toContain(words(text('delete.lost_balance', { balance: $i18n.n(42, 'currency') })))
    })

    it.each([
      ['both absent', makeSummary({ loyalty: { pointsBalance: 0, tier: null }, giftCardBalance: null })],
      ['both features off', makeSummary({ loyalty: null, giftCardBalance: null })],
    ])('shows no warning when %s', async (_name, summary) => {
      given({ summary })

      const wrapper = await mountPage()

      expect(words(deleteSection(wrapper).text())).toBe(words(
        `${text('delete.title')}${text('delete.description')}${text('delete.open_modal')}`,
      ))
    })
  })

  describe('deleting the account', () => {
    const openModal = async (wrapper: VueWrapper) => {
      await wrapper.findAll('button').find(button => button.text() === text('delete.open_modal'))!.trigger('click')
      await flushPromises()
    }
    const confirmButton = () => buttonByText(document.body, text('delete.confirm_button'))!
    const typeConfirmation = async (value: string) => {
      const input = document.body.querySelector<HTMLInputElement>('input[placeholder="DELETE"]')!
      input.value = value
      input.dispatchEvent(new Event('input'))
      await flushPromises()
    }

    it('keeps the confirm button disabled until DELETE is typed exactly', async () => {
      const wrapper = await mountPage()
      await openModal(wrapper)

      expect(confirmButton().hasAttribute('disabled')).toBe(true)

      await typeConfirmation('delete')
      expect(confirmButton().hasAttribute('disabled')).toBe(true)

      await typeConfirmation('DELETE')
      expect(confirmButton().hasAttribute('disabled')).toBe(false)
    })

    it('posts the confirmation, signs the shopper out and sends them home', async () => {
      const router = useRouter()
      const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)
      api.routes({ [EXPORTS]: () => ({ results: [] }), [SUMMARY]: () => makeSummary(), [DELETE]: () => ({}) })
      const wrapper = await mountPage()
      await openModal(wrapper)
      await typeConfirmation('DELETE')

      confirmButton().click()
      await flushPromises()

      expect(api.callsTo(DELETE)).toEqual([
        { url: DELETE, options: expect.objectContaining({ method: 'POST', body: { confirmation: 'DELETE' } }) },
      ])
      expect(session.clear).toHaveBeenCalledOnce()
      expect(push).toHaveBeenCalledOnce()
    })

    it('stays signed in when the deletion fails', async () => {
      const push = vi.spyOn(useRouter(), 'push').mockResolvedValue(undefined)
      api.routes({ [EXPORTS]: () => ({ results: [] }), [SUMMARY]: () => makeSummary(), [DELETE]: failWith(403) })
      const wrapper = await mountPage()
      await openModal(wrapper)
      await typeConfirmation('DELETE')

      confirmButton().click()
      await flushPromises()

      expect(api.callsTo(DELETE)).toHaveLength(1)
      expect(session.clear).not.toHaveBeenCalled()
      expect(push).not.toHaveBeenCalled()
    })
  })
})
