import { FetchError } from 'ofetch'
import { Order, OrderCreateRequest, OrderQuery } from '~/types/order/order'
import { Pagination } from '~/types/pagination/pagination'

interface ErrorRecord {
	orders: FetchError | null
	order: FetchError | null
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

export interface OrderState {
	orders: Pagination<Order> | null
	order: Order | null
	pending: PendingRecord
	error: ErrorRecord
}

export const useOrderStore = defineStore({
	id: 'order',
	state: (): OrderState => ({
		orders: null,
		order: null,
		pending: pendingFactory(),
		error: errorsFactory()
	}),
	getters: {
		getOrderById:
			(state) =>
			(id: number): Order | null => {
				return state.orders?.results?.find((order) => order.id === id) || null
			}
	},
	actions: {
		async fetchOrders({ page, ordering, userId }: OrderQuery) {
			try {
				const {
					data: orders,
					error,
					pending
				} = await useFetch(`/api/orders`, {
					method: 'get',
					params: {
						page,
						ordering,
						userId
					}
				})
				this.orders = orders.value
				this.error.orders = error.value
				this.pending.orders = pending.value
			} catch (error) {
				this.error.orders = error as FetchError
			}
		},
		async fetchOrder(id: string | number) {
			try {
				const {
					data: order,
					error,
					pending
				} = await useFetch(`/api/order/${id}`, {
					method: 'get'
				})
				this.order = order.value
				this.error.order = error.value
				this.pending.order = pending.value
			} catch (error) {
				this.error.order = error as FetchError
			}
		},
		async createOrder(body: OrderCreateRequest) {
			try {
				const {
					data: order,
					error,
					pending
				} = await useFetch(`/api/orders`, {
					method: 'post',
					body
				})
				this.order = order.value
				this.error.order = error.value
				this.pending.order = pending.value
			} catch (error) {
				this.error.order = error as FetchError
			}
		}
	}
})
