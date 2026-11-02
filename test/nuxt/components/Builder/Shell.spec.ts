import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import { UApp } from '#components'
import BuilderShell from '~/components/Builder/Shell.vue'
import BuilderLayout from '~/layouts/builder.vue'
import { failWith } from '~~/test/helpers/api'

/**
 * The page editor's shell: it signs the staff member in with the ticket
 * Django's admin put on the address, or with the session the browser
 * already holds, opens the editor as them, and signs out.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const SESSION_URL = '/api/builder/session'
const info = { staff: { id: 7, name: 'Maria Papadopoulou', role: 'admin' }, expiresAt: '2026-11-01T18:00:00+02:00' }

const Framed = defineComponent({
  // UApp, as `app.vue` mounts it: the tooltips and menus need its providers.
  render: () => h(UApp, null, { default: () => h(BuilderLayout, null, { default: () => h(BuilderShell) }) }),
})

/** Mounts the shell and waits for the sign-in to settle (a ticket's replace is a real navigation). */
async function open(route = '/_builder') {
  const wrapper = await mountSuspended(Framed, { route })
  await vi.waitFor(() => expect(wrapper.text()).not.toContain('Σύνδεση…'))
  return wrapper
}

const methodsOf = () => api.callsTo(SESSION_URL).map(call => call.options?.method ?? 'GET')

/** The editor's account button, which only a signed-in staff member has. */
const ACCOUNT = 'button[aria-label="Λογαριασμός: Maria Papadopoulou"]'

async function signOutFrom(wrapper: Awaited<ReturnType<typeof open>>) {
  await wrapper.get(ACCOUNT).trigger('keydown', { key: 'Enter' })
  await flushPromises()
  ;[...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(item => item.textContent?.includes('Αποσύνδεση'))!.click()
}

beforeEach(() => {
  api.routes({ [SESSION_URL]: info, '/api/builder/documents': [] })
})

describe('the builder shell', () => {
  describe('opened from the admin, with a ticket', () => {
    it('exchanges the ticket and says who is signed in', async () => {
      const wrapper = await open('/_builder?ticket=one-time-ticket')

      expect(api.callsTo(SESSION_URL).map(call => ({ method: call.options.method, body: call.options.body })))
        .toEqual([{ method: 'POST', body: { ticket: 'one-time-ticket' } }])
      expect(wrapper.find(ACCOUNT).exists()).toBe(true)
      expect(wrapper.text()).toContain('Διαχειριστής')
    })

    it('takes the ticket off the address, and keeps the rest of it', async () => {
      await open('/_builder?ticket=one-time-ticket&device=tablet')

      const query = useRoute().query
      expect(query.ticket).toBeUndefined()
      expect(query.device).toBe('tablet')
    })

    it('says so when Django refuses the ticket, and does not sign in', async () => {
      api.routes({ [SESSION_URL]: failWith(400, { code: 'invalid_ticket' }) })

      const wrapper = await open('/_builder?ticket=used-ticket')

      expect(wrapper.text()).toContain('Ο σύνδεσμος δεν ισχύει πια')
      expect(wrapper.find(ACCOUNT).exists()).toBe(false)
    })
  })

  describe('opened without a ticket (a reload, a second tab)', () => {
    it('asks who is signed in and shows them', async () => {
      const wrapper = await open()

      expect(methodsOf()).toEqual(['GET'])
      expect(wrapper.find(ACCOUNT).exists()).toBe(true)
    })

    it('says the visitor is not signed in when there is no session', async () => {
      api.routes({ [SESSION_URL]: failWith(401) })

      const wrapper = await open()

      expect(wrapper.text()).toContain('Δεν είστε συνδεδεμένοι')
      expect(wrapper.find(ACCOUNT).exists()).toBe(false)
    })

    it('says the sign-in failed for anything else', async () => {
      api.routes({ [SESSION_URL]: failWith(502) })

      const wrapper = await open()

      expect(wrapper.text()).toContain('Η σύνδεση απέτυχε')
    })
  })

  describe('signing out', () => {
    it('ends the session and shows the visitor signed out', async () => {
      const wrapper = await open()

      await signOutFrom(wrapper)
      await vi.waitFor(() => expect(wrapper.text()).toContain('Δεν είστε συνδεδεμένοι'))

      expect(methodsOf()).toEqual(['GET', 'DELETE'])
      expect(wrapper.text()).toContain('Δεν είστε συνδεδεμένοι')
      expect(wrapper.find(ACCOUNT).exists()).toBe(false)
    })

    it('offers it only to someone signed in', async () => {
      api.routes({ [SESSION_URL]: failWith(401) })

      const wrapper = await open()

      expect(wrapper.find(ACCOUNT).exists()).toBe(false)
    })
  })
})
