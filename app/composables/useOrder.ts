export const useOrder = () => {
  const statusClass = (order: Order) => {
    switch (order.status) {
      case 'PENDING':
        return {
          icon: 'i-fa6-solid-clock',
          color: 'text-yellow-600 dark:text-yellow-400',
        }
      case 'PROCESSING':
        return {
          icon: 'i-fa6-solid-gear',
          color: 'text-blue-600 dark:text-blue-400',
        }
      case 'SHIPPED':
        return {
          icon: 'i-fa6-solid-truck',
          color: 'text-blue-500 dark:text-blue-300',
        }
      case 'DELIVERED':
        return {
          icon: 'i-fa6-solid-box',
          color: 'text-green-600 dark:text-green-400',
        }
      case 'COMPLETED':
        return {
          icon: 'i-fa6-solid-circle-check',
          color: 'text-green-500 dark:text-green-300',
        }
      case 'CANCELED':
        return {
          icon: 'i-fa6-solid-circle-xmark',
          color: 'text-red-500 dark:text-red-300',
        }
      case 'RETURNED':
        return {
          icon: 'i-fa6-solid-rotate-left',
          color: 'text-orange-600 dark:text-orange-400',
        }
      case 'REFUNDED':
        return {
          icon: 'i-fa6-solid-money-bill-transfer',
          color: 'text-orange-500 dark:text-orange-300',
        }
      default:
        return {
          icon: 'i-fa6-solid-circle-question',
          color: 'text-gray-500 dark:text-gray-300',
        }
    }
  }

  const paymentStatusClass = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'COMPLETED':
        return {
          icon: 'i-fa6-solid-credit-card',
          color: 'text-green-600 dark:text-green-400',
        }
      case 'PENDING':
      case 'PROCESSING':
        return {
          icon: 'i-fa6-solid-spinner',
          color: 'text-yellow-600 dark:text-yellow-400',
        }
      case 'FAILED':
      case 'CANCELED':
        return {
          icon: 'i-fa6-solid-ban',
          color: 'text-red-600 dark:text-red-400',
        }
      case 'REFUNDED':
      case 'PARTIALLY_REFUNDED':
        return {
          icon: 'i-fa6-solid-rotate-left',
          color: 'text-orange-600 dark:text-orange-400',
        }
      default:
        return {
          icon: 'i-fa6-solid-circle-question',
          color: 'text-gray-600 dark:text-gray-400',
        }
    }
  }

  return {
    statusClass,
    paymentStatusClass,
  }
}
