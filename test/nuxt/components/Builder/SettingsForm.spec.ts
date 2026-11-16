import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import { UApp } from '#components'
import BuilderSettingsForm from '~/components/Builder/SettingsForm.vue'
import labels from '~/builder/labels/el.json'
import { makeBuilderDocumentRow } from '~~/test/fixtures/builderDocument'
import { resetBuilderEditorStores } from '~~/test/helpers/builderEditor'
import { inlineCopy } from '~~/test/helpers/inlineCopy'
import { setTenant } from '~~/test/helpers/tenant'
import { useBuilderAutosaveStore } from '~/stores/builderAutosave'

/**
 * The settings form offers the settings the store's design draws: where a
 * design's own component draws a block (`editor.designSettings`), a setting
 * it does not read is not offered, since changing it would change nothing.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const HOME = {
  ...makeBuilderDocumentRow(),
  draft: { sections: { news: { type: 'blog_posts_grid@3', settings: { posts: { mode: 'filter', ordering: 'newest', limit: 3 } } } }, order: ['news'] },
  i18n: {},
  draftCatalogueHash: 'h',
}

beforeEach(() => {
  resetBuilderEditorStores()
  api.routes({
    '/api/builder/documents': [makeBuilderDocumentRow()],
    [`/api/builder/documents/${encodeURIComponent('template:home')}`]: HOME,
  })
})

afterEach(() => {
  setTenant()
})

async function mountForm() {
  await useBuilderEditorStore().open('template:home')
  const wrapper = await mountSuspended(defineComponent({
    render: () => h(UApp, null, { default: () => h(BuilderSettingsForm, { documentKey: 'template:home', nodeId: 'news' }) }),
  }))
  await flushPromises()
  return wrapper
}

const label = (setting: keyof typeof labels.settings) => labels.settings[setting].label

describe('BuilderSettingsForm', () => {
  it('leaves out the settings a design\'s own component does not draw', async () => {
    setTenant({ schemaName: 'ekfyseosfyteias' })
    const wrapper = await mountForm()

    expect(wrapper.text()).toContain(label('heading'))
    expect(wrapper.text()).toContain(label('posts'))
    expect(wrapper.text()).not.toContain(label('colorScheme'))
    expect(wrapper.text()).not.toContain(label('surface'))
    expect(wrapper.text()).not.toContain(label('phoneLayout'))
  })

  it('offers every setting in a store of the platform\'s design', async () => {
    setTenant({ schemaName: 'demo' })
    const wrapper = await mountForm()

    for (const setting of ['heading', 'posts', 'colorScheme', 'surface', 'phoneLayout'] as const) {
      expect(wrapper.text()).toContain(label(setting))
    }
  })
})

/**
 * A setting the design does not draw may still hold a value written before
 * (or in another design): Django checks every setting, a link's target must
 * exist to publish, so the form keeps such a setting reachable, apart, to be
 * cleared, with its problems on it. One with no value stays out.
 */
describe('BuilderSettingsForm, a setting the design does not draw that holds a value', () => {
  const formCopy = inlineCopy('app/components/Builder/SettingsForm.vue')
  const PROBLEM = { path: '/sections/news/settings/ctaLink', code: 'reference_not_found', message: 'Η σελίδα που δείχνει ο σύνδεσμος δεν υπάρχει πια.' }

  beforeEach(() => {
    setTenant({ schemaName: 'webside' })
    api.routes({
      '/api/builder/documents': [makeBuilderDocumentRow()],
      [`/api/builder/documents/${encodeURIComponent('template:home')}`]: {
        ...HOME,
        draft: { sections: { news: { type: 'blog_posts_list@2', settings: { posts: { mode: 'filter', ordering: 'newest', limit: 6 }, ctaLink: { href: 'https://example.com/sale' } } } }, order: ['news'] },
      },
    })
  })

  const undrawnGroup = (wrapper: Awaited<ReturnType<typeof mountForm>>) => wrapper.find('details')

  it('shows it apart, collapsed, and leaves out the ones that hold nothing', async () => {
    const wrapper = await mountForm()
    const group = undrawnGroup(wrapper)

    expect(group.exists()).toBe(true)
    expect(group.get('summary').text()).toBe(formCopy.undrawn.title)
    expect(group.attributes('open')).toBeUndefined()
    expect(group.text()).toContain(label('ctaLink'))
    expect(wrapper.text()).not.toContain(label('heading'))
    expect(wrapper.text()).not.toContain(label('colorScheme'))
  })

  it('clears it, and it leaves the form', async () => {
    const wrapper = await mountForm()
    useBuilderEditorStore().role = 'admin'
    await flushPromises()

    await undrawnGroup(wrapper).get(`button[aria-label="${formCopy.undrawn.clearNamed.replace('{name}', label('ctaLink'))}"]`).trigger('click')
    await flushPromises()

    expect(useBuilderEditorStore().opened['template:home']!.copy.draft.sections.news!.settings).not.toHaveProperty('ctaLink')
    expect(undrawnGroup(wrapper).exists()).toBe(false)
  })

  it('opens with the problem Django names on it', async () => {
    useBuilderAutosaveStore().$patch({ saves: { 'template:home': { state: 'invalid', attempt: 0, problems: [PROBLEM] } } })
    const wrapper = await mountForm()
    const group = undrawnGroup(wrapper)

    expect(group.attributes('open')).toBeDefined()
    expect(group.text()).toContain(PROBLEM.message)
  })
})
