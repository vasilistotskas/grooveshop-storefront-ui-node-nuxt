import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { useBuilderEditorStore } from '~/stores/builderEditor'
import { moveNode, setNodeHidden, setNodeSetting } from '~/utils/builderWorkingCopy'

/**
 * The editor's documents and its undo history: a change is recorded and
 * saved, undo and redo walk the history across documents, and a role that
 * may only look changes nothing.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const HOME = 'template:home'
const HEADER = 'group:header'
const url = (key: string) => `/api/builder/documents/${encodeURIComponent(key)}`

const envelope = (key: string, draft: unknown, i18n: unknown = {}): DocumentDetail => ({
  key,
  kind: key.split(':')[0] as BuilderDocumentKindEnum,
  draftRevision: 3,
  updatedAt: '2026-11-02T10:00:00+02:00',
  updatedBy: null,
  publishedVersion: 1,
  hasUnpublishedChanges: false,
  draft,
  i18n,
  draftCatalogueHash: 'h',
})
const row = (key: string) => ({ key, kind: key.split(':')[0], draftRevision: 3, updatedAt: '2026-11-02T10:00:00+02:00', updatedBy: null, publishedVersion: 1, hasUnpublishedChanges: false })

const HOME_DRAFT = {
  sections: { a: { type: 'hero_banner@1', settings: {} }, b: { type: 'products_grid@1', settings: {} } },
  order: ['a', 'b'],
}
const HEADER_DRAFT = { sections: { menu: { type: 'header_menu@1', settings: {} } }, order: ['menu'] }

async function open(role: BuilderStaffRole = 'admin') {
  const store = useBuilderEditorStore()
  store.role = role
  await store.open(HOME)
  return store
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  api.routes({
    '/api/builder/documents': [row(HOME), row(HEADER)],
    [url(HOME)]: envelope(HOME, HOME_DRAFT),
    [url(HEADER)]: envelope(HEADER, HEADER_DRAFT),
    [`${url(HOME)}/draft`]: () => envelope(HOME, HOME_DRAFT),
    [`${url(HEADER)}/draft`]: () => envelope(HEADER, HEADER_DRAFT),
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('opening documents', () => {
  it('opens the page and the store\'s groups as working copies', async () => {
    const store = await open()

    expect(store.status).toBe('ready')
    expect(Object.keys(store.opened).sort()).toEqual([HEADER, HOME])
    expect(store.opened[HOME]!.copy).toEqual({ draft: HOME_DRAFT, i18n: {} })
  })

  it.each([
    ['a block type this build does not define', { sections: { a: { type: 'gone@1', settings: {} } }, order: ['a'] }, {}],
    ['an overlay that is not one', HOME_DRAFT, { en: 'x' }],
  ])('does not open a working copy with %s', async (_case, draft, i18n) => {
    api.routes({ '/api/builder/documents': [row(HOME)], [url(HOME)]: envelope(HOME, draft, i18n) })

    const store = await open()

    expect(store.status).toBe('unreadable')
    expect(store.opened[HOME]).toBeUndefined()
  })
})

describe('moving a node', () => {
  it('moves it to the place named, as one change, and says where it went of how many', async () => {
    const store = await open()

    store.move(HOME, 'b', 0)

    expect(store.opened[HOME]!.copy.draft.order).toEqual(['b', 'a'])
    expect(store.moved).toEqual({ documentKey: HOME, nodeId: 'b', index: 0, count: 2 })
    expect(store.undo()).toBe(HOME)
    expect(store.opened[HOME]!.copy.draft.order).toEqual(['a', 'b'])
  })

  it('does nothing where it cannot go, nor for STAFF', async () => {
    const store = await open()
    store.move(HOME, 'b', 1)
    store.move(HOME, 'b', 2)
    expect(store.moved).toBeUndefined()
    expect(store.canUndo).toBe(false)

    store.role = 'staff'
    store.move(HOME, 'b', 0)
    expect(store.opened[HOME]!.copy.draft.order).toEqual(['a', 'b'])
    expect(store.moved).toBeUndefined()
  })
})

describe('changes and their history', () => {
  it('records a change, and undoes and redoes it in the document it was made in', async () => {
    const store = await open()
    const before = store.opened[HOME]!.copy
    const moved = moveNode(before, 'b', 0)

    store.change(HOME, moved)
    expect(store.opened[HOME]!.copy).toEqual(moved)
    expect(store.undo()).toBe(HOME)
    expect(store.opened[HOME]!.copy).toEqual(before)
    expect(store.redo()).toBe(HOME)
    expect(store.opened[HOME]!.copy).toEqual(moved)
  })

  it('walks back across documents, newest first', async () => {
    const store = await open()

    store.change(HOME, moveNode(store.opened[HOME]!.copy, 'b', 0))
    store.change(HEADER, setNodeHidden(store.opened[HEADER]!.copy, 'menu', true))

    expect(store.undo()).toBe(HEADER)
    expect(store.undo()).toBe(HOME)
    expect(store.canUndo).toBe(false)
  })

  it('makes typing into one setting one step, and a pause or another setting a new one', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(10_000)
    const store = await open()
    const before = store.opened[HOME]!.copy
    const type = (text: string, path = 'heading', at = 'a') =>
      store.change(HOME, setNodeSetting(store.opened[HOME]!.copy, at, path, text), { coalesce: `${at}/${path}` })

    type('Γ')
    now.mockReturnValue(10_000 + BUILDER_HISTORY_COALESCE_MS - 1)
    type('Γε')
    const word = store.opened[HOME]!.copy
    now.mockReturnValue(10_000 + 2 * BUILDER_HISTORY_COALESCE_MS)
    type('Γεια')
    type('Νέα', 'subheading')

    store.undo()
    store.undo()
    expect(store.opened[HOME]!.copy).toEqual(word)
    store.undo()
    expect(store.opened[HOME]!.copy).toEqual(before)
    expect(store.canUndo).toBe(false)
    now.mockRestore()
  })

  it('forgets what was undone once a new change is made', async () => {
    const store = await open()

    store.change(HOME, moveNode(store.opened[HOME]!.copy, 'b', 0))
    store.undo()
    store.change(HOME, setNodeHidden(store.opened[HOME]!.copy, 'a', true))

    expect(store.canRedo).toBe(false)
  })

  it(`keeps the last ${BUILDER_HISTORY_LIMIT} changes`, async () => {
    const store = await open()

    for (let i = 0; i < BUILDER_HISTORY_LIMIT + 5; i++) {
      store.change(HOME, setNodeHidden(store.opened[HOME]!.copy, 'a', i % 2 === 0))
    }
    let steps = 0
    while (store.undo()) steps++

    expect(steps).toBe(BUILDER_HISTORY_LIMIT)
  })

  it('records nothing for a change that changes nothing', async () => {
    const store = await open()

    store.change(HOME, structuredClone(store.opened[HOME]!.copy))

    expect(store.canUndo).toBe(false)
  })

  it('changes nothing for STAFF, who may only look', async () => {
    const store = await open('staff')
    const before = store.opened[HOME]!.copy

    store.change(HOME, moveNode(before, 'b', 0))

    expect(store.opened[HOME]!.copy).toBe(before)
    expect(store.canUndo).toBe(false)
  })

  it('takes someone else\'s saved copy, and drops the history of that document only', async () => {
    const store = await open()
    store.change(HOME, moveNode(store.opened[HOME]!.copy, 'b', 0))
    store.change(HEADER, setNodeHidden(store.opened[HEADER]!.copy, 'menu', true))
    const theirs = { ...envelope(HOME, { sections: { c: { type: 'hero_banner@1', settings: {} } }, order: ['c'] }), draftRevision: 9 }

    expect(store.takeTheirs(HOME, theirs)).toBe(true)

    expect(store.opened[HOME]!.copy.draft.order).toEqual(['c'])
    expect(store.opened[HOME]!.meta.draftRevision).toBe(9)
    expect(store.undo()).toBe(HEADER)
    expect(store.canUndo).toBe(false)
  })
})
