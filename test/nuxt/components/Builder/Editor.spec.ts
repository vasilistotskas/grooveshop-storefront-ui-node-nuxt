import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import { UApp } from '#components'
import BuilderEditor from '~/components/Builder/Editor.vue'
import BuilderLayout from '~/layouts/builder.vue'
import { failWith } from '~~/test/helpers/api'
import { useBuilderAutosaveStore } from '~/stores/builderAutosave'
import { resetBuilderEditorStores } from '~~/test/helpers/builderEditor'
import { useBuilderLibraryStore } from '~/stores/builderLibrary'
import { setTenantFeatures } from '~~/test/helpers/tenant'
import Sortable from 'sortablejs'
import type { SortableEvent } from 'sortablejs'
import type { BuilderSessionInfo } from '~~/shared/schemas/builderSession'

/**
 * The page editor around a signed-in staff member: it opens the page the
 * address names (the home page by default) with the store's section groups,
 * lists them in the outline in the order the storefront draws them, keeps
 * the selection in the address, and switches pages from the top bar.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
// The record pickers read through `useLazyApi`, which fetches with Nuxt's `$fetch`.
mockNuxtImport('$fetch', () => api)

const session: BuilderSessionInfo = { staff: { id: 7, name: 'Maria Papadopoulou', role: 'admin' }, expiresAt: '2026-11-02T18:00:00+02:00' }

const row = (key: string, kind: string) => ({
  key,
  kind,
  draftRevision: 2,
  updatedAt: '2026-11-02T10:00:00+02:00',
  updatedBy: null,
  publishedVersion: 1,
  hasUnpublishedChanges: false,
})

const detail = <Draft>(key: string, kind: string, draft: Draft) => ({ ...row(key, kind), draft, i18n: {}, draftCatalogueHash: 'h' })

const HOME = detail('template:home', 'template', {
  sections: {
    hero: {
      type: 'hero_banner@1',
      settings: { heading: 'Ενέργεια για όλη τη μέρα' },
      blocks: { s1: { type: 'stat@1', settings: { label: 'παραγγελίες', value: '2.500+' } } },
      blockOrder: ['s1'],
    },
    grid: { type: 'products_grid@1', settings: {} },
    news: { type: 'newsletter_signup@1', disabled: true, settings: {} },
  },
  order: ['hero', 'grid', 'news'],
})
const HEADER = detail('group:header', 'group', { sections: { menu: { type: 'header_menu@1', settings: {} } }, order: ['menu'] })
const FOOTER = detail('group:footer', 'group', { sections: { menu: { type: 'footer_menu@1', settings: {} } }, order: ['menu'] })
const ABOUT = detail('page:summer-sale', 'page', { sections: {}, order: [] })

const LIST = [row('group:footer', 'group'), row('group:header', 'group'), row('page:summer-sale', 'page'), row('template:home', 'template')]

const documentUrl = (key: string) => `/api/builder/documents/${encodeURIComponent(key)}`

beforeEach(() => {
  resetBuilderEditorStores()
  api.routes({
    '/api/builder/documents': LIST,
    [documentUrl('template:home')]: HOME,
    [documentUrl('group:header')]: HEADER,
    [documentUrl('group:footer')]: FOOTER,
    [documentUrl('page:summer-sale')]: ABOUT,
  })
})

const framed = (as: typeof session) => defineComponent({
  // UApp, as `app.vue` mounts it: the tooltips and menus need its providers.
  render: () => h(UApp, null, { default: () => h(BuilderLayout, null, { default: () => h(BuilderEditor, { session: as }) }) }),
})

async function open(route = '/_builder', as = session) {
  const wrapper = await mountSuspended(framed(as), { route })
  await vi.waitFor(() => expect(useBuilderEditorStore().status).not.toBe('loading'))
  await flushPromises()
  return wrapper
}

/** The outline's sections, each heading with the rows of its tree, as a screen reader meets them. */
function outline(wrapper: Awaited<ReturnType<typeof open>>) {
  return wrapper.findAll('nav[aria-label="Δομή σελίδας"] section').map(section => ({
    heading: section.get('h2').text(),
    rows: section.findAll('[role="treeitem"]').map(item => item.text().replace(/\s+/g, ' ').trim()),
  }))
}

describe('the page editor', () => {
  it('opens the home page with the store\'s groups, in the order the storefront draws them', async () => {
    const wrapper = await open()

    expect(outline(wrapper)).toEqual([
      { heading: 'Κεφαλίδα, σε κάθε σελίδα', rows: ['Μενού κεφαλίδας'] },
      { heading: 'Αυτή η σελίδα', rows: ['Ενέργεια για όλη τη μέρα, Κεντρικό banner', 'Πλέγμα προϊόντων', 'Εγγραφή στο newsletter, Κρυφό'] },
      { heading: 'Υποσέλιδο, σε κάθε σελίδα', rows: ['Μενού υποσέλιδου'] },
    ])
    expect(api.callsTo('/api/builder/documents/*').map(call => call.url).sort())
      .toEqual([documentUrl('group:footer'), documentUrl('group:header'), documentUrl('template:home')])
  })

  it('opens the page the address names, and its sections\' blocks around the selected one', async () => {
    const wrapper = await open('/_builder?doc=template:home&node=template:home/s1')

    const selected = wrapper.findAll('[role="treeitem"][aria-selected="true"]')
    expect(selected.map(item => item.text().replace(/\s+/g, ' ').trim())).toEqual(['παραγγελίες, Αριθμός'])
  })

  it('keeps a selection in the address, replacing the entry', async () => {
    const wrapper = await open()
    const replace = vi.spyOn(useRouter(), 'replace')

    await wrapper.findAll('[role="treeitem"]').find(item => item.text().includes('Πλέγμα προϊόντων'))!.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    await vi.waitFor(() => expect(useRoute().query.node).toBe('template:home/grid'))
    expect(replace).toHaveBeenCalled()
  })

  it('says a page has no sections yet', async () => {
    const wrapper = await open('/_builder?doc=page:summer-sale')

    expect(outline(wrapper)[1]).toEqual({ heading: 'Αυτή η σελίδα', rows: [] })
    expect(wrapper.text()).toContain('Δεν έχει ενότητες ακόμη.')
  })

  it('says the store has no such page, and offers the home page', async () => {
    const wrapper = await open('/_builder?doc=page:gone')

    expect(wrapper.text()).toContain('Η σελίδα δεν βρέθηκε')
    await wrapper.findAll('button').find(button => button.text() === 'Άνοιγμα της αρχικής σελίδας')!.trigger('click')
    await vi.waitFor(() => expect(useRoute().query.doc).toBe('template:home'))
  })

  it('does not open a working copy this build cannot read, and says so', async () => {
    api.routes({
      '/api/builder/documents': LIST,
      [documentUrl('template:home')]: detail('template:home', 'template', { sections: { a: { type: 'x@1', settings: {} } }, order: [] }),
      [documentUrl('group:header')]: HEADER,
      [documentUrl('group:footer')]: FOOTER,
    })

    const wrapper = await open()

    expect(wrapper.text()).toContain('Η σελίδα δεν ανοίγει')
    expect(wrapper.find('nav[aria-label="Δομή σελίδας"]').exists()).toBe(false)
  })

  it('says the store could not be reached, and tries again on request', async () => {
    api.routes({ '/api/builder/documents': failWith(502) })
    const wrapper = await open()
    expect(wrapper.text()).toContain('Η σελίδα δεν φορτώθηκε')

    api.routes({
      '/api/builder/documents': LIST,
      [documentUrl('template:home')]: HOME,
      [documentUrl('group:header')]: HEADER,
      [documentUrl('group:footer')]: FOOTER,
    })
    await wrapper.findAll('button').find(button => button.text() === 'Δοκιμάστε ξανά')!.trigger('click')
    await vi.waitFor(() => expect(useBuilderEditorStore().status).toBe('ready'))
  })

  it('names the store pages and the store\'s own pages in the page switcher', async () => {
    const wrapper = await open()

    await wrapper.get('button[aria-label="Σελίδα για επεξεργασία"]').trigger('click')
    await flushPromises()
    const options = [...document.querySelectorAll('[role="option"]')].map(option => option.textContent?.trim())

    expect(options).toEqual(['Αρχική σελίδα', '/summer-sale'])
  })

  describe('for STAFF, who may look but not change', () => {
    const staffSession = { ...session, staff: { ...session.staff, role: 'staff' as const } }

    it('says the editor is view only, and why', async () => {
      const wrapper = await open('/_builder', staffSession)

      expect(useBuilderEditorStore().canEdit).toBe(false)
      await wrapper.findAll('button').find(button => button.text() === 'Μόνο προβολή')!.trigger('click')
      await flushPromises()

      expect(document.body.textContent).toContain('Ο ρόλος σας (Προσωπικό) επιτρέπει να βλέπετε τις σελίδες του καταστήματος, όχι να τις αλλάζετε.')
    })

    it('still lets them browse the outline', async () => {
      const wrapper = await open('/_builder', staffSession)

      expect(outline(wrapper).map(tree => tree.heading)).toEqual(['Κεφαλίδα, σε κάθε σελίδα', 'Αυτή η σελίδα', 'Υποσέλιδο, σε κάθε σελίδα'])
    })
  })

  it.each(['admin', 'owner', 'superuser'] as const)('lets %s edit, without a view-only notice', async (role) => {
    const wrapper = await open('/_builder', { ...session, staff: { ...session.staff, role } })

    expect(useBuilderEditorStore().canEdit).toBe(true)
    expect(wrapper.text()).not.toContain('Μόνο προβολή')
  })

  it('signs out from the account menu', async () => {
    const wrapper = await open()

    await wrapper.get('button[aria-label="Λογαριασμός: Maria Papadopoulou"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    ;([...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(item => item.textContent?.includes('Αποσύνδεση')))!.click()
    await flushPromises()

    expect(wrapper.findComponent(BuilderEditor).emitted('signOut')).toHaveLength(1)
  })
})

describe('the preview', () => {
  /** The canvas's window, as a message port: a real source a message can name. */
  let canvas: MessagePort
  let sent: ReturnType<typeof vi.fn<MessagePort['postMessage']>>

  async function openWithCanvas(route = '/_builder', as = session) {
    const wrapper = await open(route, as)
    canvas = new MessageChannel().port1
    sent = vi.fn<MessagePort['postMessage']>()
    vi.spyOn(canvas, 'postMessage').mockImplementation(sent)
    Object.defineProperty(wrapper.get('iframe').element, 'contentWindow', { value: canvas, configurable: true })
    return wrapper
  }

  function tell(data: Record<string, unknown>, source: MessageEventSource = canvas) {
    window.dispatchEvent(new MessageEvent('message', { data: { channel: BUILDER_CANVAS_CHANNEL, ...data }, source, origin: window.location.origin }))
  }

  const sentKeys = () => sent.mock.calls.map(([command]) => command).filter(command => command.type === 'documents').map(command => Object.keys(command.documents))
  const selections = () => sent.mock.calls.map(([command]) => command).filter(command => command.type === 'select').map(command => command.node)
  const box = (node: string) => ({ node, x: 0, y: 120, width: 800, height: 300 })

  it('draws the page at its own address, asked for as the preview', async () => {
    const wrapper = await openWithCanvas()
    const frame = wrapper.get('iframe')

    expect(frame.attributes('src')).toBe('/?builder-canvas')
    expect(frame.attributes('title')).toBe('Προεπισκόπηση: Αρχική σελίδα')
    expect(frame.attributes('sandbox')).toBe('allow-same-origin allow-scripts')
    expect(wrapper.text()).toContain('Η προεπισκόπηση σχεδιάζεται')
  })

  it('sends the page and its groups once the canvas listens, and again on every change', async () => {
    const wrapper = await openWithCanvas('/_builder?node=template:home/hero')

    tell({ type: 'ready' })
    expect(sentKeys()).toEqual([['template:home', 'group:header', 'group:footer']])
    expect(sent.mock.calls[0]![1]).toBe(window.location.origin)

    await wrapper.get('button[aria-label="Μετακίνηση κάτω"]').trigger('click')
    await flushPromises()

    const documentsSent = sent.mock.calls.map(([command]) => command).filter(command => command.type === 'documents')
    expect(documentsSent).toHaveLength(2)
    expect(documentsSent[1].documents['template:home'].draft.order).toEqual(['grid', 'hero', 'news'])
  })

  it('shows the preview once drawn, and says when it could not be updated, offering to try again', async () => {
    const wrapper = await openWithCanvas()

    tell({ type: 'drawn' })
    await flushPromises()
    expect(wrapper.text()).not.toContain('Η προεπισκόπηση σχεδιάζεται')

    tell({ type: 'failed' })
    await flushPromises()
    expect(wrapper.text()).toContain('Η προεπισκόπηση δεν ενημερώθηκε')
    await wrapper.findAll('button').find(button => button.text() === 'Δοκιμή ξανά')!.trigger('click')
    expect(sent).toHaveBeenCalledTimes(1)
  })

  it('takes no message from another window', async () => {
    const wrapper = await openWithCanvas()

    tell({ type: 'drawn' }, new MessageChannel().port1)
    await flushPromises()

    expect(wrapper.text()).toContain('Η προεπισκόπηση σχεδιάζεται')
  })

  it('opens the page a link in the preview leads to', async () => {
    await openWithCanvas()

    tell({ type: 'navigate', path: '/summer-sale' })
    await flushPromises()

    await vi.waitFor(() => expect(useRoute().query.doc).toBe('page:summer-sale'))
  })

  it('says a link leads to a page the editor does not build', async () => {
    await openWithCanvas()

    tell({ type: 'navigate', path: '/cart' })
    await flushPromises()

    await vi.waitFor(() => expect(document.body.textContent).toContain('Αυτή η σελίδα δεν φτιάχνεται εδώ'))
    expect(useRoute().query.doc).toBeUndefined()
  })

  it('selects a section clicked in the preview', async () => {
    await openWithCanvas()

    tell({ type: 'pick', node: 'grid' })
    await flushPromises()

    await vi.waitFor(() => expect(useRoute().query.node).toBe('template:home/grid'))
  })

  it('tells the preview what is selected once it listens, and every time it changes', async () => {
    const wrapper = await openWithCanvas('/_builder?node=template:home/hero')

    tell({ type: 'ready' })
    await wrapper.findAll('[role="treeitem"]').find(item => item.text().startsWith('Πλέγμα προϊόντων'))!.trigger('click')
    await flushPromises()

    await vi.waitFor(() => expect(selections()).toEqual(['hero', 'grid']))
  })

  it('tells the preview nothing is selected there when the selection is a section group\'s', async () => {
    await openWithCanvas('/_builder?node=group:header/menu')

    tell({ type: 'ready' })

    expect(selections()).toEqual([null])
  })

  it('outlines the section under the pointer and the selected one, with the selection\'s toolbar', async () => {
    const wrapper = await openWithCanvas('/_builder?node=template:home/hero')

    tell({ type: 'boxes', hover: box('grid'), selected: box('hero') })
    await flushPromises()

    expect(wrapper.find('[data-builder-outline="hover"]').exists()).toBe(true)
    expect(wrapper.find('[data-builder-outline="selected"]').exists()).toBe(true)
    expect(wrapper.findAll('[role="toolbar"]')).toHaveLength(2)

    tell({ type: 'boxes', hover: null, selected: null })
    await flushPromises()
    expect(wrapper.find('[data-builder-outline]').exists()).toBe(false)
  })

  it('outlines the selection for STAFF, with no toolbar to change it', async () => {
    const wrapper = await openWithCanvas('/_builder?node=template:home/hero', { ...session, staff: { ...session.staff, role: 'staff' } })

    tell({ type: 'boxes', hover: null, selected: box('hero') })
    await flushPromises()

    expect(wrapper.find('[data-builder-outline="selected"]').exists()).toBe(true)
    expect(wrapper.find('[role="toolbar"]').exists()).toBe(false)
  })

  describe('adding from the preview', () => {
    const points = (wrapper: Awaited<ReturnType<typeof openWithCanvas>>) =>
      wrapper.findAll('[data-builder-insert]').map(point => point.attributes('aria-label'))

    it('offers to add a section below the one under the pointer, and above the first', async () => {
      const wrapper = await openWithCanvas()

      tell({ type: 'boxes', hover: box('grid'), selected: null })
      await flushPromises()
      expect(points(wrapper)).toEqual(['Προσθήκη ενότητας κάτω από: Πλέγμα προϊόντων'])

      tell({ type: 'boxes', hover: box('hero'), selected: null })
      await flushPromises()
      expect(points(wrapper)).toEqual(['Προσθήκη ενότητας κάτω από: Ενέργεια για όλη τη μέρα', 'Προσθήκη ενότητας πάνω από: Ενέργεια για όλη τη μέρα'])
    })

    it('opens the library at the place the point names', async () => {
      const wrapper = await openWithCanvas()
      tell({ type: 'boxes', hover: box('grid'), selected: null })
      await flushPromises()

      await wrapper.get('[data-builder-insert]').trigger('click')

      expect(useBuilderLibraryStore().target).toEqual({ documentKey: 'template:home', index: 2 })
    })

    it('keeps a point while the pointer is on it, though it left the frame', async () => {
      const wrapper = await openWithCanvas()
      tell({ type: 'boxes', hover: box('grid'), selected: null })
      await flushPromises()

      await wrapper.get('[data-builder-insert]').trigger('mouseenter')
      tell({ type: 'boxes', hover: null, selected: null })
      await flushPromises()
      expect(points(wrapper)).toHaveLength(1)

      await wrapper.get('[data-builder-insert]').trigger('mouseleave')
      tell({ type: 'boxes', hover: null, selected: null })
      await flushPromises()
      expect(points(wrapper)).toEqual([])
    })

    it('offers STAFF nowhere to add', async () => {
      const wrapper = await openWithCanvas('/_builder', { ...session, staff: { ...session.staff, role: 'staff' } })

      tell({ type: 'boxes', hover: box('grid'), selected: null })
      await flushPromises()

      expect(points(wrapper)).toEqual([])
    })
  })

  it('draws the page at a device\'s width, kept in the address', async () => {
    const wrapper = await openWithCanvas()

    await wrapper.get('button[aria-label="Κινητό"]').trigger('click')
    await flushPromises()

    await vi.waitFor(() => expect(useRoute().query.device).toBe('phone'))
    expect(wrapper.get('iframe').attributes('style')).toContain(`width: ${BUILDER_PREVIEW_DEVICES.phone}px`)
    expect(wrapper.get('button[aria-label="Κινητό"]').attributes('aria-pressed')).toBe('true')
  })
})

describe('editing the structure of a page', () => {
  const DRAFT_URL = `${documentUrl('template:home')}/draft`
  const HERO = '/_builder?node=template:home/hero'

  /** The rows of "This page". */
  const pageRows = (wrapper: Awaited<ReturnType<typeof open>>) => outline(wrapper)[1]!.rows

  const button = (wrapper: Awaited<ReturnType<typeof open>>, label: string) => wrapper.get(`button[aria-label="${label}"]`)

  /** Saves what waits, now, and lets the request finish. */
  async function saveNow() {
    useBuilderAutosaveStore().flush()
    await flushPromises()
  }

  const clickInDocument = (text: string) =>
    [...document.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent?.trim() === text)!.click()

  beforeEach(() => {
    api.routes({
      '/api/builder/documents': LIST,
      [documentUrl('template:home')]: HOME,
      [documentUrl('group:header')]: HEADER,
      [documentUrl('group:footer')]: FOOTER,
      [DRAFT_URL]: (_url: string, options: { body: { draft: unknown, i18n: unknown } }) => ({ ...HOME, draftRevision: 3, draft: options.body.draft, i18n: options.body.i18n }),
      '/api/builder/link-search': { results: [{ kind: 'category', id: 7, label: 'Καλώδια', slug: 'kalodia', active: true }] },
      '/api/builder/link-labels': { category: { 7: { label: 'Καλώδια', active: true } } },
    })
  })

  it('moves the selected section from its toolbar, and saves the page against its revision', async () => {
    const wrapper = await open(HERO)

    await button(wrapper, 'Μετακίνηση κάτω').trigger('click')
    await saveNow()

    expect(pageRows(wrapper)[0]).toBe('Πλέγμα προϊόντων')
    const [call] = api.callsTo(DRAFT_URL)
    expect(call!.options).toMatchObject({ method: 'PUT', headers: { 'If-Match': '2' } })
    expect(call!.options.body.draft.order).toEqual(['grid', 'hero', 'news'])
    await vi.waitFor(() => expect(wrapper.get('[role="status"]').text()).toContain('Αποθηκεύτηκε'))
  })

  it('keeps the first section from moving up', async () => {
    const wrapper = await open(HERO)

    expect(button(wrapper, 'Μετακίνηση πάνω').attributes('disabled')).toBeDefined()
  })

  it('hides a section from shoppers and shows it again', async () => {
    const wrapper = await open(HERO)

    await button(wrapper, 'Απόκρυψη από τους πελάτες').trigger('click')
    expect(pageRows(wrapper)[0]).toContain('Κρυφό')

    await button(wrapper, 'Εμφάνιση στους πελάτες').trigger('click')
    expect(pageRows(wrapper)[0]).not.toContain('Κρυφό')
  })

  it('duplicates a section right after it, and selects the copy', async () => {
    const wrapper = await open(HERO)

    await button(wrapper, 'Διπλότυπο').trigger('click')
    await flushPromises()

    expect(pageRows(wrapper).slice(0, 2)).toEqual(['Ενέργεια για όλη τη μέρα, Κεντρικό banner', 'Ενέργεια για όλη τη μέρα, Κεντρικό banner'])
    await vi.waitFor(() => expect(String(useRoute().query.node)).toMatch(/^template:home\/(?!hero$)/))
  })

  it('removes a section only once confirmed, and undo brings it back', async () => {
    const wrapper = await open(HERO)

    await button(wrapper, 'Αφαίρεση').trigger('click')
    await flushPromises()
    expect(pageRows(wrapper)).toHaveLength(3)
    ;[...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(item => item.textContent?.trim() === 'Αφαίρεση')!.click()
    await flushPromises()

    expect(pageRows(wrapper)).toEqual(['Πλέγμα προϊόντων', 'Εγγραφή στο newsletter, Κρυφό'])
    await button(wrapper, 'Αναίρεση').trigger('click')
    expect(pageRows(wrapper)[0]).toBe('Ενέργεια για όλη τη μέρα, Κεντρικό banner')
  })

  describe('adding from the library', () => {
    /** The library's cards, by their names, in the order it shows them. */
    const cards = () => [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] [data-library-card]')]
    const cardNames = () => cards().map(card => card.querySelector('span.text-sm')!.textContent!.trim())
    const card = (name: string) => cards().find(item => item.textContent!.includes(name))!

    it('opens on the page\'s sections only, from the "+" of its heading', async () => {
      const wrapper = await open()

      await button(wrapper, 'Προσθήκη ενότητας: Αυτή η σελίδα').trigger('click')
      await flushPromises()

      expect(document.querySelector('[role="dialog"]')!.textContent).toContain('Προσθήκη ενότητας')
      expect(cardNames()).toContain('Ερωτήσεις και απαντήσεις')
      expect(cardNames()).not.toContain('Μενού κεφαλίδας')
    })

    it('adds a section at the end with what its preset holds, selects it and saves it', async () => {
      const wrapper = await open()
      await button(wrapper, 'Προσθήκη ενότητας: Αυτή η σελίδα').trigger('click')
      await flushPromises()

      card('Ερωτήσεις και απαντήσεις').click()
      await flushPromises()
      await saveNow()

      const sent = api.callsTo(DRAFT_URL).at(-1)!.options.body.draft
      const added = sent.order.at(-1)
      expect(sent.order.slice(0, 3)).toEqual(['hero', 'grid', 'news'])
      expect(sent.sections[added]).toMatchObject({ type: 'faq@1', settings: {} })
      expect(sent.sections[added].blockOrder).toHaveLength(3)
      expect(Object.values(sent.sections[added].blocks)[0]).toEqual({ type: 'faq_item@1', settings: { question: 'Η ερώτηση του πελάτη', answer: 'Η απάντησή σας.' } })
      await vi.waitFor(() => expect(useRoute().query.node).toBe(`template:home/${added}`))
      expect(document.querySelector('[role="dialog"]')).toBeNull()
    })

    it('finds a section by its name, with or without accents', async () => {
      const wrapper = await open()
      await button(wrapper, 'Προσθήκη ενότητας: Αυτή η σελίδα').trigger('click')
      await flushPromises()

      const search = document.querySelector<HTMLInputElement>('[role="dialog"] input')!
      search.value = 'ερωτησεις'
      search.dispatchEvent(new Event('input'))
      await flushPromises()

      expect(cardNames()).toEqual(['Ερωτήσεις και απαντήσεις'])
    })

    it('shows a section whose store feature is off, says why, and adds nothing', async () => {
      setTenantFeatures({ loyalty: false })
      const wrapper = await open()
      await button(wrapper, 'Προσθήκη ενότητας: Αυτή η σελίδα').trigger('click')
      await flushPromises()

      const refused = card('Πρόγραμμα επιβράβευσης')
      expect(refused.getAttribute('aria-disabled')).toBe('true')
      expect(refused.textContent).toContain('Χρειάζεται το πρόγραμμα επιβράβευσης')
      refused.click()
      await flushPromises()

      expect(pageRows(wrapper)).toHaveLength(3)
      expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    })

    it('adds a block inside the selected section, offering only what it takes', async () => {
      const wrapper = await open(HERO)

      await button(wrapper, 'Προσθήκη μέσα').trigger('click')
      await flushPromises()

      expect(cardNames()).toEqual(['Αριθμός'])
      card('Αριθμός').click()
      await flushPromises()
      expect(useBuilderEditorStore().opened['template:home']!.copy.draft.sections.hero!.blockOrder).toHaveLength(2)
    })

    it('adds a section right below the selected one', async () => {
      const wrapper = await open(HERO)

      await button(wrapper, 'Προσθήκη από κάτω').trigger('click')
      await flushPromises()
      card('Διαχωριστικό').click()
      await flushPromises()

      const order = useBuilderEditorStore().opened['template:home']!.copy.draft.order
      expect(order).toHaveLength(4)
      expect(order[0]).toBe('hero')
      expect(order.slice(2)).toEqual(['grid', 'news'])
    })
  })

  describe('a section whose store feature is off', () => {
    const NEWS = '/_builder?node=template:home/news'

    beforeEach(() => {
      api.routes({
        '/api/builder/documents': LIST,
        [documentUrl('template:home')]: HOME,
        [documentUrl('group:header')]: HEADER,
        [documentUrl('group:footer')]: FOOTER,
        [DRAFT_URL]: failWith(400, {
          code: 'invalid_document',
          detail: 'x',
          errors: [{ path: '/sections/news/type', code: 'feature_disabled', message: 'newsletter_signup needs a feature that is off for this store.' }],
        }),
      })
    })

    it('says so on the node when a save is refused for it, and removes it in one click', async () => {
      const wrapper = await open(NEWS)
      // A change, so the page is saved and the store refuses it.
      await button(wrapper, 'Εμφάνιση στους πελάτες').trigger('click')
      await saveNow()

      await vi.waitFor(() => expect(wrapper.text()).toContain('Χρειάζεται το newsletter, που είναι κλειστό σε αυτό το κατάστημα'))
      await wrapper.findAll('button').find(item => item.text() === 'Αφαίρεση' && item.element.closest('[role="alert"], [data-slot="root"]'))!.trigger('click')
      await flushPromises()

      expect(pageRows(wrapper)).toEqual(['Ενέργεια για όλη τη μέρα, Κεντρικό banner', 'Πλέγμα προϊόντων'])
    })
  })

  it('offers STAFF no change at all', async () => {
    const wrapper = await open(HERO, { ...session, staff: { ...session.staff, role: 'staff' } })

    expect(wrapper.find('[role="toolbar"]').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="Αναίρεση"]').exists()).toBe(false)
    expect(wrapper.find('button[aria-label^="Προσθήκη ενότητας"]').exists()).toBe(false)
    expect(wrapper.find('[data-builder-drag]').exists()).toBe(false)
  })

  describe('dragging in the outline', () => {
    /** The page's tree, its rows' list items, and the Sortable.js instance on it. */
    function pageTree(wrapper: Awaited<ReturnType<typeof open>>) {
      const list = wrapper.findAll('nav[aria-label="Δομή σελίδας"] section')[1]!.get('[role="tree"]').element as HTMLElement
      const sortable = Sortable.get(list)!
      return { list, rows: () => [...list.children] as HTMLElement[], options: sortable.options }
    }

    /** What Sortable.js does on a drop: the row moved in the page, then its events. */
    function drop(tree: ReturnType<typeof pageTree>, from: number, to: number) {
      const item = tree.rows()[from]!
      tree.options.onStart!({ item } as SortableEvent)
      const rest = tree.rows().filter(row => row !== item)
      tree.list.insertBefore(item, rest[to] ?? null)
      tree.options.onUpdate!({ item, from: tree.list, oldIndex: from, newIndex: to } as SortableEvent)
      tree.options.onEnd!({ item } as SortableEvent)
    }

    const announced = (wrapper: Awaited<ReturnType<typeof open>>) => wrapper.get('.nuxt-announcer').text()

    it('moves a section dropped among the sections, saves it and says where it went', async () => {
      const wrapper = await open()
      const tree = pageTree(wrapper)

      drop(tree, 0, 2)
      await saveNow()

      expect(pageRows(wrapper)).toEqual(['Πλέγμα προϊόντων', 'Εγγραφή στο newsletter, Κρυφό', 'Ενέργεια για όλη τη μέρα, Κεντρικό banner'])
      expect(api.callsTo(DRAFT_URL)[0]!.options.body.draft.order).toEqual(['grid', 'news', 'hero'])
      expect(announced(wrapper)).toBe('Ενέργεια για όλη τη μέρα: μετακινήθηκε στη θέση 3 από 3')
    })

    it('lets a row be dropped beside its own siblings only, folding away the blocks while it is dragged', async () => {
      const wrapper = await open('/_builder?node=template:home/s1')
      const tree = pageTree(wrapper)
      const [hero, stat, grid] = tree.rows()

      tree.options.onStart!({ item: grid } as SortableEvent)
      await flushPromises()

      expect(tree.options.onMove!({ related: hero } as never, {} as never)).toBe(true)
      expect(tree.options.onMove!({ related: stat } as never, {} as never)).toBe(false)
      expect(stat!.classList.contains('hidden')).toBe(true)
      tree.options.onEnd!({ item: grid } as SortableEvent)
      await flushPromises()
      expect(stat!.classList.contains('hidden')).toBe(false)
    })

    it('says a move made from the toolbar too', async () => {
      const wrapper = await open(HERO)

      await button(wrapper, 'Μετακίνηση κάτω').trigger('click')
      await flushPromises()

      expect(announced(wrapper)).toBe('Ενέργεια για όλη τη μέρα: μετακινήθηκε στη θέση 2 από 3')
    })
  })

  describe('the settings of the selected section', () => {
    /** The control a field's label names, as a screen reader finds it. */
    const control = (wrapper: Awaited<ReturnType<typeof open>>, label: string) => {
      const named = wrapper.findAll('label').find(item => item.text().trim() === label)
      return wrapper.get(`[id="${named!.attributes('for')}"]`)
    }

    /** One choice of a segmented setting, by its name. */
    const option = (wrapper: Awaited<ReturnType<typeof open>>, name: string) =>
      wrapper.findAll('[data-slot="item"]').find(item => item.text().trim() === name)!.get('[role="radio"]')

    it('asks for a section when nothing is selected', async () => {
      const wrapper = await open()

      expect(wrapper.text()).toContain('Δεν έχει επιλεγεί ενότητα')
    })

    it('shows the selected section\'s settings with what they hold', async () => {
      const wrapper = await open(HERO)

      expect(wrapper.get('#builder-inspector-title').text()).toBe('Ενέργεια για όλη τη μέρα')
      expect((control(wrapper, 'Επικεφαλίδα').element as HTMLInputElement).value).toBe('Ενέργεια για όλη τη μέρα')
      expect(wrapper.text()).toContain('Σύνδεσμος κουμπιού')
    })

    it('changes a setting as it is typed, and saves it', async () => {
      const wrapper = await open(HERO)

      await control(wrapper, 'Επικεφαλίδα').setValue('Καλημέρα')
      await saveNow()

      expect(pageRows(wrapper)[0]).toBe('Καλημέρα, Κεντρικό banner')
      expect(api.callsTo(DRAFT_URL)[0]!.options.body.draft.sections.hero.settings.heading).toBe('Καλημέρα')
    })

    it('picks the category a rail of products shows by its name, and saves its id', async () => {
      const wrapper = await open('/_builder?node=template:home/grid')

      const picker = wrapper.get('[aria-label="Κατηγορία"]')
      await picker.trigger('click')
      await flushPromises()
      const input = document.querySelector<HTMLInputElement>('input[placeholder="Αναζήτηση με όνομα ή διεύθυνση"]')!
      input.value = 'καλ'
      input.dispatchEvent(new Event('input'))
      await vi.waitFor(() => expect(api.callsTo('/api/builder/link-search')).toHaveLength(1))
      await flushPromises()
      expect(api.callsTo('/api/builder/link-search')[0]!.options.query).toEqual({ q: 'καλ', kinds: 'category' })
      ;[...document.querySelectorAll<HTMLElement>('[role="option"]')].find(node => node.textContent?.includes('Καλώδια'))!.click()
      await flushPromises()
      await saveNow()

      expect(api.callsTo(DRAFT_URL)[0]!.options.body.draft.sections.grid.settings.categoryId).toBe(7)
      await vi.waitFor(() => expect(wrapper.get('[aria-label="Κατηγορία"]').text()).toContain('Καλώδια'))
    })

    it('points a link at a record picked by its name, and saves it as the record', async () => {
      const wrapper = await open('/_builder?node=template:home/grid')

      await wrapper.get('[aria-label="Πού οδηγεί: Σύνδεσμος κουμπιού"]').trigger('keydown', { key: 'Enter' })
      await flushPromises()
      ;[...document.querySelectorAll<HTMLElement>('[role="option"]')].find(node => node.textContent?.includes('Προϊόν, κατηγορία'))!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await flushPromises()
      await wrapper.get('[aria-label="Εγγραφή: Σύνδεσμος κουμπιού"]').trigger('click')
      await flushPromises()
      const input = document.querySelector<HTMLInputElement>('input[placeholder="Αναζήτηση με όνομα ή διεύθυνση"]')!
      input.value = 'καλ'
      input.dispatchEvent(new Event('input'))
      await vi.waitFor(() => expect(api.callsTo('/api/builder/link-search')).toHaveLength(1))
      await flushPromises()
      expect(api.callsTo('/api/builder/link-search')[0]!.options.query).toEqual({ q: 'καλ', kinds: 'product,category,blogCategory,blogPost,page,contentPage' })
      ;[...document.querySelectorAll<HTMLElement>('[role="option"]')].find(node => node.textContent?.includes('Καλώδια'))!.click()
      await flushPromises()
      await saveNow()

      expect(api.callsTo(DRAFT_URL)[0]!.options.body.draft.sections.grid.settings.ctaLink).toEqual({ ref: { kind: 'category', id: 7 } })
    })

    it('sets a choice, and leaves it to the section again', async () => {
      const wrapper = await open(HERO)
      const settings = () => useBuilderEditorStore().opened['template:home']!.copy.draft.sections.hero!.settings

      await option(wrapper, 'Κέντρο').trigger('click')
      expect(settings()).toMatchObject({ align: 'center' })

      await option(wrapper, 'Προεπιλογή').trigger('click')
      expect(settings()).not.toHaveProperty('align')
    })

    it('says what is wrong with a setting as it is typed', async () => {
      const wrapper = await open(HERO)

      await control(wrapper, 'Επικεφαλίδα').setValue('α'.repeat(201))

      expect(wrapper.text()).toContain('Είναι πολύ μεγάλο.')
    })

    it('shows the store\'s refusal of a save on the setting it names', async () => {
      api.routes({
        '/api/builder/documents': LIST,
        [documentUrl('template:home')]: HOME,
        [documentUrl('group:header')]: HEADER,
        [documentUrl('group:footer')]: FOOTER,
        [DRAFT_URL]: failWith(400, {
          code: 'invalid_document',
          detail: 'x',
          errors: [{ path: '/sections/hero/settings/heading', code: 'invalid_settings', message: 'Δεν επιτρέπεται εδώ.' }],
        }),
      })
      const wrapper = await open(HERO)

      await control(wrapper, 'Επικεφαλίδα').setValue('Καλημέρα')
      await saveNow()

      expect(control(wrapper, 'Επικεφαλίδα').attributes('aria-invalid')).toBe('true')
      expect(wrapper.text()).toContain('Δεν επιτρέπεται εδώ.')
    })

    it('shows STAFF the settings, but lets them change none', async () => {
      const wrapper = await open(HERO, { ...session, staff: { ...session.staff, role: 'staff' } })

      expect(control(wrapper, 'Επικεφαλίδα').attributes('disabled')).toBeDefined()
    })
  })

  describe('when someone else saved in between', () => {
    const conflict = { code: 'revision_conflict', detail: 'x', currentRevision: 6, updatedBy: { id: 9, name: 'Nikos' }, updatedAt: '2026-11-02T11:00:00+02:00' }
    const THEIRS = { ...HOME, draftRevision: 6, draft: { sections: { other: { type: 'products_grid@1', settings: { title: 'Νέες αφίξεις' } } }, order: ['other'] } }

    async function conflicted() {
      const wrapper = await open(HERO)
      api.routes({
        '/api/builder/documents': LIST,
        [documentUrl('template:home')]: THEIRS,
        [documentUrl('group:header')]: HEADER,
        [documentUrl('group:footer')]: FOOTER,
        [DRAFT_URL]: failWith(409, conflict),
      })
      await button(wrapper, 'Μετακίνηση κάτω').trigger('click')
      await saveNow()
      await vi.waitFor(() => expect(document.body.textContent).toContain('Η σελίδα αποθηκεύτηκε στο μεταξύ από: Nikos'))
      return wrapper
    }

    it('asks which version to keep, and says where they differ', async () => {
      await conflicted()

      await vi.waitFor(() => expect(document.body.textContent).toContain('Οι δύο εκδοχές διαφέρουν σε:'))
      expect(document.body.textContent).toContain('Νέες αφίξεις')
    })

    it('keeps mine by saving it over theirs', async () => {
      await conflicted()
      api.routes({ [DRAFT_URL]: () => ({ ...HOME, draftRevision: 7 }) })

      clickInDocument('Κράτησε τη δική μου')
      await flushPromises()

      expect(api.callsTo(DRAFT_URL).at(-1)!.options.headers).toEqual({ 'If-Match': '6' })
      await vi.waitFor(() => expect(useBuilderAutosaveStore().stateOf('template:home')).toBe('saved'))
    })

    it('loads theirs in place of mine', async () => {
      const wrapper = await conflicted()
      await vi.waitFor(() => expect(document.body.textContent).toContain('Οι δύο εκδοχές διαφέρουν σε:'))

      clickInDocument('Φόρτωσε την αποθηκευμένη')
      await flushPromises()

      expect(pageRows(wrapper)).toEqual(['Νέες αφίξεις, Πλέγμα προϊόντων'])
      expect(useBuilderAutosaveStore().stateOf('template:home')).toBe('saved')
    })
  })

  describe('changes an earlier session could not save', () => {
    const KEPT_KEY = () => `builder-recovery:${useRequestURL().host}:template:home`
    const kept = (revision: number) => ({
      revision,
      copy: { draft: { sections: { hero: HOME.draft.sections.hero }, order: ['hero'] }, i18n: {} },
      keptAt: '2026-11-02T09:00:00.000Z',
    })

    beforeEach(() => {
      localStorage.clear()
    })

    it('are offered back, and restoring them makes them a change that is saved', async () => {
      localStorage.setItem(KEPT_KEY(), JSON.stringify(kept(2)))
      const wrapper = await open()

      expect(wrapper.text()).toContain('Υπάρχουν αλλαγές που δεν αποθηκεύτηκαν')
      expect(wrapper.text()).not.toContain('Η σελίδα άλλαξε από τότε')
      await wrapper.findAll('button').find(item => item.text() === 'Επαναφορά')!.trigger('click')
      await saveNow()

      expect(pageRows(wrapper)).toEqual(['Ενέργεια για όλη τη μέρα, Κεντρικό banner'])
      expect(api.callsTo(DRAFT_URL)).toHaveLength(1)
      expect(wrapper.text()).not.toContain('Υπάρχουν αλλαγές που δεν αποθηκεύτηκαν')
    })

    it('warn when the page changed after they were kept, and can be discarded', async () => {
      localStorage.setItem(KEPT_KEY(), JSON.stringify(kept(1)))
      const wrapper = await open()

      expect(wrapper.text()).toContain('Η σελίδα άλλαξε από τότε')
      await wrapper.findAll('button').find(item => item.text() === 'Απόρριψη')!.trigger('click')

      expect(wrapper.text()).not.toContain('Υπάρχουν αλλαγές που δεν αποθηκεύτηκαν')
      expect(localStorage.getItem(KEPT_KEY())).toBeNull()
    })
  })
})
