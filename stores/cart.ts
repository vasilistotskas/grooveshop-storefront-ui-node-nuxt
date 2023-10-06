import { IFetchError } from 'ofetch'
import { Cart } from '~/types/cart/cart'
import { CartItem, CartItemCreateBody, CartItemPutBody } from '~/types/cart/cart-item'

interface ErrorRecord {
	cart: IFetchError | null
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

export const useCartStore = defineStore('cart', () => {
	const cart = ref<Cart | null>(null)
	const pending = ref<PendingRecord>(pendingFactory())
	const error = ref<ErrorRecord>(errorsFactory())

	const getCartItems = computed(() => {
		return cart.value?.cartItems ?? null
	})

	const getCartItemById = (id: number) => {
		return cart.value?.cartItems.find((item) => item.id === id) ?? null
	}

	const getCartItemByProductId = (productId: number) => {
		return (cart.value?.cartItems
			.map((item) => item.product)
			.find((product) => product.id === productId) ?? null) as CartItem | null
	}

	async function fetchCart() {
		const {
			data,
			error: cartError,
			pending: cartPending,
			refresh
		} = await useFetch<Cart>(`/api/cart`, {
			method: 'get'
		})
		cart.value = data.value
		error.value.cart = cartError.value
		pending.value.cart = cartPending.value

		return {
			data,
			error: cartError,
			pending: cartPending,
			refresh
		}
	}

	async function addCartItem(body: CartItemCreateBody) {
		const { error: cartError, pending: cartPending } = await useFetch(`/api/cart-items`, {
			method: 'post',
			body
		})
		error.value.cart = cartError.value
		pending.value.cart = cartPending.value

		return {
			error: cartError,
			pending: cartPending
		}
	}

	async function updateCartItem(id: number, body: CartItemPutBody) {
		const { error: cartError, pending: cartPending } = await useFetch(
			`/api/cart-items/${id}`,
			{
				method: 'put',
				body
			}
		)
		error.value.cart = cartError.value
		pending.value.cart = cartPending.value

		return {
			error: cartError,
			pending: cartPending
		}
	}

	async function deleteCartItem(id: number) {
		const { error: cartError, pending: cartPending } = await useFetch(
			`/api/cart-items/${id}`,
			{
				method: 'delete'
			}
		)
		error.value.cart = cartError.value
		pending.value.cart = cartPending.value

		return {
			error: cartError,
			pending: cartPending
		}
	}

	function cleanCartState() {
		cart.value = null
		pending.value = pendingFactory()
		error.value = errorsFactory()
	}

	return {
		cart,
		pending,
		error,
		getCartItems,
		getCartItemById,
		getCartItemByProductId,
		fetchCart,
		addCartItem,
		updateCartItem,
		deleteCartItem,
		cleanCartState
	}
})
