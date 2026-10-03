import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { resolve } from 'node:path'
import YAML from 'yaml'
import SessionsManage from '~/components/Account/SessionsManage.vue'
import type { Session } from '~~/shared/types/model/all-auth'
import type { SessionsGetResponse } from '~~/shared/types/response/all-auth/sessions/sessions'
import { FIXTURE_EPOCH, asProxiedError, makeAllAuthSession, makeBadResponse } from '~~/test/fixtures/allauth'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'

/**
 * Where the shopper is signed in: one row per session — browser and
 * system, this device marked, when it was last active (or signed in,
 * without activity tracking) — and signing out of any other one, or of
 * all the others at once. The session in use cannot be ended here.
 * Mocked at `useAllAuthSessions`; the rows live in the real auth store.
 */
const { getSessions, deleteSession, toastAdd } = vi.hoisted(() => ({
  getSessions: vi.fn((): Promise<SessionsGetResponse | undefined> => Promise.resolve(undefined)),
  deleteSession: vi.fn((_body: { sessions: number[] }): Promise<SessionsGetResponse | undefined> => Promise.resolve(undefined)),
  toastAdd: vi.fn(),
}))
mockNuxtImport('useAllAuthSessions', () => () => ({ getSessions, deleteSession }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(true),
  user: ref({ id: 7 }),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

const messages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/Account/SessionsManage.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el

const SAFARI_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1'
const FIREFOX_LINUX = 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0'

const HOUR = 60 * 60
const CURRENT = makeAllAuthSession({ id: 1, is_current: true, last_seen_at: FIXTURE_EPOCH })
const PHONE = makeAllAuthSession({ id: 2, user_agent: SAFARI_IPHONE, last_seen_at: FIXTURE_EPOCH - 2 * 24 * HOUR })
const LAPTOP = makeAllAuthSession({ id: 3, user_agent: FIREFOX_LINUX })

const answer = (sessions: Session[]): SessionsGetResponse => ({ status: 200, data: sessions })

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(FIXTURE_EPOCH * 1000)
  useAuthStore().sessions = []
  getSessions.mockResolvedValue(answer([CURRENT, PHONE, LAPTOP]))
})

afterEach(() => {
  vi.useRealTimers()
})

async function mountSessions() {
  const wrapper = await mountSuspended(SessionsManage, { route: false })
  // `setupSessions` runs in `onMounted`, and the rows sit in `<ClientOnly>`.
  await flushPromises()
  return wrapper
}

const rows = (wrapper: VueWrapper) => wrapper.findAll('li')
const row = (wrapper: VueWrapper, device: string) => rows(wrapper).find(item => item.text().includes(device))!
const button = (wrapper: VueWrapper, label: string) =>
  wrapper.findAll('button').find(candidate => candidate.text() === label || candidate.attributes('aria-label') === label)

describe('Account/SessionsManage', () => {
  it('names each session by its browser and system, and marks this device', async () => {
    const wrapper = await mountSessions()

    expect(rows(wrapper).map(item => item.find('.font-medium').text())).toEqual([
      'Chrome σε Windows',
      'Safari σε iOS',
      'Firefox σε Linux',
    ])
    expect(row(wrapper, 'Chrome').text()).toContain(messages.this_device)
    expect(row(wrapper, 'Safari').text()).not.toContain(messages.this_device)
  })

  it('names a session by what its browser string gives away, or as an unknown device', async () => {
    getSessions.mockResolvedValue(answer([
      CURRENT,
      makeAllAuthSession({ id: 4, user_agent: 'Mozilla/5.0 (X11; FreeBSD amd64; rv:140.0) Gecko/20100101 Firefox/140.0' }),
      makeAllAuthSession({ id: 5, user_agent: 'curl/8.9.1' }),
    ]))

    const wrapper = await mountSessions()

    expect(rows(wrapper).map(item => item.find('.font-medium').text())).toEqual([
      'Chrome σε Windows',
      'Firefox',
      messages.unknown_device,
    ])
  })

  it('says when a tracked session was last active, and when an untracked one signed in', async () => {
    const wrapper = await mountSessions()

    expect(row(wrapper, 'Safari').text()).toContain('Ενεργή προχθές')
    expect(row(wrapper, 'Firefox').text()).toContain('Συνδέθηκε τώρα')
  })

  it('offers no sign-out on the session in use', async () => {
    const wrapper = await mountSessions()

    expect(row(wrapper, 'Chrome').findAll('button')).toHaveLength(0)
    expect(row(wrapper, 'Safari').find('button').attributes('aria-label')).toBe('Αποσύνδεση της συσκευής «Safari σε iOS»')
  })

  it('signs one other session out and shows the sessions allauth has left', async () => {
    deleteSession.mockResolvedValue(answer([CURRENT, LAPTOP]))
    const wrapper = await mountSessions()

    await button(wrapper, 'Αποσύνδεση της συσκευής «Safari σε iOS»')!.trigger('click')
    await flushPromises()

    expect(deleteSession).toHaveBeenCalledExactlyOnceWith({ sessions: [2] })
    expect(rows(wrapper)).toHaveLength(2)
    expect(wrapper.text()).not.toContain('Safari')
    expect(toastAdd).toHaveBeenCalledExactlyOnceWith({ title: 'Η συσκευή αποσυνδέθηκε', color: 'success' })
  })

  it('signs out everywhere else at once', async () => {
    deleteSession.mockResolvedValue(answer([CURRENT]))
    const wrapper = await mountSessions()

    await button(wrapper, messages.sign_out_others)!.trigger('click')
    await flushPromises()

    expect(deleteSession).toHaveBeenCalledExactlyOnceWith({ sessions: [2, 3] })
    expect(rows(wrapper)).toHaveLength(1)
    expect(toastAdd).toHaveBeenCalledExactlyOnceWith({ title: 'Οι συσκευές αποσυνδέθηκαν', color: 'success' })
    // Nothing else is left to sign out of.
    expect(button(wrapper, messages.sign_out_others)).toBeUndefined()
  })

  it('offers no "everywhere else" when this is the only session', async () => {
    getSessions.mockResolvedValue(answer([CURRENT]))

    const wrapper = await mountSessions()

    expect(button(wrapper, messages.sign_out_others)).toBeUndefined()
  })

  it('keeps the sessions and says why when allauth refuses', async () => {
    deleteSession.mockRejectedValue(asProxiedError(makeBadResponse({ code: 'invalid', message: 'Refused.' })))
    const wrapper = await mountSessions()

    await button(wrapper, messages.sign_out_others)!.trigger('click')
    await flushPromises()

    expect(rows(wrapper)).toHaveLength(3)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(toastAdd).not.toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
  })
})
