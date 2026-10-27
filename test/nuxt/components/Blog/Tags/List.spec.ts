import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import BlogTagsList from '~/components/Blog/Tags/List.vue'
import WebsideBlogTagsList from '~/components/variants/webside/Blog/Tags/List.vue'
import { makeBlogTag } from '~~/test/fixtures/blog'
import { trees } from '~~/test/helpers/trees'

/**
 * The blog's tag filter: every tag the store has, narrowed by what the
 * reader types. One request, one key, for both trees.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const TAGS = [makeBlogTag({ id: 1, translations: { el: { name: 'Φορτιστές' } } }), makeBlogTag({ id: 2, translations: { el: { name: 'Καλώδια' } } })]

describe.each(trees(BlogTagsList, WebsideBlogTagsList))('$tree Blog/Tags/List', ({ C }) => {
  beforeEach(() => {
    clearNuxtData('blogTags')
    api.routes({ '/api/blog/tags': { count: TAGS.length, next: null, previous: null, results: TAGS } })
  })

  const mount = async () => {
    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()
    return wrapper
  }

  it('lists every tag the store has, from one request', async () => {
    const wrapper = await mount()

    expect(wrapper.findAll('li button').map(button => button.text())).toEqual(['Φορτιστές', 'Καλώδια'])
    expect(api.callsTo('/api/blog/tags')).toHaveLength(1)
  })

  it('narrows the list to what the reader types', async () => {
    const wrapper = await mount()

    await wrapper.get('input[name="search"]').setValue('καλ')

    expect(wrapper.findAll('li button').map(button => button.text())).toEqual(['Καλώδια'])
  })

  it('draws nothing for a store without tags', async () => {
    api.routes({ '/api/blog/tags': { count: 0, next: null, previous: null, results: [] } })

    const wrapper = await mount()

    expect(wrapper.find('[role="region"]').exists()).toBe(false)
  })
})
