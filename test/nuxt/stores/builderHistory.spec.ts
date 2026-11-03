import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { failWith } from '~~/test/helpers/api'
import { useBuilderAutosaveStore } from '~/stores/builderAutosave'
import { useBuilderEditorStore } from '~/stores/builderEditor'
import { useBuilderHistoryStore } from '~/stores/builderHistory'

/**
 * A document's version history: read a page at a time, and a version put back
 * as the draft only once what the editor holds is saved, keeping a draft with
 * changes as a version first.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const HOME = 'template:home'
const url = `/api/builder/documents/${encodeURIComponent(HOME)}`
const DRAFT = { sections: { a: { type: 'hero_banner@1', settings: {} } }, order: ['a'] }
const OLD_DRAFT = { sections: { b: { type: 'products_grid@2', settings: { products: { mode: 'filter', ordering: 'newest', limit: 8 } } } }, order: ['b'] }

const envelope = (draftRevision: number, draft: unknown, hasUnpublishedChanges: boolean): DocumentDetail => ({
  key: HOME,
  kind: 'template',
  draftRevision,
  updatedAt: '2026-11-02T10:00:00+02:00',
  updatedBy: null,
  publishedVersion: 1,
  hasUnpublishedChanges,
  draft,
  i18n: {},
  draftCatalogueHash: 'h',
})

const version = (number: number) => ({
  id: number,
  number,
  kind: 'checkpoint',
  note: '',
  createdAt: '2026-11-02T10:00:00+02:00',
  createdBy: null,
  sizeBytes: 10,
  blockTypes: [],
  catalogueHash: 'h',
  restoredFrom: null,
})

async function openEditor(hasUnpublishedChanges: boolean) {
  api.routes({
    '/api/builder/documents': [{ key: HOME, kind: 'template', draftRevision: 3, updatedAt: '2026-11-02T10:00:00+02:00', updatedBy: null, publishedVersion: 1, hasUnpublishedChanges }],
    [url]: envelope(3, DRAFT, hasUnpublishedChanges),
    [`${url}/versions`]: (_url: string, options?: { query?: { page?: number } }) => ({
      count: 31,
      totalPages: 2,
      results: options?.query?.page === 2 ? [version(1)] : [version(3), version(2)],
    }),
    [`${url}/versions/2`]: { ...version(2), data: OLD_DRAFT, i18n: {}, refs: {} },
    [`${url}/versions/2/restore`]: envelope(4, OLD_DRAFT, true),
    [`${url}/checkpoint`]: version(4),
  })
  const editor = useBuilderEditorStore()
  editor.role = 'admin'
  await editor.open(HOME)
  return editor
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('reading the history', () => {
  it('reads the first page, then the older ones below it', async () => {
    await openEditor(false)
    const history = useBuilderHistoryStore()

    await history.load(HOME)
    expect(history.versions.map(({ number }) => number)).toEqual([3, 2])
    expect(history.hasMore).toBe(true)

    await history.more()
    expect(history.versions.map(({ number }) => number)).toEqual([3, 2, 1])
    expect(history.hasMore).toBe(false)
  })

  it('says so when the history cannot be read', async () => {
    await openEditor(false)
    api.routes({ [`${url}/versions`]: failWith(502) })
    const history = useBuilderHistoryStore()

    await history.load(HOME)

    expect(history.status).toBe('error')
  })

  it('reads a version as a working copy the canvas can draw', async () => {
    await openEditor(false)

    const copy = await useBuilderHistoryStore().read(HOME, 2)

    expect(copy).toEqual({ draft: OLD_DRAFT, i18n: {} })
  })
})

describe('restoring a version', () => {
  it('keeps a draft with changes as a version, then puts the version back as the draft', async () => {
    const editor = await openEditor(true)
    const history = useBuilderHistoryStore()

    const result = await history.restore(HOME, 2, 'Before restoring version 2')

    expect(result).toBe('restored')
    expect(api.callsTo(`${url}/checkpoint`)[0]!.options).toMatchObject({ method: 'POST', body: { note: 'Before restoring version 2' } })
    expect(api.callsTo(`${url}/versions/2/restore`)[0]!.options.headers).toEqual({ 'If-Match': '3' })
    expect(editor.opened[HOME]!.copy.draft).toEqual(OLD_DRAFT)
    expect(editor.opened[HOME]!.meta.draftRevision).toBe(4)
  })

  it('does not keep a version of a draft that is what is live', async () => {
    await openEditor(false)

    await useBuilderHistoryStore().restore(HOME, 2, 'Before restoring version 2')

    expect(api.callsTo(`${url}/checkpoint`)).toHaveLength(0)
  })

  it('touches nothing while the changes of the editor are not saved', async () => {
    await openEditor(true)
    const autosave = useBuilderAutosaveStore()
    vi.spyOn(autosave, 'save').mockResolvedValue()
    vi.spyOn(autosave, 'stateOf').mockReturnValue('pending')

    const result = await useBuilderHistoryStore().restore(HOME, 2, 'x')

    expect(result).toBe('unsaved')
    expect(api.callsTo(`${url}/versions/2/restore`)).toHaveLength(0)
  })

  it('hands a revision conflict to the conflict dialog instead of overwriting the draft of someone else', async () => {
    await openEditor(false)
    const body = { code: 'revision_conflict', detail: 'Someone else changed this document.', currentRevision: 5, updatedBy: { id: 9, name: 'Nikos' }, updatedAt: '2026-11-03T10:05:00+02:00' }
    api.routes({
      [url]: envelope(3, DRAFT, false),
      [`${url}/versions/2/restore`]: failWith(409, body),
    })

    const result = await useBuilderHistoryStore().restore(HOME, 2, 'x')

    expect(result).toBe('conflict')
    expect(useBuilderAutosaveStore().conflict).toMatchObject({ key: HOME, currentRevision: 5, updatedBy: { name: 'Nikos' } })
    expect(useBuilderEditorStore().opened[HOME]!.copy.draft).toEqual(DRAFT)
  })

  it('reports a conflict it cannot read as a failure, with no dialog to open', async () => {
    await openEditor(false)
    api.routes({
      [url]: envelope(3, DRAFT, false),
      [`${url}/versions/2/restore`]: failWith(409, { code: 'revision_conflict' }),
    })

    const result = await useBuilderHistoryStore().restore(HOME, 2, 'x')

    expect(result).toBe('failed')
    expect(useBuilderAutosaveStore().conflict).toBeUndefined()
  })
})
