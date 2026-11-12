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

/** One favourite as the favourites endpoints answer it: shopper 7's unless told. */
const favourite = (productId: number, id: number, userId = 7) => ({ id, userId, productId, createdAt: '2026-11-12T10:00:00Z' })

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
      session.user.value = { id: 7 }
      store.addFavouriteProduct({ id: 100, product: 1 } as CreateProductFavouriteResponse)

      store.updateFavouriteProducts([favourite(2, 200), favourite(3, 300)])

      expect(store.favouriteProductIds).toEqual({ 1: 100, 2: 200, 3: 300 })
    })

    // A favourites list that was on its way when the account changed is
    // someone else's: the store keeps only the signed-in shopper's own.
    it.each([
      ['another shopper', { id: 8 }],
      ['nobody signed in', null],
    ])('keeps no favourites list of a shopper who is not signed in: %s', (_case, user) => {
      session.user.value = user

      store.updateFavouriteProducts([favourite(2, 200)])

      expect(store.favouriteProductIds).toEqual({})
    })

    it('removes one product and keeps the others', () => {
      session.user.value = { id: 7 }
      store.updateFavouriteProducts([favourite(2, 200), favourite(3, 300)])

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
    /** What the server holds: the favourites among the ids each request asks about. */
    const holds = (favourites: Record<number, number>) => (_url: string, options: { body: { productIds: number[] } }) =>
      options.body.productIds.filter(id => favourites[id]).map(id => favourite(id, favourites[id]!))
    const asked = () => api.callsTo(LOOKUP).map(call => (call.options as { body: { productIds: number[] } }).body.productIds)

    beforeEach(() => {
      session.loggedIn.value = true
      session.user.value = { id: 7 }
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

    it('asks again about a product it is told to refresh', async () => {
      api.routes({ [LOOKUP]: holds({ 1: 100 }) })
      store.lookUpFavourites([1])
      await flushPromises()

      store.lookUpFavourites([1], { refresh: true })
      await flushPromises()

      expect(asked()).toEqual([[1], [1]])
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

    // A shared device: shopper 7 signs out while their lookup is out, and
    // the answer must not land in the next session, the store's or the
    // next shopper's, whose hearts ask for themselves.
    it('drops an answer to a session that has since ended', async () => {
      let answer!: () => void
      api.routes({ [LOOKUP]: () => new Promise((resolve) => {
        answer = () => resolve([favourite(1, 100)])
      }) })
      store.lookUpFavourites([1])
      await flushPromises()

      store.clearAccountState()
      session.user.value = { id: 8 }
      answer()
      await flushPromises()

      expect(store.favouriteProductIds).toEqual({})
      api.routes({ [LOOKUP]: holds({}) })
      store.lookUpFavourites([1])
      await flushPromises()
      expect(asked()).toEqual([[1], [1]])
    })

    it('leaves the lookups of the next session alone when one from an earlier session fails', async () => {
      let fail!: () => void
      api.routes({ [LOOKUP]: () => new Promise((_resolve, reject) => {
        fail = () => reject(new TypeError('fetch failed'))
      }) })
      store.lookUpFavourites([1])
      await flushPromises()

      store.clearAccountState()
      api.routes({ [LOOKUP]: holds({}) })
      store.lookUpFavourites([1])
      await flushPromises()
      fail()
      await flushPromises()
      store.lookUpFavourites([1])
      await flushPromises()

      // The new session asked once and knows the answer: the old failure did not make it ask again.
      expect(asked()).toEqual([[1], [1]])
    })

    // A refresh asks again while the first question may still be out: the
    // newer question's answer stands, in whichever order the answers arrive.
    it('keeps the answer to the newest question about a product', async () => {
      const answers: Array<() => void> = []
      api.routes({ [LOOKUP]: (_url: string, options: { body: { productIds: number[] } }) => new Promise((resolve) => {
        const held = answers.length === 0 ? [] : [favourite(1, 100)]
        answers.push(() => resolve(held.filter(row => options.body.productIds.includes(row.productId))))
      }) })
      store.lookUpFavourites([1])
      await flushPromises()
      store.lookUpFavourites([1], { refresh: true })
      await flushPromises()

      answers[1]!()
      await flushPromises()
      answers[0]!()
      await flushPromises()

      expect(store.favouriteProductIds).toEqual({ 1: 100 })
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
