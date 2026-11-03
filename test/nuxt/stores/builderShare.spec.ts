import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { failWith } from '~~/test/helpers/api'
import { useBuilderAutosaveStore } from '~/stores/builderAutosave'
import { useBuilderShareStore } from '~/stores/builderShare'

/**
 * Share-preview links: a link freezes the SAVED drafts, so making one waits
 * for the editor's own saves and makes nothing while they are not in.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const DOCUMENTS = ['template:home', 'group:header']

const link = (id: number) => ({
  id,
  documents: DOCUMENTS,
  note: '',
  createdBy: null,
  createdAt: '2026-11-03T10:00:00+02:00',
  expiresAt: '2026-11-10T10:00:00+02:00',
})

beforeEach(() => {
  setActivePinia(createPinia())
  api.routes({
    '/api/builder/preview-links': (_url: string, options?: { method?: string }) => options?.method === 'POST'
      ? { ...link(2), token: 'tok' }
      : [link(2), link(1)],
    '/api/builder/preview-links/1': undefined,
  })
})

describe('making a link', () => {
  it('saves the documents first, then freezes them behind a link and reads the list again', async () => {
    const autosave = useBuilderAutosaveStore()
    const save = vi.spyOn(autosave, 'save').mockResolvedValue()
    vi.spyOn(autosave, 'stateOf').mockReturnValue('saved')
    const share = useBuilderShareStore()

    const made = await share.create(DOCUMENTS, 'For Maria')

    expect(save.mock.calls.map(([key]) => key)).toEqual(DOCUMENTS)
    expect(made).toMatchObject({ id: 2, token: 'tok' })
    expect(api.callsTo('/api/builder/preview-links')[0]!.options).toMatchObject({ method: 'POST', body: { documents: DOCUMENTS, note: 'For Maria' } })
    expect(share.links.map(({ id }) => id)).toEqual([2, 1])
  })

  it('makes nothing while the changes of the editor are not saved', async () => {
    const autosave = useBuilderAutosaveStore()
    vi.spyOn(autosave, 'save').mockResolvedValue()
    vi.spyOn(autosave, 'stateOf').mockImplementation(key => key === 'template:home' ? 'pending' : 'saved')

    const made = await useBuilderShareStore().create(DOCUMENTS, '')

    expect(made).toBe('unsaved')
    expect(api.callsTo('/api/builder/preview-links')).toHaveLength(0)
  })

  it('leaves the note out when there is none', async () => {
    const autosave = useBuilderAutosaveStore()
    vi.spyOn(autosave, 'save').mockResolvedValue()
    vi.spyOn(autosave, 'stateOf').mockReturnValue('saved')

    await useBuilderShareStore().create(DOCUMENTS, '')

    expect(api.callsTo('/api/builder/preview-links')[0]!.options.body).toEqual({ documents: DOCUMENTS })
  })
})

describe('the open links', () => {
  it('lists them, and says so when they cannot be read', async () => {
    const share = useBuilderShareStore()
    await share.load()
    expect(share.links).toHaveLength(2)
    expect(share.status).toBe('ready')

    api.routes({ '/api/builder/preview-links': failWith(502) })
    await share.load()
    expect(share.status).toBe('error')
  })

  it('drops a link from the list once Django has revoked it', async () => {
    const share = useBuilderShareStore()
    await share.load()

    await share.revoke(1)

    expect(api.callsTo('/api/builder/preview-links/1')[0]!.options).toMatchObject({ method: 'DELETE' })
    expect(share.links.map(({ id }) => id)).toEqual([2])
  })
})
