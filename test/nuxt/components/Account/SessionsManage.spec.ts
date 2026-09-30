import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, mockComponent } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import SessionsManage from '~/components/Account/SessionsManage.vue'
import type { Session } from '~~/shared/types/model/all-auth'
import type { SessionsGetResponse } from '~~/shared/types/response/all-auth/sessions/sessions'

/**
 * The account's open sessions, read into the auth store on mount and
 * ended through allauth's `DELETE /sessions`. The session in use can
 * never be ended from here — only the others. Mocked at
 * `useAllAuthSessions`; the rows live in the real auth store.
 *
 * Copy comes from the component's own `<i18n>` block, which
 * `$i18n.t` cannot see, so the Greek is asserted as written there.
 */
// UTooltip needs UApp's TooltipProvider, which a bare mount does not have.
mockComponent('UTooltip', { template: '<div><slot /></div>' })

const { getSessions, deleteSession, toastAdd, loggedIn } = vi.hoisted(() => ({
  getSessions: vi.fn((): Promise<SessionsGetResponse | undefined> => Promise.resolve(undefined)),
  deleteSession: vi.fn((_body: { sessions: number[] }): Promise<SessionsGetResponse | undefined> => Promise.resolve(undefined)),
  toastAdd: vi.fn(),
  loggedIn: { value: true },
}))
mockNuxtImport('useAllAuthSessions', () => () => ({ getSessions, deleteSession }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
// The whole session surface: the app's auth plugins call it while booting.
// `setupSessions` only asks allauth for a signed-in shopper.
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(loggedIn.value),
  user: ref(null),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

const CHROME_WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'
// Desktop agents only: the OS guess reads an iPhone as macOS and an
// Android phone as Linux (see the report), which is not pinned here.
const FIREFOX_LINUX = 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0'
const EDGE_WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 Edg/140.0'

const session = (id: number, userAgent: string, extra: Partial<Session> = {}): Session => ({
  id,
  user_agent: userAgent,
  ip: `10.0.0.${id}`,
  created_at: 1767225600,
  is_current: false,
  ...extra,
})

const CURRENT = session(1, CHROME_WINDOWS, { is_current: true })
const LAPTOP = session(2, FIREFOX_LINUX)
const WORK = session(3, EDGE_WINDOWS)

const answer = (sessions: Session[]): SessionsGetResponse => ({ status: 200, data: sessions })

beforeEach(() => {
  loggedIn.value = true
  useAuthStore().sessions = []
  getSessions.mockResolvedValue(answer([CURRENT, LAPTOP, WORK]))
})

async function mountSessions() {
  const wrapper = await mountSuspended(SessionsManage, { route: false })
  // `setupSessions` runs in `onMounted`, and the table sits in `<ClientOnly>`.
  await flushPromises()
  return wrapper
}

const rows = (wrapper: VueWrapper) => wrapper.findAll('tbody tr')
/** The row's menu items, as the component hands them to its UDropdownMenu (Reka teleports the open menu). */
const menu = (wrapper: VueWrapper, row: number) =>
  wrapper.findAllComponents({ name: 'UDropdownMenu' })[row]!.props('items')[0] as Array<{ disabled?: boolean, onSelect: () => unknown }>
const signOutOthers = (wrapper: VueWrapper) =>
  wrapper.findAll('button').find(button => button.text() === 'Αποσύνδεση από όλες τις υπόλοιπες συσκευές')!

describe('Account/SessionsManage', () => {
  it('reads the sessions from allauth when mounted and lists each device', async () => {
    const wrapper = await mountSessions()

    expect(getSessions).toHaveBeenCalledOnce()
    expect(rows(wrapper).map(row => row.text())).toEqual([
      expect.stringContaining('Chrome•Windows'),
      expect.stringContaining('Firefox•Linux'),
      expect.stringContaining('Edge•Windows'),
    ])
    expect(rows(wrapper)[1]!.text()).toContain('10.0.0.2')
  })

  it('does not ask allauth for a signed-out visitor', async () => {
    loggedIn.value = false

    const wrapper = await mountSessions()

    expect(getSessions).not.toHaveBeenCalled()
    expect(rows(wrapper).some(row => row.text().includes('10.0.0.'))).toBe(false)
    expect(wrapper.text()).toContain('Σύνολο: 0 συνεδρία/συνεδρίες (0 άλλες)')
  })

  it('marks only the session in use as the active one', async () => {
    const wrapper = await mountSessions()

    expect(rows(wrapper).map(row => row.text().includes('Ενεργή'))).toEqual([true, false, false])
  })

  it('never ends the session in use', async () => {
    const wrapper = await mountSessions()

    const [signOut] = menu(wrapper, 0)
    expect(signOut!.disabled).toBe(true)
    expect(rows(wrapper)[0]!.find('button').attributes('disabled')).toBeDefined()

    await signOut!.onSelect()
    await flushPromises()

    expect(deleteSession).not.toHaveBeenCalled()
  })

  it('ends one other session and shows what allauth has left', async () => {
    deleteSession.mockResolvedValue(answer([CURRENT, WORK]))
    const wrapper = await mountSessions()

    const [signOut] = menu(wrapper, 1)
    expect(signOut!.disabled).toBe(false)
    await signOut!.onSelect()
    await flushPromises()

    expect(deleteSession).toHaveBeenCalledWith({ sessions: [LAPTOP.id] })
    expect(rows(wrapper)).toHaveLength(2)
    expect(wrapper.text()).not.toContain('Firefox')
    expect(toastAdd).toHaveBeenCalledWith({ title: 'Αποσυνδέθηκες από όλες τις άλλες συνεδρίες', color: 'success' })
    expect(wrapper.emitted('deleteSession')).toHaveLength(1)
  })

  it('ends every other session at once, never the one in use', async () => {
    deleteSession.mockResolvedValue(answer([CURRENT]))
    const wrapper = await mountSessions()

    await signOutOthers(wrapper).trigger('click')
    await flushPromises()

    expect(deleteSession).toHaveBeenCalledWith({ sessions: [LAPTOP.id, WORK.id] })
    expect(rows(wrapper)).toHaveLength(1)
    expect(wrapper.text()).toContain('Σύνολο: 1 συνεδρία/συνεδρίες (0 άλλες)')
  })

  it('counts the sessions and warns about the others while there are any', async () => {
    const wrapper = await mountSessions()

    expect(wrapper.text()).toContain('Σύνολο: 3 συνεδρία/συνεδρίες (2 άλλες)')
    expect(wrapper.text()).toContain('Ασφάλεια Λογαριασμού')
    expect(signOutOthers(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('offers nothing to end when the session in use is the only one', async () => {
    getSessions.mockResolvedValue(answer([CURRENT]))

    const wrapper = await mountSessions()

    expect(signOutOthers(wrapper).attributes('disabled')).toBeDefined()
    expect(wrapper.text()).not.toContain('Ασφάλεια Λογαριασμού')
  })

  it('shows what allauth refused and keeps the sessions it still has', async () => {
    deleteSession.mockRejectedValue({
      data: { statusCode: 400, data: { status: 400, errors: [{ code: 'invalid', message: 'Session not found.' }] } },
    })
    const wrapper = await mountSessions()

    await menu(wrapper, 2)[0]!.onSelect()
    await flushPromises()

    const { t, te } = useNuxtApp().$i18n
    const key = 'validation.api.invalid'
    expect(toastAdd).toHaveBeenCalledWith({ title: te(key) ? t(key) : 'Session not found.', color: 'error' })
    expect(rows(wrapper)).toHaveLength(3)
    expect(wrapper.emitted('deleteSession')).toBeUndefined()
  })
})
