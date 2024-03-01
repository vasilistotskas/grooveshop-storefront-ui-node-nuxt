import type { Order } from '~/types/order/order'

import PaidSentIcon from '~icons/fa6-solid/circle-check'
import DefaultSentIcon from '~icons/fa6-solid/circle-question'
import CanceledSentIcon from '~icons/fa6-solid/circle-xmark'
import PendingSentIcon from '~icons/fa6-solid/clock'
import SentIcon from '~icons/fa6-solid/paper-plane'

export const useOrder = () => {
	const statusClass = (order: Order) => {
		switch (order.status) {
			case 'SENT':
				return {
					icon: SentIcon,
					color: 'text-blue-500'
				}
			case 'PAID_AND_SENT':
				return {
					icon: PaidSentIcon,
					color: 'text-green-500'
				}
			case 'CANCELED':
				return {
					icon: CanceledSentIcon,
					color: 'text-red-500'
				}
			case 'PENDING':
				return {
					icon: PendingSentIcon,
					color: 'text-primary-500'
				}
			default:
				return {
					icon: DefaultSentIcon,
					color: 'text-primary-500'
				}
		}
	}

	return {
		statusClass
	}
}
