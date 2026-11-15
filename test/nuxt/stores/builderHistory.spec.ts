import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { failWith } from '~~/test/helpers/api'
import { makeBuilderDocumentRow } from '~~/test/fixtures/builderDocument'
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
const DRAFT = { sections: { a: { type: 'hero_banner@2', settings: {} } }, order: ['a'] }
const OLD_DRAFT = { sections: { b: { type: 'products_grid@3', settings: { products: { mode: 'filter', ordering: 'newest', limit: 8 } } } }, order: ['b'] }

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
    '/api/builder/documents': [makeBuilderDocumentRow({ key: HOME, hasUnpublishedChanges })],
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
      [`${url}/versions/2`]: { ...version(2), data: OLD_DRAFT, i18n: {}, refs: {} },
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
      [`${url}/versions/2`]: { ...version(2), data: OLD_DRAFT, i18n: {}, refs: {} },
      [`${url}/versions/2/restore`]: failWith(409, { code: 'revision_conflict' }),
    })

    const result = await useBuilderHistoryStore().restore(HOME, 2, 'x')

    expect(result).toBe('failed')
    expect(useBuilderAutosaveStore().conflict).toBeUndefined()
  })
})

/**
 * The theme is a document like the page, opened with it: an earlier look is
 * read for the preview and put back as the draft the theme panel edits and the
 * canvas draws, and the next change saves against the restored revision.
 */
describe('the theme', () => {
  const THEME_URL = `/api/builder/documents/${BUILDER_THEME_DOCUMENT}`
  const themeDraft = (accent: string) => {
    const settings = themeDefaultsFor(null)
    settings.colors.light.accent = accent
    return { settings, sections: {}, order: [] }
  }
  const themeEnvelope = (draftRevision: number, draft: unknown, hasUnpublishedChanges: boolean): DocumentDetail => ({
    ...envelope(draftRevision, draft, hasUnpublishedChanges),
    key: BUILDER_THEME_DOCUMENT,
    kind: 'theme',
  })
  const accentOf = (copy: BuilderWorkingCopy | undefined) => zThemeSettings.parse(copy?.draft.settings).colors.light.accent

  async function openWithTheme(extra: Record<string, unknown> = {}) {
    api.routes({
      '/api/builder/documents': [makeBuilderDocumentRow({ key: HOME }), makeBuilderDocumentRow({ key: BUILDER_THEME_DOCUMENT })],
      [url]: envelope(3, DRAFT, false),
      [THEME_URL]: themeEnvelope(5, themeDraft('#111111'), false),
      [`${THEME_URL}/versions/2`]: { ...version(2), data: themeDraft('#222222'), i18n: {}, refs: {} },
      [`${THEME_URL}/versions/2/restore`]: themeEnvelope(6, themeDraft('#222222'), true),
      [`${THEME_URL}/draft`]: (_url: string, options: { body: BuilderWorkingCopy }) => themeEnvelope(7, options.body.draft, true),
      ...extra,
    })
    const editor = useBuilderEditorStore()
    editor.role = 'admin'
    await editor.open(HOME)
    return editor
  }

  it('reads an earlier theme as a copy the preview draws', async () => {
    await openWithTheme()

    const copy = await useBuilderHistoryStore().read(BUILDER_THEME_DOCUMENT, 2)

    expect(accentOf(copy)).toBe('#222222')
  })

  it('reads a theme whose colours this build cannot read as one it cannot open', async () => {
    await openWithTheme({ [`${THEME_URL}/versions/3`]: { ...version(3), data: { settings: { colors: 'old' }, sections: {}, order: [] }, i18n: {}, refs: {} } })

    expect(await useBuilderHistoryStore().read(BUILDER_THEME_DOCUMENT, 3)).toBeUndefined()
  })

  it('puts an earlier theme back as the draft the editor draws, and saves the next change against it without a reload', async () => {
    const editor = await openWithTheme()
    const autosave = useBuilderAutosaveStore()

    const result = await useBuilderHistoryStore().restore(BUILDER_THEME_DOCUMENT, 2, 'x')

    expect(result).toBe('restored')
    expect(api.callsTo(`${THEME_URL}/versions/2/restore`)[0]!.options.headers).toEqual({ 'If-Match': '5' })
    expect(accentOf(editor.theme?.copy)).toBe('#222222')
    expect(autosave.stateOf(BUILDER_THEME_DOCUMENT)).toBe('saved')

    const next = themeDraft('#333333')
    editor.change(BUILDER_THEME_DOCUMENT, { ...editor.theme!.copy, draft: { ...editor.theme!.copy.draft, settings: next.settings } })
    await autosave.save(BUILDER_THEME_DOCUMENT)

    expect(api.callsTo(`${THEME_URL}/draft`)[0]!.options.headers).toEqual({ 'If-Match': '6' })
    expect(autosave.stateOf(BUILDER_THEME_DOCUMENT)).toBe('saved')
  })

  // Django puts back whatever a version holds, and the envelope of a theme
  // takes any settings: an earlier theme this build cannot read would land as
  // a draft the panel cannot edit, the canvas cannot draw and Django will not
  // publish. It is refused before Django is asked, and remembered.
  it('refuses to put back a theme whose settings this build cannot read, before asking Django', async () => {
    const editor = await openWithTheme({ [`${THEME_URL}/versions/3`]: { ...version(3), data: { settings: { colors: 'old' }, sections: {}, order: [] }, i18n: {}, refs: {} } })
    const history = useBuilderHistoryStore()
    await history.load(BUILDER_THEME_DOCUMENT)

    const result = await history.restore(BUILDER_THEME_DOCUMENT, 3, 'x')

    expect(result).toBe('unreadable')
    expect(api.callsTo(`${THEME_URL}/versions/3/restore`)).toHaveLength(0)
    expect(api.callsTo(`${THEME_URL}/checkpoint`)).toHaveLength(0)
    expect(accentOf(editor.theme?.copy)).toBe('#111111')
    expect(history.unreadable.has(3)).toBe(true)
  })

  it('leaves the theme the editor holds as it is when the restored one cannot be opened', async () => {
    const editor = await openWithTheme({ [`${THEME_URL}/versions/2/restore`]: themeEnvelope(6, { sections: 'old' }, true) })

    const result = await useBuilderHistoryStore().restore(BUILDER_THEME_DOCUMENT, 2, 'x')

    expect(result).toBe('unreadable')
    expect(accentOf(editor.theme?.copy)).toBe('#111111')
  })

  it('hands a theme saved by someone else in between to the conflict dialog', async () => {
    const body = { code: 'revision_conflict', detail: 'Someone else changed this document.', currentRevision: 8, updatedBy: { id: 9, name: 'Nikos' }, updatedAt: '2026-11-03T10:05:00+02:00' }
    const editor = await openWithTheme({ [`${THEME_URL}/versions/2/restore`]: failWith(409, body) })

    const result = await useBuilderHistoryStore().restore(BUILDER_THEME_DOCUMENT, 2, 'x')

    expect(result).toBe('conflict')
    expect(useBuilderAutosaveStore().conflict).toMatchObject({ key: BUILDER_THEME_DOCUMENT, currentRevision: 8 })
    expect(accentOf(editor.theme?.copy)).toBe('#111111')
  })
})
