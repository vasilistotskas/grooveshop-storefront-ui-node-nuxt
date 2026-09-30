import { describe, it, expect } from 'vitest'
import { useOrder } from '~/composables/useOrder'
import type { Order } from '~~/shared/openapi/types.gen'

/**
 * The status badges of the account order pages. The icon and the text
 * colour ARE the output: each status must stay visually distinct, and an
 * unknown status must still render.
 */
describe('useOrder', () => {
  const { statusClass, paymentStatusClass } = useOrder()

  describe('statusClass', () => {
    it.each([
      ['PENDING', 'i-fa6-solid-clock', 'text-yellow-600 dark:text-yellow-400'],
      ['PROCESSING', 'i-fa6-solid-gear', 'text-blue-600 dark:text-blue-400'],
      ['SHIPPED', 'i-fa6-solid-truck', 'text-blue-500 dark:text-blue-300'],
      ['DELIVERED', 'i-fa6-solid-box', 'text-green-600 dark:text-green-400'],
      ['COMPLETED', 'i-fa6-solid-circle-check', 'text-green-500 dark:text-green-300'],
      ['CANCELED', 'i-fa6-solid-circle-xmark', 'text-red-500 dark:text-red-300'],
      ['RETURNED', 'i-fa6-solid-rotate-left', 'text-orange-600 dark:text-orange-400'],
      ['REFUNDED', 'i-fa6-solid-money-bill-transfer', 'text-orange-500 dark:text-orange-300'],
      ['SOMETHING_NEW', 'i-fa6-solid-circle-question', 'text-gray-500 dark:text-gray-300'],
    ])('shows %s with %s', (status, icon, color) => {
      expect(statusClass({ status } as Order)).toEqual({ icon, color })
    })
  })

  describe('paymentStatusClass', () => {
    it.each([
      ['COMPLETED', 'i-fa6-solid-credit-card', 'text-green-600 dark:text-green-400'],
      ['PENDING', 'i-fa6-solid-spinner', 'text-yellow-600 dark:text-yellow-400'],
      ['PROCESSING', 'i-fa6-solid-spinner', 'text-yellow-600 dark:text-yellow-400'],
      ['FAILED', 'i-fa6-solid-ban', 'text-red-600 dark:text-red-400'],
      ['CANCELED', 'i-fa6-solid-ban', 'text-red-600 dark:text-red-400'],
      ['REFUNDED', 'i-fa6-solid-rotate-left', 'text-orange-600 dark:text-orange-400'],
      ['PARTIALLY_REFUNDED', 'i-fa6-solid-rotate-left', 'text-orange-600 dark:text-orange-400'],
      ['SOMETHING_NEW', 'i-fa6-solid-circle-question', 'text-gray-600 dark:text-gray-400'],
    ])('shows %s with %s', (status, icon, color) => {
      expect(paymentStatusClass(status)).toEqual({ icon, color })
    })
  })
})
