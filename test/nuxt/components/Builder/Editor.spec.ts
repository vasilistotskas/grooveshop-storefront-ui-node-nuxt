import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import { UApp } from '#components'
import BuilderEditor from '~/components/Builder/Editor.vue'
import BuilderLayout from '~/layouts/builder.vue'
import { failWith } from '~~/test/helpers/api'
import type { BuilderSessionInfo } from '~~/shared/schemas/builderSession'

/**
 * The page editor around a signed-in staff member: it opens the page the
 * address names (the home page by default) with the store's section groups,
 * lists them in the outline in the order the storefront draws them, keeps
 * the selection in the address, and switches pages from the top bar.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

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

const detail = (key: string, kind: string, draft: unknown) => ({ ...row(key, kind), draft, i18n: {}, draftCatalogueHash: 'h' })

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
  const store = useBuilderEditorStore()
  store.documents = []
  store.opened = {}
  store.status = 'idle'
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
