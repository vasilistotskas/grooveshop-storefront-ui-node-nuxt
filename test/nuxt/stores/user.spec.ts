import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'

describe('User Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createTestComponent = () => {
    return defineComponent({
      setup() {
        const store = useUserStore()
        return { store }
      },
      render() {
        return h('div', { id: 'test' })
      },
    })
  }

  describe('initial state', () => {
    it('should have null account', async () => {
      const wrapper = await mountSuspended(createTestComponent())
      const vm = wrapper.vm as unknown as { store: ReturnType<typeof useUserStore> }
      expect(vm.store.account).toBeNull()
    })

    it('should have empty favourite product IDs map', async () => {
      const wrapper = await mountSuspended(createTestComponent())
      const vm = wrapper.vm as unknown as { store: ReturnType<typeof useUserStore> }
      expect(vm.store.favouriteProductIds.size).toBe(0)
    })

    it('should have empty liked posts array', async () => {
      const wrapper = await mountSuspended(createTestComponent())
      const vm = wrapper.vm as unknown as { store: ReturnType<typeof useUserStore> }
      expect(vm.store.blogLikedPosts).toEqual([])
    })

    it('should have empty liked comments array', async () => {
      const wrapper = await mountSuspended(createTestComponent())
      const vm = wrapper.vm as unknown as { store: ReturnType<typeof useUserStore> }
      expect(vm.store.blogLikedComments).toEqual([])
    })
  })

  describe('favourite products', () => {
    it('should add favourite product', async () => {
      const wrapper = await mountSuspended(createTestComponent())
      const vm = wrapper.vm as unknown as { store: ReturnType<typeof useUserStore> }
      
      const favourite = { id: 100, product: 1 } as CreateProductFavouriteResponse
      vm.store.addFavouriteProduct(favourite)

      expect(vm.store.favouriteProductIds.get(1)).toBe(100)
    })

    it('should get favourite ID by product ID', async () => {
      const wrapper = await mountSuspended(createTestComponent())
      const vm = wrapper.vm as unknown as { store: ReturnType<typeof useUserStore> }
      
      const favourite = { id: 200, product: 2 } as CreateProductFavouriteResponse
      vm.store.addFavouriteProduct(favourite)

      const favouriteId = vm.store.getFavouriteIdByProductId(2)
      expect(favouriteId).toBe(200)
    })

    it('should return undefined for non-existent product', async () => {
      const wrapper = await mountSuspended(createTestComponent())
      const vm = wrapper.vm as unknown as { store: ReturnType<typeof useUserStore> }
      
      const favouriteId = vm.store.getFavouriteIdByProductId(999)
      expect(favouriteId).toBeUndefined()
    })

    it('should remove favourite product', async () => {
      const wrapper = await mountSuspended(createTestComponent())
      const vm = wrapper.vm as unknown as { store: ReturnType<typeof useUserStore> }
      
      const favourite = { id: 300, product: 3 } as CreateProductFavouriteResponse
      vm.store.addFavouriteProduct(favourite)
      expect(vm.store.favouriteProductIds.has(3)).toBe(true)

      vm.store.removeFavouriteProduct(3)
      expect(vm.store.favouriteProductIds.has(3)).toBe(false)
    })

    it('should update multiple favourite products', async () => {
      const wrapper = await mountSuspended(createTestComponent())
      const vm = wrapper.vm as unknown as { store: ReturnType<typeof useUserStore> }
      
      const favourites = [
        { id: 100, productId: 1 },
        { id: 200, productId: 2 },
        { id: 300, productId: 3 },
      ] as GetProductFavouritesByProductsResponse

      vm.store.updateFavouriteProducts(favourites)

      expect(vm.store.favouriteProductIds.get(1)).toBe(100)
      expect(vm.store.favouriteProductIds.get(2)).toBe(200)
      expect(vm.store.favouriteProductIds.get(3)).toBe(300)
    })
  })

  describe('blog liked posts', () => {
    it('should check if post is liked', async () => {
      const wrapper = await mountSuspended(createTestComponent())
      const vm = wrapper.vm as unknown as { store: ReturnType<typeof useUserStore> }
      expect(vm.store.blogPostLiked(1)).toBe(false)
    })

    it('should add liked post', async () => {
      const wrapper = await mountSuspended(createTestComponent())
      const vm = wrapper.vm as unknown as { store: ReturnType<typeof useUserStore> }
      
      vm.store.addLikedPost(1)
      expect(vm.store.blogPostLiked(1)).toBe(true)
      expect(vm.store.blogLikedPosts).toContain(1)
    })

    it('should remove liked post', async () => {
      const wrapper = await mountSuspended(createTestComponent())
      const vm = wrapper.vm as unknown as { store: ReturnType<typeof useUserStore> }
      
      vm.store.addLikedPost(1)
      expect(vm.store.blogPostLiked(1)).toBe(true)

      vm.store.removeLikedPost(1)
      expect(vm.store.blogPostLiked(1)).toBe(false)
      expect(vm.store.blogLikedPosts).not.toContain(1)
    })

    it('should update liked posts with array', async () => {
      const wrapper = await mountSuspended(createTestComponent())
      const vm = wrapper.vm as unknown as { store: ReturnType<typeof useUserStore> }
      
      vm.store.updateLikedPosts([1, 2, 3])
      expect(vm.store.blogLikedPosts).toEqual([1, 2, 3])
    })
  })

  describe('blog liked comments', () => {
    it('should check if comment is liked', async () => {
      const wrapper = await mountSuspended(createTestComponent())
      const vm = wrapper.vm as unknown as { store: ReturnType<typeof useUserStore> }
      expect(vm.store.blogCommentLiked(1)).toBe(false)
    })

    it('should add liked comment', async () => {
      const wrapper = await mountSuspended(createTestComponent())
      const vm = wrapper.vm as unknown as { store: ReturnType<typeof useUserStore> }
      
      vm.store.addLikedComment(1)
      expect(vm.store.blogCommentLiked(1)).toBe(true)
      expect(vm.store.blogLikedComments).toContain(1)
    })

    it('should remove liked comment', async () => {
      const wrapper = await mountSuspended(createTestComponent())
      const vm = wrapper.vm as unknown as { store: ReturnType<typeof useUserStore> }
      
      vm.store.addLikedComment(1)
      expect(vm.store.blogCommentLiked(1)).toBe(true)

      vm.store.removeLikedComment(1)
      expect(vm.store.blogCommentLiked(1)).toBe(false)
      expect(vm.store.blogLikedComments).not.toContain(1)
    })

    it('should update liked comments with array', async () => {
      const wrapper = await mountSuspended(createTestComponent())
      const vm = wrapper.vm as unknown as { store: ReturnType<typeof useUserStore> }
      
      vm.store.updateLikedComments([10, 20, 30])
      expect(vm.store.blogLikedComments).toEqual([10, 20, 30])
    })
  })

  describe('clearAccountState', () => {
    it('should clear all account state', async () => {
      const wrapper = await mountSuspended(createTestComponent())
      const vm = wrapper.vm as unknown as { store: ReturnType<typeof useUserStore> }
      
      // First clear any existing state from previous tests
      vm.store.clearAccountState()
      
      // Setup some state
      vm.store.addFavouriteProduct({ id: 100, product: 1 } as CreateProductFavouriteResponse)
      vm.store.addLikedPost(1)
      vm.store.addLikedComment(10)

      // Verify state is set
      expect(vm.store.favouriteProductIds.size).toBe(1)
      expect(vm.store.blogLikedPosts.length).toBe(1)
      expect(vm.store.blogLikedComments.length).toBe(1)

      // Clear state
      vm.store.clearAccountState()

      // Verify state is cleared
      expect(vm.store.favouriteProductIds.size).toBe(0)
      expect(vm.store.blogLikedPosts).toEqual([])
      expect(vm.store.blogLikedComments).toEqual([])
    })
  })
})
