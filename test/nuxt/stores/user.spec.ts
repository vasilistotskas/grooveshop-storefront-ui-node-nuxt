import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '~/stores/user'
import { makeUserDetails } from '~~/test/fixtures/user'

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
