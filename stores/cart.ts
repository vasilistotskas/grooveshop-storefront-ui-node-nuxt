import { FetchError } from 'ofetch'
import { Cart } from '~/types/cart/cart'
import {
	CartItem,
	CartItemCreateRequest,
	CartItemPutRequest
} from '~/types/cart/cart-item'

interface ErrorRecord {
	cart: FetchError | null
}

interface PendingRecord {
	cart: boolean
}

const errorsFactory = (): ErrorRecord => ({
	cart: null
})

const pendingFactory = (): PendingRecord => ({
	cart: false
})

export interface CartState {
	cart: Cart | null
	pending: PendingRecord
	error: ErrorRecord
}

export const useCartStore = defineStore({
	id: 'cart',
	state: (): CartState => ({
		cart: null,
		pending: pendingFactory(),
		error: errorsFactory()
	}),
	getters: {
		getCartItems: (state): CartItem[] | null => {
			if (!state.cart) return null
			return state.cart.cartItems
		},
		getCartItemById:
			(state) =>
			(id: number): CartItem | null => {
				return state.cart?.cartItems.find((item) => item.id === id) || null
			},
		getCartItemByProductId:
			(state) =>
			(productId: number): CartItem | null => {
				return (state.cart?.cartItems
					.map((item) => item.product)
					.find((product) => product.id === productId) || null) as CartItem | null
			}
	},
	actions: {
		async fetchCart() {
			try {
				const {
					data: cart,
					error,
					pending
				} = await useFetch(`/api/cart`, {
					method: 'get'
				})
				this.cart = cart.value
				this.error.cart = error.value
				this.pending.cart = pending.value
			} catch (error) {
				this.error.cart = error as FetchError
			}
		},
		async addCartItem(body: CartItemCreateRequest) {
			try {
				const { error, pending } = await useFetch(`/api/cart-items`, {
					method: 'post',
					body: JSON.stringify(body)
				})
				this.error.cart = error.value
				this.pending.cart = pending.value
			} catch (error) {
				this.error.cart = error as FetchError
			}
		},
		async updateCartItem(id: number, body: CartItemPutRequest) {
			try {
				const { error, pending } = await useFetch(`/api/cart-items/${id}`, {
					method: 'put',
					body
				})
				this.error.cart = error.value
				this.pending.cart = pending.value
			} catch (error) {
				this.error.cart = error as FetchError
			}
		},
		async deleteCartItem(id: number) {
			try {
				const { error, pending } = await useFetch(`/api/cart-items/${id}`, {
					method: 'delete'
				})
				this.error.cart = error.value
				this.pending.cart = pending.value
			} catch (error) {
				this.error.cart = error as FetchError
			}
		}
	}
})
