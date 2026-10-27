import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockComponent, mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import WebsideAccountInfo from '~/components/variants/webside/User/Account/Info.vue'
import { makeUserDetails } from '~~/test/fixtures/user'
import { failWith } from '~~/test/helpers/api'
import { inlineCopy } from '~~/test/helpers/inlineCopy'

/**
 * The frozen account banner's inline username edit: the pencil turns the
 * name into an input, the tick saves it through `useChangeUsername` (the
 * request the settings form makes too), and Django's own words — its
 * confirmation, its refusal of a taken name — are what the shopper reads.
 * The banner exists in the frozen tree only.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const { toastAdd, fetchSession } = vi.hoisted(() => ({ toastAdd: vi.fn(), fetchSession: vi.fn(() => Promise.resolve()) }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(true),
  user: ref({ id: 5 }),
  session: ref({}),
  ready: ref(true),
  fetch: fetchSession,
  clear: () => Promise.resolve(),
}))

/** `UTooltip` needs `UApp`'s provider, which a bare mount does not have. */
mockComponent('UTooltip', { template: '<div><slot /></div>' })

const COPY = inlineCopy('app/components/variants/webside/User/Account/Info.vue')
const CHANGE = '/api/user/account/5/change-username'

const ACCOUNT = makeUserDetails({ id: 5, username: 'maria' })

beforeEach(() => {
  api.routes({ [CHANGE]: { detail: 'Το όνομα χρήστη άλλαξε.', username: 'maria2' } })
})

async function mountBanner() {
  const wrapper = await mountSuspended(WebsideAccountInfo, { props: { account: { ...ACCOUNT } }, route: false })
  await flushPromises()
  return wrapper
}

const nameInput = (wrapper: VueWrapper) => wrapper.get('input:not([type="file"])')
/** The pencil, which becomes the tick once the name is being edited. */
const control = (wrapper: VueWrapper, key: 'edit.title' | 'save') =>
  wrapper.get(`button[aria-label="${useNuxtApp().$i18n.t(key)}"]`)

async function rename(wrapper: VueWrapper, name: string) {
  await control(wrapper, 'edit.title').trigger('click')
  await nameInput(wrapper).setValue(name)
  await control(wrapper, 'save').trigger('click')
  await flushPromises()
}

describe('webside User/Account/Info', () => {
  it('saves the new name, reads the session again and says what Django says', async () => {
    const wrapper = await mountBanner()

    await rename(wrapper, 'maria2')

    expect(api.callsTo(CHANGE).map(call => [call.options.method, call.options.body])).toEqual([['POST', { username: 'maria2' }]])
    expect(fetchSession).toHaveBeenCalledOnce()
    expect(toastAdd).toHaveBeenCalledWith({ title: 'Το όνομα χρήστη άλλαξε.', color: 'success' })
  })

  it('refuses an empty name without asking Django', async () => {
    const wrapper = await mountBanner()

    await rename(wrapper, '')

    expect(api.callsTo(CHANGE)).toEqual([])
    expect(toastAdd).toHaveBeenCalledWith({ title: COPY.username.empty, color: 'error' })
  })

  it('says Django\'s reason when the name is taken, and reads nothing again', async () => {
    api.routes({ [CHANGE]: failWith(409, { detail: 'Username already taken.' }) })
    const wrapper = await mountBanner()

    await rename(wrapper, 'taken')

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
      color: 'error',
      description: expect.stringContaining('Username already taken.'),
    }))
    expect(fetchSession).not.toHaveBeenCalled()
  })
})
