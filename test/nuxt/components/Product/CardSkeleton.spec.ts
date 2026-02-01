import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProductCardSkeleton from '~/components/Product/CardSkeleton.vue'

describe('ProductCardSkeleton', () => {
  it('renders the skeleton loader component', async () => {
    const wrapper = await mountSuspended(ProductCardSkeleton)
    expect(wrapper.exists()).toBe(true)
  })

  it('renders as a list item', async () => {
    const wrapper = await mountSuspended(ProductCardSkeleton)
    expect(wrapper.element.tagName).toBe('LI')
  })

  it('renders skeleton placeholders for all product card sections', async () => {
    const wrapper = await mountSuspended(ProductCardSkeleton)
    
    // Should have multiple skeleton elements
    const skeletons = wrapper.findAllComponents({ name: 'USkeleton' })
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('maintains proper aspect ratio for image placeholder', async () => {
    const wrapper = await mountSuspended(ProductCardSkeleton)
    
    // Check for aspect-[4/3] class on image container (Requirement 3.1: 4:3 aspect ratio)
    const imageContainer = wrapper.find('.aspect-\\[4\\/3\\]')
    expect(imageContainer.exists()).toBe(true)
  })

  it('includes badge placeholders in top-left corner', async () => {
    const wrapper = await mountSuspended(ProductCardSkeleton)
    
    // Check for badge placeholder in top-left
    const topLeft = wrapper.find('.absolute.top-4.left-4')
    expect(topLeft.exists()).toBe(true)
  })

  it('includes action button placeholders in top-right corner', async () => {
    const wrapper = await mountSuspended(ProductCardSkeleton)
    
    // Check for action buttons placeholder in top-right
    const topRight = wrapper.find('.absolute.top-4.right-4')
    expect(topRight.exists()).toBe(true)
  })

  it('includes content section with proper spacing', async () => {
    const wrapper = await mountSuspended(ProductCardSkeleton)
    
    // Check for content container with gap-4
    const contentContainer = wrapper.find('.flex.flex-col.gap-4.p-6')
    expect(contentContainer.exists()).toBe(true)
  })

  it('includes rating placeholder with 5 stars', async () => {
    const wrapper = await mountSuspended(ProductCardSkeleton)
    
    // Find the rating container
    const ratingContainer = wrapper.find('.flex.items-center.gap-2')
    expect(ratingContainer.exists()).toBe(true)
    
    // Should have 5 star placeholders
    const starPlaceholders = ratingContainer.findAll('.size-4.rounded-sm')
    expect(starPlaceholders.length).toBe(5)
  })

  it('includes price section placeholder', async () => {
    const wrapper = await mountSuspended(ProductCardSkeleton)
    
    // Check for price section
    const priceSection = wrapper.find('.flex.flex-col.gap-2')
    expect(priceSection.exists()).toBe(true)
  })

  it('includes add to cart button placeholder', async () => {
    const wrapper = await mountSuspended(ProductCardSkeleton)
    
    // Find the button placeholder (last skeleton in content area)
    const skeletons = wrapper.findAllComponents({ name: 'USkeleton' })
    const buttonSkeleton = skeletons[skeletons.length - 1]
    
    // Should have h-10 class for button height
    expect(buttonSkeleton).toBeDefined()
    expect(buttonSkeleton?.classes()).toContain('h-10')
  })
})
