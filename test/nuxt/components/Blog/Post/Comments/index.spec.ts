import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import BlogPostComments from '~/components/Blog/Post/Comments/index.vue'

// Since Nuxt 4.5 `$fetch` is a real auto-import in user code, so it must be
// mocked via mockNuxtImport like any other auto-import (see cart.spec.ts).
const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn((_url: unknown, ..._rest: unknown[]) => Promise.resolve({} as any)),
}))
mockNuxtImport('$fetch', () => mockFetch)
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(false),
  user: ref(null),
  fetch: vi.fn().mockResolvedValue(undefined),
}))
mockNuxtImport('useUserStore', () => () => ({
  updateLikedComments: vi.fn(),
}))

const PROXY_URL = '/api/blog/posts/42/comments'
// DRF's `request.build_absolute_uri()` — an absolute Django origin that must
// never be hit directly from the browser (H20).
const NEXT_PAGE_URL = 'https://api.webside.gr/api/v1/blog/post/42/comments'
  + '?cursor=Y3Vyc29yOjE%3D&pageSize=3&paginationType=cursor&languageCode=el&approved=true&parent_Isnull=true'

const baseComment = {
  translations: { el: { content: 'Σχόλιο' } },
  user: { pk: 1, id: 1, email: 'a@example.com' },
  contentPreview: 'Σχόλιο',
  isReply: false,
  parent: null,
  hasReplies: false,
  approved: true,
  isEdited: false,
  likesCount: 0,
  repliesCount: 0,
  userHasLiked: false,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
}

const PAGE_ONE = {
  count: 2,
  links: { next: NEXT_PAGE_URL, previous: null },
  results: [{ ...baseComment, id: 1, uuid: 'uuid-1' }],
} as unknown as PaginatedBlogCommentList

const PAGE_TWO = {
  count: 2,
  links: { next: null, previous: null },
  results: [{ ...baseComment, id: 2, uuid: 'uuid-2' }],
} as unknown as PaginatedBlogCommentList

describe('BlogPostComments load more', () => {
  beforeEach(() => {
    useState<CursorState>('cursor-state').value = generateInitialCursorState()
    mockFetch.mockReset()
    mockFetch.mockImplementation((url: unknown) => {
      const target = String(url)
      if (target.includes('/api/settings/get')) {
        return Promise.resolve({ value: 'true' })
      }
      if (target === PROXY_URL) {
        return Promise.resolve(PAGE_ONE)
      }
      return Promise.resolve({})
    })
  })

  it('loads the next page through the Nuxt proxy route, never the absolute Django URL', async () => {
    const wrapper = await mountSuspended(BlogPostComments, {
      props: {
        blogPostId: '42',
        commentsCount: 2,
        displayImageOf: 'user',
      },
      global: {
        stubs: {
          LazyBlogPostCommentsList: { template: '<div />' },
          BlogPostCommentsList: { template: '<div />' },
        },
      },
    })
    await flushPromises()

    // Switch the mock to serve page two once the "load more" click fires.
    mockFetch.mockImplementation((url: unknown) => {
      const target = String(url)
      if (target.includes('/api/settings/get')) {
        return Promise.resolve({ value: 'true' })
      }
      if (target === PROXY_URL) {
        return Promise.resolve(PAGE_TWO)
      }
      return Promise.resolve({})
    })

    const loadMoreButton = wrapper
      .findAll('button')
      .find(button => button.text().includes('Φόρτωσε περισσότερα'))
    expect(loadMoreButton).toBeTruthy()

    await loadMoreButton!.trigger('click')
    await flushPromises()

    // Nothing ever goes straight to the Django origin.
    for (const call of mockFetch.mock.calls) {
      expect(String(call[0]).startsWith('http')).toBe(false)
    }

    const proxyCalls = mockFetch.mock.calls.filter(call => call[0] === PROXY_URL)
    expect(proxyCalls.length).toBeGreaterThanOrEqual(2)

    // The load-more request carries the cursor parsed out of `links.next`.
    const loadMoreCall = proxyCalls[proxyCalls.length - 1]
    expect(loadMoreCall![1]).toMatchObject({
      query: expect.objectContaining({ cursor: 'Y3Vyc29yOjE=' }),
    })
  })
})
