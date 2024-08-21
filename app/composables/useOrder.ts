import type { Index } from '~/types/order'

export const useOrder = () => {
  const statusClass = (order: Index) => {
    switch (order.status) {
      case 'SENT':
        return {
          icon: 'i-fa6-solid-paper-plane',
          color: 'text-blue-500',
        }
      case 'PAID_AND_SENT':
        return {
          icon: 'i-fa6-solid-circle-check',
          color: 'text-green-500',
        }
      case 'CANCELED':
        return {
          icon: 'i-fa6-solid-circle-xmark',
          color: 'text-red-500',
        }
      case 'PENDING':
        return {
          icon: 'i-fa6-solid-clock',
          color: 'text-primary-500',
        }
      default:
        return {
          icon: 'i-fa6-solid-circle-question',
          color: 'text-primary-500',
        }
    }
  }

  return {
    statusClass,
  }
}
