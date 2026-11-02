import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { useBuilderAutosaveStore } from '~/stores/builderAutosave'
import { useBuilderEditorStore } from '~/stores/builderEditor'
import { setNodeHidden } from '~/utils/builderWorkingCopy'
import { readBuilderRecovery } from '~/utils/builderRecovery'
import { failWith } from '~~/test/helpers/api'

/**
 * The editor's autosave: a change waits out the autosave delay, then the
 * whole working copy goes to the store against the revision it was made on.
 * Every outcome leaves the work somewhere: saved, kept for the next session,
 * or waiting on the staff member's choice.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const HOME = 'template:home'
const LIST = '/api/builder/documents'
const DETAIL = `/api/builder/documents/${encodeURIComponent(HOME)}`
const DRAFT = `${DETAIL}/draft`

const draft = { sections: { hero: { type: 'hero_banner@1', settings: { heading: 'Γεια' } } }, order: ['hero'] }
const envelope = (revision: number, overrides: Record<string, unknown> = {}) => ({
  key: HOME,
  kind: 'template',
  draftRevision: revision,
  updatedAt: '2026-11-02T10:00:00+02:00',
  updatedBy: null,
  publishedVersion: 1,
  hasUnpublishedChanges: false,
  draft,
  i18n: {},
  draftCatalogueHash: 'h',
  ...overrides,
})
const row = { key: HOME, kind: 'template', draftRevision: 3, updatedAt: '2026-11-02T10:00:00+02:00', updatedBy: null, publishedVersion: 1, hasUnpublishedChanges: false }

const saves = () => api.callsTo(DRAFT)

async function openHome() {
  const editor = useBuilderEditorStore()
  editor.role = 'admin'
  await editor.open(HOME)
  return editor
}

/** Hides the hero: a change the editor records and hands to the autosave. */
function changeOnce(editor: ReturnType<typeof useBuilderEditorStore>, hidden = true) {
  editor.change(HOME, setNodeHidden(editor.opened[HOME]!.copy, 'hero', hidden))
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  vi.setSystemTime(new Date('2026-11-02T12:00:00Z'))
  api.routes({ [LIST]: [row], [DETAIL]: envelope(3), [DRAFT]: (_url: string, options: { body: unknown }) => envelope(4, { draft: (options.body as { draft: unknown }).draft }) })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the autosave', () => {
  it('waits for the editor to be still, then saves the whole working copy against its revision', async () => {
    const editor = await openHome()
    const autosave = useBuilderAutosaveStore()

    changeOnce(editor)
    expect(autosave.stateOf(HOME)).toBe('pending')
    await vi.advanceTimersByTimeAsync(BUILDER_AUTOSAVE_DELAY_MS - 1)
    expect(saves()).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(1)

    expect(saves()).toHaveLength(1)
    expect(saves()[0]!.options).toMatchObject({ method: 'PUT', headers: { 'If-Match': '3' }, body: editor.opened[HOME]!.copy })
    expect(autosave.stateOf(HOME)).toBe('saved')
    expect(editor.opened[HOME]!.meta.draftRevision).toBe(4)
  })

  it('saves a burst of changes once', async () => {
    const editor = await openHome()

    changeOnce(editor, true)
    await vi.advanceTimersByTimeAsync(BUILDER_AUTOSAVE_DELAY_MS / 2)
    changeOnce(editor, false)
    await vi.advanceTimersByTimeAsync(BUILDER_AUTOSAVE_DELAY_MS / 2)
    changeOnce(editor, true)
    await vi.advanceTimersByTimeAsync(BUILDER_AUTOSAVE_DELAY_MS)

    expect(saves()).toHaveLength(1)
  })

  it('stops on someone else\'s save, and keeps mine on request against their revision', async () => {
    const editor = await openHome()
    const autosave = useBuilderAutosaveStore()
    api.routes({ [DRAFT]: failWith(409, { code: 'revision_conflict', detail: 'x', currentRevision: 7, updatedBy: { id: 9, name: 'Nikos' }, updatedAt: '2026-11-02T11:00:00+02:00' }) })

    changeOnce(editor)
    await vi.advanceTimersByTimeAsync(BUILDER_AUTOSAVE_DELAY_MS)

    expect(autosave.stateOf(HOME)).toBe('conflict')
    expect(autosave.conflict).toMatchObject({ key: HOME, currentRevision: 7, updatedBy: { name: 'Nikos' } })
    changeOnce(editor, false)
    await vi.advanceTimersByTimeAsync(BUILDER_AUTOSAVE_DELAY_MS * 2)
    expect(saves()).toHaveLength(1)

    api.routes({ [DRAFT]: () => envelope(8) })
    await autosave.keepMine(HOME)

    expect(saves().at(-1)!.options.headers).toEqual({ 'If-Match': '7' })
    expect(autosave.stateOf(HOME)).toBe('saved')
  })

  it('says which problems Django found when it refuses the document', async () => {
    const editor = await openHome()
    const autosave = useBuilderAutosaveStore()
    const errors = [{ path: '/sections/hero/settings/heading', code: 'invalid_settings', message: 'Too long.' }]
    api.routes({ [DRAFT]: failWith(400, { code: 'invalid_document', detail: 'x', errors }) })

    changeOnce(editor)
    await vi.advanceTimersByTimeAsync(BUILDER_AUTOSAVE_DELAY_MS)

    expect(autosave.saves[HOME]).toMatchObject({ state: 'invalid', problems: errors })
  })

  it('keeps the changes in this browser when the session has ended', async () => {
    const editor = await openHome()
    const autosave = useBuilderAutosaveStore()
    api.routes({ [DRAFT]: failWith(401) })

    changeOnce(editor)
    await vi.advanceTimersByTimeAsync(BUILDER_AUTOSAVE_DELAY_MS)

    expect(autosave.stateOf(HOME)).toBe('signedOut')
    expect(readBuilderRecovery(useRequestURL().host, HOME)).toEqual({
      revision: 3,
      copy: editor.opened[HOME]!.copy,
      keptAt: '2026-11-02T12:00:01.000Z',
    })
  })

  it.each([
    ['the store cannot be reached', () => {
      throw new TypeError('Failed to fetch')
    }],
    ['Django cannot check the save', failWith(503, { code: 'storefront_unavailable', detail: 'x' })],
    ['the store answers a server error', failWith(502)],
  ])('tries again, waiting longer each time, when %s; then saves and forgets the kept copy', async (_case, failure) => {
    const editor = await openHome()
    const autosave = useBuilderAutosaveStore()
    api.routes({ [DRAFT]: failure })

    changeOnce(editor)
    await vi.advanceTimersByTimeAsync(BUILDER_AUTOSAVE_DELAY_MS)
    expect(autosave.stateOf(HOME)).toBe('retrying')
    expect(readBuilderRecovery(useRequestURL().host, HOME)).toBeDefined()
    await vi.advanceTimersByTimeAsync(BUILDER_AUTOSAVE_RETRY_MS[0])
    expect(saves()).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(BUILDER_AUTOSAVE_RETRY_MS[0])
    expect(saves()).toHaveLength(2)

    api.routes({ [DRAFT]: () => envelope(4) })
    await vi.advanceTimersByTimeAsync(BUILDER_AUTOSAVE_RETRY_MS[1])

    expect(saves()).toHaveLength(3)
    expect(autosave.stateOf(HOME)).toBe('saved')
    expect(readBuilderRecovery(useRequestURL().host, HOME)).toBeUndefined()
  })

  it('stops after every wait, keeps the changes, and tries again on request', async () => {
    const editor = await openHome()
    const autosave = useBuilderAutosaveStore()
    api.routes({ [DRAFT]: failWith(502) })

    changeOnce(editor)
    await vi.advanceTimersByTimeAsync(BUILDER_AUTOSAVE_DELAY_MS + BUILDER_AUTOSAVE_RETRY_MS.reduce((total, wait) => total + wait, 0))

    expect(saves()).toHaveLength(BUILDER_AUTOSAVE_RETRY_MS.length + 1)
    expect(autosave.stateOf(HOME)).toBe('failed')
    expect(readBuilderRecovery(useRequestURL().host, HOME)).toBeDefined()
    await vi.advanceTimersByTimeAsync(BUILDER_AUTOSAVE_RETRY_MS.at(-1)! * 2)
    expect(saves()).toHaveLength(BUILDER_AUTOSAVE_RETRY_MS.length + 1)

    api.routes({ [DRAFT]: () => envelope(4) })
    autosave.retry()
    await vi.advanceTimersByTimeAsync(0)

    expect(autosave.stateOf(HOME)).toBe('saved')
  })

  it('does not try again a refusal no retry changes', async () => {
    const editor = await openHome()
    const autosave = useBuilderAutosaveStore()
    api.routes({ [DRAFT]: failWith(403, { detail: 'x' }) })

    changeOnce(editor)
    await vi.advanceTimersByTimeAsync(BUILDER_AUTOSAVE_DELAY_MS + BUILDER_AUTOSAVE_RETRY_MS[0])

    expect(saves()).toHaveLength(1)
    expect(autosave.stateOf(HOME)).toBe('failed')
  })

  it('saves what waits right away when the page is left, with a request that outlives it', async () => {
    const editor = await openHome()

    changeOnce(editor)
    useBuilderAutosaveStore().flush()
    await vi.advanceTimersByTimeAsync(0)

    expect(saves()).toHaveLength(1)
    expect(saves()[0]!.options.keepalive).toBe(true)
  })

  it('reports the most urgent state of all documents', async () => {
    const editor = await openHome()
    const autosave = useBuilderAutosaveStore()

    expect(autosave.overall).toBe('saved')
    changeOnce(editor)
    expect(autosave.overall).toBe('pending')
  })
})
