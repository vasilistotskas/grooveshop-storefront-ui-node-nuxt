import { describe, it, expect } from 'vitest'
import { notificationCategoryIcon } from '~/utils/notificationIcon'

describe('notificationCategoryIcon', () => {
  it.each([
    ['ORDER', 'i-lucide-shopping-bag'],
    ['SHIPPING', 'i-lucide-truck'],
    ['PROMOTION', 'i-lucide-tag'],
    ['WISHLIST', 'i-lucide-heart'],
  ])('draws a %s notification with its own icon', (category, icon) => {
    expect(notificationCategoryIcon(category)).toBe(icon)
  })

  it.each([undefined, null, '', 'SOMETHING_NEW'])('draws a bell for %j, a category the storefront does not know', (category) => {
    expect(notificationCategoryIcon(category)).toBe('i-lucide-bell')
  })
})
