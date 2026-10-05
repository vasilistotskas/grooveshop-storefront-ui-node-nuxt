const CATEGORY_ICON: Record<NotificationCategory, string> = {
  ORDER: 'i-lucide-shopping-bag',
  PAYMENT: 'i-lucide-credit-card',
  SHIPPING: 'i-lucide-truck',
  CART: 'i-lucide-shopping-cart',
  PRODUCT: 'i-lucide-package',
  ACCOUNT: 'i-lucide-user',
  SECURITY: 'i-lucide-lock',
  PROMOTION: 'i-lucide-tag',
  SYSTEM: 'i-lucide-settings',
  REVIEW: 'i-lucide-message-square',
  WISHLIST: 'i-lucide-heart',
  SUPPORT: 'i-lucide-life-buoy',
  NEWSLETTER: 'i-lucide-mail',
  RECOMMENDATION: 'i-lucide-sparkles',
}

/** The icon for what a notification is about; a bell for a category the storefront does not know. */
export function notificationCategoryIcon(category?: NotificationCategory | string | null): string {
  return (category && CATEGORY_ICON[category as NotificationCategory]) || 'i-lucide-bell'
}
