import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import BuilderShell from '~/components/Builder/Shell.vue'
import BuilderLayout from '~/layouts/builder.vue'
import { failWith } from '~~/test/helpers/api'

/**
 * The page editor's shell (a placeholder until the editor): it signs the
 * staff member in with the ticket Django's admin put on the address, or
 * with the session the browser already holds, says who is signed in, and
 * signs out.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const SESSION_URL = '/api/builder/session'
const info = { staff: { id: 7, name: 'Maria Papadopoulou', role: 'ADMIN' }, expiresAt: '2026-11-01T18:00:00+02:00' }

const Framed = defineComponent({
  render: () => h(BuilderLayout, null, { default: () => h(BuilderShell) }),
})

/** Mounts the shell and waits for the sign-in to settle (a ticket's replace is a real navigation). */
async function open(route = '/_builder') {
  const wrapper = await mountSuspended(Framed, { route })
  await vi.waitFor(() => expect(wrapper.text()).not.toContain('Σύνδεση…'))
  return wrapper
}

const methodsOf = () => api.callsTo(SESSION_URL).map(call => call.options?.method ?? 'GET')

beforeEach(() => {
  api.routes({ [SESSION_URL]: info })
})

describe('the builder shell', () => {
  describe('opened from the admin, with a ticket', () => {
    it('exchanges the ticket and says who is signed in', async () => {
      const wrapper = await open('/_builder?ticket=one-time-ticket')

      expect(api.callsTo(SESSION_URL).map(call => ({ method: call.options.method, body: call.options.body })))
        .toEqual([{ method: 'POST', body: { ticket: 'one-time-ticket' } }])
      expect(wrapper.text()).toContain('Συνδεδεμένος ως Maria Papadopoulou')
      expect(wrapper.text()).toContain('ADMIN')
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
      expect(wrapper.text()).not.toContain('Συνδεδεμένος ως')
    })
  })

  describe('opened without a ticket (a reload, a second tab)', () => {
    it('asks who is signed in and shows them', async () => {
      const wrapper = await open()

      expect(methodsOf()).toEqual(['GET'])
      expect(wrapper.text()).toContain('Συνδεδεμένος ως Maria Papadopoulou')
    })

    it('says the visitor is not signed in when there is no session', async () => {
      api.routes({ [SESSION_URL]: failWith(401) })

      const wrapper = await open()

      expect(wrapper.text()).toContain('Δεν είστε συνδεδεμένοι')
      expect(wrapper.text()).not.toContain('Συνδεδεμένος ως')
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

      await wrapper.get('button[aria-label="Αποσύνδεση"]').trigger('click')
      await vi.waitFor(() => expect(wrapper.text()).toContain('Δεν είστε συνδεδεμένοι'))

      expect(methodsOf()).toEqual(['GET', 'DELETE'])
      expect(wrapper.text()).toContain('Δεν είστε συνδεδεμένοι')
      expect(wrapper.find('button[aria-label="Αποσύνδεση"]').exists()).toBe(false)
    })

    it('offers it only to someone signed in', async () => {
      api.routes({ [SESSION_URL]: failWith(401) })

      const wrapper = await open()

      expect(wrapper.find('button[aria-label="Αποσύνδεση"]').exists()).toBe(false)
    })
  })
})
