import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '~/stores/user'

describe('User Store', () => {
  let store: ReturnType<typeof useUserStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useUserStore()
  })

  describe('initial state', () => {
    it('should have null account', () => {
      expect(store.account).toBeNull()
    })

    it('should have empty favourite product IDs map', () => {
      expect(store.favouriteProductIds.size).toBe(0)
    })

    it('should have empty liked posts array', () => {
      expect(store.blogLikedPosts).toEqual([])
    })

    it('should have empty liked comments array', () => {
      expect(store.blogLikedComments).toEqual([])
    })
  })

  describe('favourite products', () => {
    it('should add favourite product', () => {
      const favourite = { id: 100, product: 1 } as CreateProductFavouriteResponse
      store.addFavouriteProduct(favourite)

      expect(store.favouriteProductIds.get(1)).toBe(100)
    })

    it('should get favourite ID by product ID', () => {
      const favourite = { id: 200, product: 2 } as CreateProductFavouriteResponse
      store.addFavouriteProduct(favourite)

      const favouriteId = store.getFavouriteIdByProductId(2)
      expect(favouriteId).toBe(200)
    })

    it('should return undefined for non-existent product', () => {
      const favouriteId = store.getFavouriteIdByProductId(999)
      expect(favouriteId).toBeUndefined()
    })

    it('should remove favourite product', () => {
      const favourite = { id: 300, product: 3 } as CreateProductFavouriteResponse
      store.addFavouriteProduct(favourite)
      expect(store.favouriteProductIds.has(3)).toBe(true)

      store.removeFavouriteProduct(3)
      expect(store.favouriteProductIds.has(3)).toBe(false)
    })

    it('should update multiple favourite products', () => {
      const favourites = [
        { id: 100, productId: 1 },
        { id: 200, productId: 2 },
        { id: 300, productId: 3 },
      ] as GetProductFavouritesByProductsResponse

      store.updateFavouriteProducts(favourites)

      expect(store.favouriteProductIds.get(1)).toBe(100)
      expect(store.favouriteProductIds.get(2)).toBe(200)
      expect(store.favouriteProductIds.get(3)).toBe(300)
    })

    it('should override existing favourite when updating', () => {
      const favourite1 = { id: 100, product: 1 } as CreateProductFavouriteResponse
      store.addFavouriteProduct(favourite1)

      const favourites = [
        { id: 999, productId: 1 },
      ] as GetProductFavouritesByProductsResponse
      store.updateFavouriteProducts(favourites)

      expect(store.favouriteProductIds.get(1)).toBe(999)
    })
  })

  describe('blog liked posts', () => {
    it('should check if post is liked', () => {
      expect(store.blogPostLiked(1)).toBe(false)
    })

    it('should add liked post', () => {
      store.addLikedPost(1)
      expect(store.blogPostLiked(1)).toBe(true)
      expect(store.blogLikedPosts).toContain(1)
    })

    it('should remove liked post', () => {
      store.addLikedPost(1)
      expect(store.blogPostLiked(1)).toBe(true)

      store.removeLikedPost(1)
      expect(store.blogPostLiked(1)).toBe(false)
      expect(store.blogLikedPosts).not.toContain(1)
    })

    it('should update liked posts with array', () => {
      store.updateLikedPosts([1, 2, 3])
      expect(store.blogLikedPosts).toEqual([1, 2, 3])
    })

    it('should merge liked posts without duplicates', () => {
      store.addLikedPost(1)
      store.addLikedPost(2)
      store.updateLikedPosts([2, 3, 4])

      expect(store.blogLikedPosts).toContain(1)
      expect(store.blogLikedPosts).toContain(2)
      expect(store.blogLikedPosts).toContain(3)
      expect(store.blogLikedPosts).toContain(4)
      // Should not have duplicate 2
      expect(store.blogLikedPosts.filter(id => id === 2).length).toBe(1)
    })

    it('should handle adding same post multiple times', () => {
      store.addLikedPost(1)
      store.addLikedPost(1)
      store.addLikedPost(1)

      // Will have duplicates until updateLikedPosts is called
      expect(store.blogLikedPosts.length).toBe(3)
    })

    it('should handle removing non-existent post', () => {
      store.removeLikedPost(999)
      expect(store.blogLikedPosts).toEqual([])
    })
  })

  describe('blog liked comments', () => {
    it('should check if comment is liked', () => {
      expect(store.blogCommentLiked(1)).toBe(false)
    })

    it('should add liked comment', () => {
      store.addLikedComment(1)
      expect(store.blogCommentLiked(1)).toBe(true)
      expect(store.blogLikedComments).toContain(1)
    })

    it('should remove liked comment', () => {
      store.addLikedComment(1)
      expect(store.blogCommentLiked(1)).toBe(true)

      store.removeLikedComment(1)
      expect(store.blogCommentLiked(1)).toBe(false)
      expect(store.blogLikedComments).not.toContain(1)
    })

    it('should update liked comments with array', () => {
      store.updateLikedComments([10, 20, 30])
      expect(store.blogLikedComments).toEqual([10, 20, 30])
    })

    it('should merge liked comments without duplicates', () => {
      store.addLikedComment(10)
      store.addLikedComment(20)
      store.updateLikedComments([20, 30, 40])

      expect(store.blogLikedComments).toContain(10)
      expect(store.blogLikedComments).toContain(20)
      expect(store.blogLikedComments).toContain(30)
      expect(store.blogLikedComments).toContain(40)
      // Should not have duplicate 20
      expect(store.blogLikedComments.filter(id => id === 20).length).toBe(1)
    })

    it('should handle removing non-existent comment', () => {
      store.removeLikedComment(999)
      expect(store.blogLikedComments).toEqual([])
    })
  })

  describe('clearAccountState', () => {
    it('should clear all account state', () => {
      // Setup some state
      store.addFavouriteProduct({ id: 100, product: 1 } as CreateProductFavouriteResponse)
      store.addLikedPost(1)
      store.addLikedComment(10)

      // Verify state is set
      expect(store.favouriteProductIds.size).toBe(1)
      expect(store.blogLikedPosts.length).toBe(1)
      expect(store.blogLikedComments.length).toBe(1)

      // Clear state
      store.clearAccountState()

      // Verify state is cleared
      expect(store.favouriteProductIds.size).toBe(0)
      expect(store.blogLikedPosts).toEqual([])
      expect(store.blogLikedComments).toEqual([])
    })

    it('should be safe to call multiple times', () => {
      store.clearAccountState()
      store.clearAccountState()
      store.clearAccountState()

      expect(store.favouriteProductIds.size).toBe(0)
      expect(store.blogLikedPosts).toEqual([])
      expect(store.blogLikedComments).toEqual([])
    })
  })

  describe('complex scenarios', () => {
    it('should handle multiple favourite products', () => {
      store.addFavouriteProduct({ id: 100, product: 1 } as CreateProductFavouriteResponse)
      store.addFavouriteProduct({ id: 200, product: 2 } as CreateProductFavouriteResponse)
      store.addFavouriteProduct({ id: 300, product: 3 } as CreateProductFavouriteResponse)

      expect(store.favouriteProductIds.size).toBe(3)
      expect(store.getFavouriteIdByProductId(1)).toBe(100)
      expect(store.getFavouriteIdByProductId(2)).toBe(200)
      expect(store.getFavouriteIdByProductId(3)).toBe(300)
    })

    it('should handle multiple liked posts and comments', () => {
      store.addLikedPost(1)
      store.addLikedPost(2)
      store.addLikedPost(3)
      store.addLikedComment(10)
      store.addLikedComment(20)

      expect(store.blogLikedPosts).toHaveLength(3)
      expect(store.blogLikedComments).toHaveLength(2)
    })

    it('should maintain separate state for posts and comments', () => {
      store.addLikedPost(1)
      store.addLikedComment(1)

      expect(store.blogPostLiked(1)).toBe(true)
      expect(store.blogCommentLiked(1)).toBe(true)

      store.removeLikedPost(1)
      expect(store.blogPostLiked(1)).toBe(false)
      expect(store.blogCommentLiked(1)).toBe(true)
    })

    it('should handle edge case with ID 0', () => {
      store.addFavouriteProduct({ id: 0, product: 0 } as CreateProductFavouriteResponse)
      expect(store.getFavouriteIdByProductId(0)).toBe(0)

      store.addLikedPost(0)
      expect(store.blogPostLiked(0)).toBe(true)

      store.addLikedComment(0)
      expect(store.blogCommentLiked(0)).toBe(true)
    })

    it('should handle large numbers of items', () => {
      // Add 100 favourite products
      for (let i = 1; i <= 100; i++) {
        store.addFavouriteProduct({ id: i * 10, product: i } as CreateProductFavouriteResponse)
      }
      expect(store.favouriteProductIds.size).toBe(100)

      // Add 100 liked posts
      for (let i = 1; i <= 100; i++) {
        store.addLikedPost(i)
      }
      expect(store.blogLikedPosts).toHaveLength(100)
    })
  })
})
