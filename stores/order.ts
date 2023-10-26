import type { IFetchError } from 'ofetch'
import type { Order, OrderCreateBody, OrderQuery } from '~/types/order/order'
import type { Pagination } from '~/types/pagination/pagination'

interface ErrorRecord {
	orders: IFetchError | null
	order: IFetchError | null
}

interface PendingRecord {
	orders: boolean
	order: boolean
}

const errorsFactory = (): ErrorRecord => ({
	orders: null,
	order: null
})

const pendingFactory = (): PendingRecord => ({
	orders: false,
	order: false
})

export const useOrderStore = defineStore('order', () => {
	const orders = ref<Pagination<Order> | null>(null)
	const order = ref<Order | null>(null)
	const pending = ref<PendingRecord>(pendingFactory())
	const error = ref<ErrorRecord>(errorsFactory())

	async function fetchOrders({ page, ordering, userId }: OrderQuery) {
		const {
			data,
			error: orderError,
			pending: orderPending,
			refresh
		} = await useFetch<Pagination<Order>>(`/api/orders`, {
			method: 'get',
			params: {
				page,
				ordering,
				userId
			}
		})
		orders.value = data.value
		error.value.orders = orderError.value
		pending.value.orders = orderPending.value

		return {
			data,
			error: orderError,
			pending: orderPending,
			refresh
		}
	}

	async function fetchOrder(id: number) {
		const {
			data,
			error: orderError,
			pending: orderPending,
			refresh
		} = await useFetch<Order>(`/api/order/${id}`, {
			method: 'get'
		})
		order.value = data.value
		error.value.order = orderError.value
		pending.value.order = orderPending.value

		return {
			data,
			error: orderError,
			pending: orderPending,
			refresh
		}
	}

	async function fetchOrderByUUID(uuid: string) {
		const {
			data,
			error: orderError,
			pending: orderPending,
			refresh
		} = await useFetch<Order>(`/api/order/uuid/${uuid}`, {
			method: 'get'
		})
		order.value = data.value
		error.value.order = orderError.value
		pending.value.order = orderPending.value

		return {
			data,
			error: orderError,
			pending: orderPending,
			refresh
		}
	}

	async function createOrder(body: OrderCreateBody) {
		const {
			data,
			error: orderError,
			pending: orderPending,
			refresh
		} = await useFetch<Order>(`/api/orders`, {
			key: 'createOrder',
			method: 'post',
			body
		})
		order.value = data.value
		error.value.order = orderError.value
		pending.value.order = orderPending.value

		return {
			data,
			error: orderError,
			pending: orderPending,
			refresh
		}
	}

	return {
		orders,
		order,
		pending,
		error,
		fetchOrders,
		fetchOrder,
		fetchOrderByUUID,
		createOrder
	}
})
