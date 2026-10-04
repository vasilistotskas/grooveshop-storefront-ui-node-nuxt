import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, mockComponent } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { resolve } from 'node:path'
import YAML from 'yaml'
import BlogIndex from '~/components/Storefront/BlogIndex.vue'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'

/**
 * The blog index: breadcrumb, heading and lead, a search that lives in
 * the URL, an optional branded band from the store's page layout, and
 * the post list. The list has its own spec and is a stand-in here.
 */
const state = vi.hoisted(() => ({ query: {} as Record<string, string>, sections: [] as Array<{ uuid: string, componentType: string, props: unknown }> }))
mockNuxtImport('useRoute', () => () => ({ name: 'blog___el', params: {}, query: state.query, path: '/blog', fullPath: '/blog', hash: '', meta: {}, matched: [] }))
mockNuxtImport('usePageConfig', () => () => Promise.resolve({ sections: ref(state.sections) }))

mockComponent('BlogPostsList', { template: '<div data-stub="list" />' })
mockComponent('PageSectionRenderer', { props: ['section'], template: '<div data-stub="section" :data-id="section.uuid" />' })

const messages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/Storefront/BlogIndex.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el

beforeEach(() => {
  state.query = {}
  state.sections = []
})

const mountPage = async () => {
  const wrapper = await mountSuspended(BlogIndex, { route: false })
  await flushPromises()
  return wrapper
}

describe('Storefront/BlogIndex', () => {
  it('has Home › Blog above a visible h1 and its lead, then the list', async () => {
    const wrapper = await mountPage()

    expect(wrapper.get('nav').text()).toContain(messages.breadcrumb.items.blog.label)
    expect(wrapper.get('h1').text()).toBe(messages.title)
    expect(wrapper.text()).toContain(messages.lead)
    expect(wrapper.find('[data-stub="list"]').exists()).toBe(true)
  })

  it('shows the store\'s branded band above the heading, and drops its own h1 when the band owns one', async () => {
    state.sections = [{ uuid: 'band-1', componentType: 'page_hero', props: {} }]

    const wrapper = await mountPage()

    expect(wrapper.get('[data-stub="section"]').attributes('data-id')).toBe('band-1')
    expect(wrapper.find('h1').exists()).toBe(false)
  })

  it('keeps its own h1 under a band that has none', async () => {
    state.sections = [{ uuid: 'band-2', componentType: 'rich_text', props: {} }]

    const wrapper = await mountPage()

    expect(wrapper.find('[data-stub="section"]').exists()).toBe(true)
    expect(wrapper.get('h1').text()).toBe(messages.title)
  })

  describe('the search', () => {
    it('is a labelled search field, filled from the URL', async () => {
      state.query = { search: 'gan' }

      const wrapper = await mountPage()

      const input = wrapper.get('form[role="search"] input')
      expect((input.element as HTMLInputElement).value).toBe('gan')
      expect(input.attributes('aria-label')).toBe(messages.search.label)
    })

    it('puts the trimmed term in the URL, back on the first page, keeping the filters', async () => {
      state.query = { category: '2', page: '3' }
      const wrapper = await mountPage()
      const replace = vi.spyOn(useRouter(), 'replace').mockResolvedValue(undefined)

      await wrapper.get('form[role="search"] input').setValue('  gan  ')
      await wrapper.get('form[role="search"]').trigger('submit')

      expect(replace).toHaveBeenCalledWith('/blog?category=2&search=gan')
    })

    it('takes the term out of the URL when it is cleared', async () => {
      state.query = { search: 'gan' }
      const wrapper = await mountPage()
      const replace = vi.spyOn(useRouter(), 'replace').mockResolvedValue(undefined)

      await wrapper.get('form[role="search"] input').setValue('   ')
      await wrapper.get('form[role="search"]').trigger('submit')

      expect(replace).toHaveBeenCalledWith('/blog')
    })
  })
})
