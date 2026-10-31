import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import BlogPost from '~/components/variants/ekfyseosfyteias/Storefront/BlogPost.vue'
import { FIXTURE_TIMESTAMP, fixtureUuid } from '~~/test/fixtures/product'
import { makeBlogPost } from '~~/test/fixtures/blog'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * One activity of the co-op's «Δράσεις». The data and the head are the
 * platform post's (`useBlogPostPage`, covered with it); what is worth
 * pinning here is the drawing: the trail, the title and the lead, the
 * body, and the sage band at the foot with the way back and the related
 * activity. No comments, likes or share controls.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)
mockNuxtImport('useRequestApi', () => () => api)

const { route } = vi.hoisted(() => ({ route: { params: { id: '7', slug: 'to-rozo-chorafi' } } }))
mockNuxtImport('useRoute', () => () => ({
  params: route.params,
  query: {},
  path: `/blog/post/${route.params.id}/${route.params.slug}`,
  fullPath: `/blog/post/${route.params.id}/${route.params.slug}`,
  name: 'blog-post-id-slug___el',
  hash: '',
  matched: [],
  meta: {},
}))

/** The component's own `<i18n>` copy (el), which the global `$i18n` cannot reach. */
const COPY = { home: 'Αρχική', activities: 'Δράσεις', back: 'Πίσω', allActivities: 'Όλες οι δράσεις', related: 'Σχετική δράση' }

const BODY = '<p>Συμμετείχε και η ΚοινΣΕπ μας.</p><blockquote><p>Η εκδήλωση «γλύκανε» τα βλέμματά μας.</p></blockquote>'

/** The fields of a `BlogPostDetail` the page reads. */
const POST = {
  id: 7,
  uuid: fixtureUuid(9, 7),
  slug: 'to-rozo-chorafi',
  likes: [],
  translations: { el: { title: 'Το ροζ χωράφι', subtitle: 'Ανθισμένες ροδακινιές στην Ημαθία.', body: BODY } },
  author: { id: 3, uuid: fixtureUuid(9, 3), translations: { el: { bio: '' } } },
  category: { id: 2, uuid: fixtureUuid(9, 2), slug: 'expo', translations: { el: { name: 'Εκθέσεις & γεύσεις' } } },
  tags: [],
  viewCount: 0,
  likesCount: 0,
  commentsCount: 0,
  tagsCount: 0,
  isPublished: true,
  publishedAt: '2026-03-22T10:00:00+02:00',
  createdAt: FIXTURE_TIMESTAMP,
  updatedAt: FIXTURE_TIMESTAMP,
  mainImagePath: 'https://assets.example.test/post-7.jpg',
}

const RELATED = makeBlogPost({
  id: 8,
  mainImagePath: 'https://assets.example.test/post-8.jpg',
  translations: { el: { title: 'Γαστρονομικές διαδρομές στα Γιάννενα', subtitle: '' } },
})

function serve(post: Record<string, unknown> = POST, related: unknown[] = [RELATED]) {
  const empty = { count: 0, next: null, previous: null, results: [] }
  api.routes({
    '/api/blog/posts/7': post,
    '/api/blog/categories/2': POST.category,
    '/api/blog/posts/7/related-posts': related,
    '/api/*': empty,
  })
}

async function mountPost() {
  const wrapper = await mountSuspended(BlogPost, { route: false })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  clearNuxtData()
  setTenant({ blogEnabled: true })
  serve()
})

describe('ekfyseosfyteias Storefront/BlogPost', () => {
  it('trails Αρχική / Δράσεις, then the post as the current page', async () => {
    const wrapper = await mountPost()

    const trail = wrapper.get('nav[aria-label="Διαδρομή"]')
    expect(trail.findAll('a').map(link => [link.text(), link.attributes('href')])).toEqual([
      [COPY.home, '/'],
      [COPY.activities, '/blog'],
    ])
    expect(trail.get('[aria-current="page"]').text()).toBe('Το ροζ χωράφι')
  })

  it('sets the title as the one h1, with the subtitle as its lead', async () => {
    const wrapper = await mountPost()

    expect(wrapper.findAll('h1').map(h => h.text())).toEqual(['Το ροζ χωράφι'])
    expect(wrapper.get('header').text()).toContain('Ανθισμένες ροδακινιές στην Ημαθία.')
  })

  it('names the category and the publish date in a time element', async () => {
    const wrapper = await mountPost()

    expect(wrapper.get('header').text()).toContain('Εκθέσεις & γεύσεις')
    const time = wrapper.get('header time')
    expect(time.text()).toBe('22 Μαρτίου 2026')
    expect(time.attributes('datetime')).toContain('2026-03-22')
  })

  it('draws the main photograph beside the title, described by it', async () => {
    const wrapper = await mountPost()

    expect(wrapper.get('header img').attributes('alt')).toBe('Το ροζ χωράφι')
  })

  it('draws no photograph for a post without one', async () => {
    serve({ ...POST, mainImagePath: '' })

    const wrapper = await mountPost()

    expect(wrapper.find('header img').exists()).toBe(false)
  })

  it('renders the editor\'s body', async () => {
    const wrapper = await mountPost()

    await vi.waitFor(() => expect(wrapper.text()).toContain('Συμμετείχε και η ΚοινΣΕπ μας.'))
    expect(wrapper.get('blockquote').text()).toBe('Η εκδήλωση «γλύκανε» τα βλέμματά μας.')
  })

  it('ends with the way back to all activities and the first related activity', async () => {
    const wrapper = await mountPost()

    const more = wrapper.get('nav[aria-label="Περισσότερες δράσεις"]')
    const [back, related] = more.findAll('a')
    expect(back!.attributes('href')).toBe('/blog')
    expect(back!.text()).toBe(`${COPY.back}${COPY.allActivities}`)
    expect(related!.attributes('href')).toBe('/blog/post/8/post-8')
    expect(related!.text()).toBe(`${COPY.related}Γαστρονομικές διαδρομές στα Γιάννενα`)
  })

  it('offers only the way back when the post has no related activity', async () => {
    serve(POST, [])

    const wrapper = await mountPost()

    const links = wrapper.get('nav[aria-label="Περισσότερες δράσεις"]').findAll('a')
    expect(links.map(link => link.attributes('href'))).toEqual(['/blog'])
  })

  it('has no like, comment or share controls', async () => {
    const wrapper = await mountPost()

    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  it('counts one view of the post in the route once mounted', async () => {
    await mountPost()

    expect(api.callsTo('/api/blog/posts/*').filter(call => call.url.endsWith('/update-view-count'))).toEqual([
      { url: '/api/blog/posts/7/update-view-count', options: expect.objectContaining({ method: 'POST' }) },
    ])
  })
})
