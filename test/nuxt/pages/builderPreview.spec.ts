import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import SharePreviewPage from '~/pages/_builder-preview/[token].vue'
import { failWith } from '~~/test/helpers/api'

/**
 * A share link opened: the page of the link is drawn by the body the store
 * serves that page with, from the answer of `/api/builder/shared/<token>`,
 * which goes where the editor's canvas puts its own (`useBuilderCanvasPreview`).
 * An expired link says so, in words, instead of a blank page.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const resolved = vi.hoisted(() => ({ keys: [] as string[] }))
mockNuxtImport('resolvePage', () => (key: string) => {
  resolved.keys.push(key)
  return defineComponent({
    props: { pageType: { type: String, default: '' }, slug: { type: String, default: '' } },
    setup: props => () => h('div', { 'data-body': key, 'data-page-type': props.pageType, 'data-slug': props.slug }),
  })
})

const TOKEN = 'aGVsbG8td29ybGQtdG9rZW4tMTIzNDU2Nzg5MA'
const PREVIEW = { pages: { 'page:about': { sections: [] } }, navigation: {} }

const mount = (query: string) => mountSuspended(SharePreviewPage, { route: `/_builder/preview/${TOKEN}${query}` })

beforeEach(() => {
  resolved.keys = []
  clearNuxtData()
})

describe('a share link opened', () => {
  it('asks for the page the link names, with its token, and says it is a preview', async () => {
    api.routes({ [`/api/builder/shared/${TOKEN}`]: PREVIEW })

    const wrapper = await mount('?page=about')
    await flushPromises()

    const call = api.callsTo(`/api/builder/shared/${TOKEN}`)[0]!
    expect(call.options.query).toEqual({ page: 'about' })
    expect(wrapper.text()).toContain('Κοινή προεπισκόπηση')
    expect(useBuilderCanvasPreview().value).toEqual(PREVIEW)
  })

  it.each([
    ['about', { key: 'brand-page', pageType: 'about', slug: '' }],
    ['summer-sale', { key: 'custom-page', pageType: '', slug: 'summer-sale' }],
  ])('draws the page %s with the body the store serves it with', async (page, body) => {
    api.routes({ [`/api/builder/shared/${TOKEN}`]: PREVIEW })

    const wrapper = await mount(`?page=${page}`)
    await flushPromises()

    const drawn = wrapper.find('[data-body]')
    expect(drawn.attributes('data-body')).toBe(body.key)
    expect(drawn.attributes('data-page-type')).toBe(body.pageType)
    expect(drawn.attributes('data-slug')).toBe(body.slug)
  })

  it('says the link is no longer valid, and draws no page, when Django has none to show', async () => {
    api.routes({ [`/api/builder/shared/${TOKEN}`]: failWith(404, { code: 'preview_link_expired' }) })

    const wrapper = await mount('?page=home')
    await flushPromises()

    expect(wrapper.text()).toContain('Ο σύνδεσμος δεν ισχύει πια')
    expect(wrapper.find('[data-body]').exists()).toBe(false)
    expect(useBuilderCanvasPreview().value).toBeNull()
  })
})
