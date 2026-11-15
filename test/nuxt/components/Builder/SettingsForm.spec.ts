import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import { UApp } from '#components'
import BuilderSettingsForm from '~/components/Builder/SettingsForm.vue'
import labels from '~/builder/labels/el.json'
import { makeBuilderDocumentRow } from '~~/test/fixtures/builderDocument'
import { resetBuilderEditorStores } from '~~/test/helpers/builderEditor'
import { setTenant } from '~~/test/helpers/tenant'

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
