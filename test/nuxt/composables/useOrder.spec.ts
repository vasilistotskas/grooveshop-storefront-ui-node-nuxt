import { describe, it, expect } from 'vitest'
import { useOrder } from '~/composables/useOrder'

describe('useOrder', () => {
  const { statusClass, paymentStatusClass } = useOrder()

  describe('statusClass', () => {
    it('should return correct class for PENDING status', () => {
      const result = statusClass({ status: 'PENDING' } as Order)
      expect(result).toEqual({
        icon: 'i-fa6-solid-clock',
        color: 'text-yellow-600 dark:text-yellow-400',
      })
    })

    it('should return correct class for PROCESSING status', () => {
      const result = statusClass({ status: 'PROCESSING' } as Order)
      expect(result).toEqual({
        icon: 'i-fa6-solid-gear',
        color: 'text-blue-600 dark:text-blue-400',
      })
    })

    it('should return correct class for SHIPPED status', () => {
      const result = statusClass({ status: 'SHIPPED' } as Order)
      expect(result).toEqual({
        icon: 'i-fa6-solid-truck',
        color: 'text-blue-500 dark:text-blue-300',
      })
    })

    it('should return correct class for DELIVERED status', () => {
      const result = statusClass({ status: 'DELIVERED' } as Order)
      expect(result).toEqual({
        icon: 'i-fa6-solid-box',
        color: 'text-green-600 dark:text-green-400',
      })
    })

    it('should return correct class for COMPLETED status', () => {
      const result = statusClass({ status: 'COMPLETED' } as Order)
      expect(result).toEqual({
        icon: 'i-fa6-solid-circle-check',
        color: 'text-green-500 dark:text-green-300',
      })
    })

    it('should return correct class for CANCELED status', () => {
      const result = statusClass({ status: 'CANCELED' } as Order)
      expect(result).toEqual({
        icon: 'i-fa6-solid-circle-xmark',
        color: 'text-red-500 dark:text-red-300',
      })
    })

    it('should return correct class for RETURNED status', () => {
      const result = statusClass({ status: 'RETURNED' } as Order)
      expect(result).toEqual({
        icon: 'i-fa6-solid-rotate-left',
        color: 'text-orange-600 dark:text-orange-400',
      })
    })

    it('should return correct class for REFUNDED status', () => {
      const result = statusClass({ status: 'REFUNDED' } as Order)
      expect(result).toEqual({
        icon: 'i-fa6-solid-money-bill-transfer',
        color: 'text-orange-500 dark:text-orange-300',
      })
    })

    it('should return default class for unknown status', () => {
      const result = statusClass({ status: 'UNKNOWN' } as any)
      expect(result).toEqual({
        icon: 'i-fa6-solid-circle-question',
        color: 'text-gray-500 dark:text-gray-300',
      })
    })
  })

  describe('paymentStatusClass', () => {
    it('should return correct class for COMPLETED payment status', () => {
      const result = paymentStatusClass('COMPLETED')
      expect(result).toEqual({
        icon: 'i-fa6-solid-credit-card',
        color: 'text-green-600 dark:text-green-400',
      })
    })

    it('should return correct class for PENDING payment status', () => {
      const result = paymentStatusClass('PENDING')
      expect(result).toEqual({
        icon: 'i-fa6-solid-spinner',
        color: 'text-yellow-600 dark:text-yellow-400',
      })
    })

    it('should return correct class for PROCESSING payment status', () => {
      const result = paymentStatusClass('PROCESSING')
      expect(result).toEqual({
        icon: 'i-fa6-solid-spinner',
        color: 'text-yellow-600 dark:text-yellow-400',
      })
    })

    it('should return correct class for FAILED payment status', () => {
      const result = paymentStatusClass('FAILED')
      expect(result).toEqual({
        icon: 'i-fa6-solid-ban',
        color: 'text-red-600 dark:text-red-400',
      })
    })

    it('should return correct class for CANCELED payment status', () => {
      const result = paymentStatusClass('CANCELED')
      expect(result).toEqual({
        icon: 'i-fa6-solid-ban',
        color: 'text-red-600 dark:text-red-400',
      })
    })

    it('should return correct class for REFUNDED payment status', () => {
      const result = paymentStatusClass('REFUNDED')
      expect(result).toEqual({
        icon: 'i-fa6-solid-rotate-left',
        color: 'text-orange-600 dark:text-orange-400',
      })
    })

    it('should return correct class for PARTIALLY_REFUNDED payment status', () => {
      const result = paymentStatusClass('PARTIALLY_REFUNDED')
      expect(result).toEqual({
        icon: 'i-fa6-solid-rotate-left',
        color: 'text-orange-600 dark:text-orange-400',
      })
    })

    it('should return default class for unknown payment status', () => {
      const result = paymentStatusClass('UNKNOWN')
      expect(result).toEqual({
        icon: 'i-fa6-solid-circle-question',
        color: 'text-gray-600 dark:text-gray-400',
      })
    })
  })
})
