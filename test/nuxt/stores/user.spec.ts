import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '~/stores/user'
import { makeUserDetails } from '~~/test/fixtures/user'
import { failWith } from '~~/test/helpers/api'

/**
 * Plain `{ value }` holders, not refs: the setup plugin watches
 * `loggedIn`, and a reactive one would start its own session, account,
 * cart and language chain against these mocks whenever a test signs in.
 * That watcher is inert here on purpose: the plugin's sign-in chain is
 * not what these specs test.
 */
const { session, getUserAccount } = vi.hoisted(() => ({
  session: { loggedIn: { value: false }, user: { value: null as { id?: number } | null } },
  getUserAccount: vi.fn((_id: number) => Promise.resolve<unknown>(undefined)),
}))

mockNuxtImport('useUserSession', () => () => ({
  ...session,
  fetch: vi.fn(() => Promise.resolve()),
  clear: vi.fn(() => Promise.resolve()),
}))
mockNuxtImport('useAllAuthAccount', () => () => ({ getUserAccount }))

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const ACCOUNT = makeUserDetails({ id: 7, email: 'shopper@example.com' })

describe('useUserStore', () => {
  let store: ReturnType<typeof useUserStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useUserStore()
    session.loggedIn.value = false
    session.user.value = null
  })

  describe('setupAccount', () => {
    it('does not fetch for a signed-out visitor, whatever user is cached', async () => {
      session.user.value = { id: 7 }

      await store.setupAccount()

      expect(getUserAccount).not.toHaveBeenCalled()
      expect(store.account).toBeNull()
    })

    it('does not fetch when the session user has no id', async () => {
      session.loggedIn.value = true
      session.user.value = {}

      await store.setupAccount()

      expect(getUserAccount).not.toHaveBeenCalled()
      expect(store.account).toBeNull()
    })

    it('loads the signed-in user\'s account', async () => {
      session.loggedIn.value = true
      session.user.value = { id: 7 }
      getUserAccount.mockResolvedValueOnce(ACCOUNT)

      await store.setupAccount()

      expect(getUserAccount).toHaveBeenCalledWith(7)
      expect(store.account).toEqual(ACCOUNT)
    })

    it('swallows a failed fetch and leaves the account unset', async () => {
      session.loggedIn.value = true
      session.user.value = { id: 7 }
      getUserAccount.mockRejectedValueOnce(new Error('network down'))

      await expect(store.setupAccount()).resolves.toBeUndefined()
      expect(store.account).toBeNull()
    })
  })

  describe('favourite products', () => {
    it('maps a product to the id of its favourite row', () => {
      store.addFavouriteProduct({ id: 100, product: 1 } as CreateProductFavouriteResponse)

      expect(store.getFavouriteIdByProductId(1)).toBe(100)
      expect(store.getFavouriteIdByProductId(2)).toBeUndefined()
    })

    it('merges a batch of favourites into the map', () => {
      store.addFavouriteProduct({ id: 100, product: 1 } as CreateProductFavouriteResponse)

      store.updateFavouriteProducts([
        { id: 200, productId: 2 },
        { id: 300, productId: 3 },
      ] as GetProductFavouritesByProductsResponse)

      expect(store.favouriteProductIds).toEqual({ 1: 100, 2: 200, 3: 300 })
    })

    it('removes one product and keeps the others', () => {
      store.updateFavouriteProducts([
        { id: 200, productId: 2 },
        { id: 300, productId: 3 },
      ] as GetProductFavouritesByProductsResponse)

      store.removeFavouriteProduct(2)

      expect(store.favouriteProductIds).toEqual({ 3: 300 })
    })
  })

  describe.each([
    {
      kind: 'posts',
      liked: (s: typeof store) => s.blogLikedPosts,
      isLiked: (s: typeof store, id: number) => s.blogPostLiked(id),
      add: (s: typeof store, id: number) => s.addLikedPost(id),
      remove: (s: typeof store, id: number) => s.removeLikedPost(id),
      update: (s: typeof store, ids: number[]) => s.updateLikedPosts(ids),
    },
    {
      kind: 'comments',
      liked: (s: typeof store) => s.blogLikedComments,
      isLiked: (s: typeof store, id: number) => s.blogCommentLiked(id),
      add: (s: typeof store, id: number) => s.addLikedComment(id),
      remove: (s: typeof store, id: number) => s.removeLikedComment(id),
      update: (s: typeof store, ids: number[]) => s.updateLikedComments(ids),
    },
  ])('liked blog $kind', ({ liked, isLiked, add, remove, update }) => {
    it('reports a liked id after it is added and not after it is removed', () => {
      add(store, 1)
      add(store, 2)
      expect(isLiked(store, 2)).toBe(true)

      remove(store, 2)

      expect(isLiked(store, 2)).toBe(false)
      expect(liked(store)).toEqual([1])
    })

    it('merges fetched likes without duplicating the ones already known', () => {
      add(store, 1)

      update(store, [1, 2, 3])

      expect(liked(store)).toEqual([1, 2, 3])
    })
  })

  /**
   * The one way a product's heart learns its state: every heart asks when it
   * mounts, and the store turns the asks of one tick into one request.
   */
  describe('lookUpFavourites', () => {
    const LOOKUP = '/api/products/favourites/favourites-by-products'
    const favourite = (productId: number, id: number) => ({ id, userId: 7, productId, createdAt: '2026-11-12T10:00:00Z' })
    /** What the server holds: the favourites among the ids each request asks about. */
    const holds = (favourites: Record<number, number>) => (_url: string, options: { body: { productIds: number[] } }) =>
      options.body.productIds.filter(id => favourites[id]).map(id => favourite(id, favourites[id]!))
    const asked = () => api.callsTo(LOOKUP).map(call => (call.options as { body: { productIds: number[] } }).body.productIds)

    beforeEach(() => {
      session.loggedIn.value = true
    })

    it('asks about the products of one tick in one request, each once, and keeps both answers', async () => {
      store.favouriteProductIds = { 3: 99 }
      api.routes({ [LOOKUP]: holds({ 1: 100 }) })

      store.lookUpFavourites([1, 2])
      store.lookUpFavourites([2, 3])
      await flushPromises()

      expect(asked()).toEqual([[1, 2, 3]])
      // A product the server has no favourite for is not one, whatever was held.
      expect(store.favouriteProductIds).toEqual({ 1: 100 })
    })

    it('splits a page of more products than the server answers at once', async () => {
      api.routes({ [LOOKUP]: holds({}) })
      const ids = Array.from({ length: FAVOURITES_LOOKUP_MAX_IDS + 20 }, (_, index) => index + 1)

      store.lookUpFavourites(ids)
      await flushPromises()

      expect(asked().map(batch => batch.length)).toEqual([FAVOURITES_LOOKUP_MAX_IDS, 20])
      expect(asked().flat()).toEqual(ids)
    })

    it('asks nothing for a guest', async () => {
      session.loggedIn.value = false

      store.lookUpFavourites([1])
      await flushPromises()

      expect(asked()).toEqual([])
    })

    it('asks once a session: a product asked about, held from a list or switched by a click is known', async () => {
      api.routes({ [LOOKUP]: holds({}) })
      store.lookUpFavourites([1])
      await flushPromises()
      store.updateFavouriteProducts([favourite(2, 200)])
      store.addFavouriteProduct({ id: 300, product: 3 } as CreateProductFavouriteResponse)

      store.lookUpFavourites([1, 2, 3])
      await flushPromises()

      expect(asked()).toEqual([[1]])
      expect(store.favouriteProductIds).toEqual({ 2: 200, 3: 300 })
    })

    it('asks again about a product it is told to refresh', async () => {
      api.routes({ [LOOKUP]: holds({ 1: 100 }) })
      store.lookUpFavourites([1])
      await flushPromises()

      store.lookUpFavourites([1], { refresh: true })
      await flushPromises()

      expect(asked()).toEqual([[1], [1]])
    })

    it('lets a click made while the question was out win over its answer', async () => {
      let answer!: () => void
      api.routes({ [LOOKUP]: () => new Promise((resolve) => {
        answer = () => resolve([favourite(1, 100)])
      }) })
      store.lookUpFavourites([1])
      await flushPromises()

      store.removeFavouriteProduct(1)
      answer()
      await flushPromises()

      expect(store.favouriteProductIds).toEqual({})
    })

    it('forgets a lookup that failed, so the next heart asks again', async () => {
      api.routes({ [LOOKUP]: failWith(502) })
      store.lookUpFavourites([1])
      await flushPromises()

      api.routes({ [LOOKUP]: holds({ 1: 100 }) })
      store.lookUpFavourites([1])
      await flushPromises()

      expect(asked()).toEqual([[1], [1]])
      expect(store.favouriteProductIds).toEqual({ 1: 100 })
    })

    it('asks again after the shopper signs out and back in', async () => {
      api.routes({ [LOOKUP]: holds({}) })
      store.lookUpFavourites([1])
      await flushPromises()

      store.clearAccountState()
      store.lookUpFavourites([1])
      await flushPromises()

      expect(asked()).toEqual([[1], [1]])
    })

    // The limit is the server's: the generated body schema is Django's
    // serializer, `max_length=100`.
    it('splits at the limit of the request body the server accepts', () => {
      const ids = (count: number) => ({ productIds: Array.from({ length: count }, (_, index) => index + 1) })

      expect(zGetProductFavouritesByProductsBody.safeParse(ids(FAVOURITES_LOOKUP_MAX_IDS)).success).toBe(true)
      expect(zGetProductFavouritesByProductsBody.safeParse(ids(FAVOURITES_LOOKUP_MAX_IDS + 1)).success).toBe(false)
    })
  })

  describe('loadLikedComments', () => {
    const LIKED = '/api/blog/comments/liked-comments'

    it('asks which of the comments the signed-in reader likes, and remembers them', async () => {
      session.loggedIn.value = true
      store.addLikedComment(1)
      api.routes({ [LIKED]: { likedCommentIds: [2] } })

      await store.loadLikedComments([2, 3])

      expect(api.callsTo(LIKED)).toEqual([{ url: LIKED, options: expect.objectContaining({ method: 'POST', body: { commentIds: [2, 3] } }) }])
      expect(store.blogLikedComments).toEqual([1, 2])
    })

    it.each([
      ['a guest', false, [2]],
      ['no comments', true, []],
    ])('asks nothing for %s', async (_case, signedIn, ids) => {
      session.loggedIn.value = signedIn

      await store.loadLikedComments(ids)

      expect(api.callsTo(LIKED)).toHaveLength(0)
    })

    it('leaves the comments unmarked when the like state cannot be loaded', async () => {
      session.loggedIn.value = true
      api.routes({ [LIKED]: failWith(502) })

      await expect(store.loadLikedComments([2])).resolves.toBeUndefined()

      expect(store.blogLikedComments).toEqual([])
    })
  })

  it('clearAccountState forgets the account, favourites and likes', () => {
    store.account = ACCOUNT
    store.addFavouriteProduct({ id: 100, product: 1 } as CreateProductFavouriteResponse)
    store.addLikedPost(1)
    store.addLikedComment(10)

    store.clearAccountState()

    expect(store.account).toBeNull()
    expect(store.favouriteProductIds).toEqual({})
    expect(store.blogLikedPosts).toEqual([])
    expect(store.blogLikedComments).toEqual([])
  })
})
