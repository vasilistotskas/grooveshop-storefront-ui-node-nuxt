import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import BuilderPresenceNotice from '~/components/Builder/PresenceNotice.vue'
import { useBuilderPresenceStore } from '~/stores/builderPresence'
import { failWith } from '~~/test/helpers/api'

/**
 * The soft "Maria is editing" notice: the editor tells Django which documents
 * it has open every few seconds, shows who else has them, and lets go on
 * leaving. It is a hint: a failing heartbeat shows nothing and breaks nothing.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const entry = (id: number, name: string) => ({ id, name, since: '2026-11-03T10:00:00+02:00' })

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the presence notice', () => {
  it('beats at once with the page being edited, and shows who else is on it', async () => {
    api.routes({ '/api/builder/presence': { documents: { 'template:home': [entry(9, 'Nikos Georgiou')] } } })

    const wrapper = await mountSuspended(BuilderPresenceNotice, { route: false })
    await flushPromises()

    expect(api.callsTo('/api/builder/presence')[0]!.options).toMatchObject({ method: 'POST', body: { documents: ['template:home'] } })
    expect(wrapper.find('[role="status"]').text()).toContain('Nikos Georgiou')
  })

  it('names every person when several are on a document', async () => {
    api.routes({ '/api/builder/presence': { documents: { 'template:home': [entry(9, 'Nikos'), entry(11, 'Eleni')] } } })

    const wrapper = await mountSuspended(BuilderPresenceNotice, { route: false })
    await flushPromises()

    expect(wrapper.text()).toContain('Nikos, Eleni')
  })

  it('shows nothing while nobody else is on the documents', async () => {
    api.routes({ '/api/builder/presence': { documents: { 'template:home': [] } } })

    const wrapper = await mountSuspended(BuilderPresenceNotice, { route: false })
    await flushPromises()

    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('beats again every BUILDER_PRESENCE_HEARTBEAT_MS, and updates who is there', async () => {
    api.routes({ '/api/builder/presence': { documents: { 'template:home': [] } } })
    const wrapper = await mountSuspended(BuilderPresenceNotice, { route: false })
    await flushPromises()
    expect(api.callsTo('/api/builder/presence')).toHaveLength(1)

    api.routes({ '/api/builder/presence': { documents: { 'template:home': [entry(9, 'Nikos Georgiou')] } } })
    await vi.advanceTimersByTimeAsync(BUILDER_PRESENCE_HEARTBEAT_MS)
    await flushPromises()

    expect(api.callsTo('/api/builder/presence')).toHaveLength(2)
    expect(wrapper.text()).toContain('Nikos Georgiou')
  })

  it('shows nothing, and does not fail, when Django cannot be asked', async () => {
    api.routes({ '/api/builder/presence': failWith(502) })

    const wrapper = await mountSuspended(BuilderPresenceNotice, { route: false })
    await flushPromises()

    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(useBuilderPresenceStore().others).toEqual({})
  })

  it('lets go of the documents when the editor is left', async () => {
    api.routes({ '/api/builder/presence': { documents: {} } })
    const wrapper = await mountSuspended(BuilderPresenceNotice, { route: false })
    await flushPromises()

    wrapper.unmount()
    await flushPromises()

    expect(api.callsTo('/api/builder/presence').at(-1)!.options).toMatchObject({ method: 'DELETE' })
  })
})
