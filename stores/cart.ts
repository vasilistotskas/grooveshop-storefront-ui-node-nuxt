import type { IFetchError } from 'ofetch'
import { v4 as uuidv4 } from 'uuid'
import type { Cart } from '~/types/cart/cart'
import type {
	CartItem,
	CartItemAddBody,
	CartItemCreateBody,
	CartItemPutBody
} from '~/types/cart/cart-item'

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

	const getCartTotalItems = computed(() => {
		return cart.value?.totalItems ?? 0
	})

	const getCartItemById = (id: number) => {
		return cart.value?.cartItems.find((item) => item.id === id) ?? null
	}

	const getCartItemByProductId = (productId: number) => {
		return (cart.value?.cartItems
			.map((item) => item.product)
			.find((product) => product.id === productId) ?? null) as CartItem | null
	}

	async function fetchCartFromIDB() {
		const cartFromIDB = await get<Cart>('cart')
		if (!cartFromIDB) {
			await set('cart', {
				id: Date.now(),
				user: null,
				totalPrice: 0,
				totalDiscountValue: 0,
				totalVatValue: 0,
				totalItems: 0,
				totalItemsUnique: 0,
				cartItems: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			})
		}
		cart.value = cartFromIDB ?? null
	}

	async function fetchCart() {
		if (process.prerender) {
			return
		}

		const authenticated = await useAsyncIDBKeyval('auth', false)
		if (!authenticated.value && process.client) {
			await fetchCartFromIDB()
			return
		}

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

	async function updateIdbCartTotals(cartFromIDB: Cart, cartItems: CartItem[]) {
		await update('cart', () => ({
			...cartFromIDB,
			totalPrice: cartItems.reduce(
				(acc, item) => acc + item.quantity * item.product.finalPrice,
				0
			),
			totalDiscountValue: cartItems.reduce(
				(acc, item) => acc + item.quantity * item.product.discountValue,
				0
			),
			totalVatValue: cartItems.reduce(
				(acc, item) => acc + item.quantity * item.product.vatValue,
				0
			),
			totalItems: cartItems.reduce((acc, item) => acc + item.quantity, 0),
			totalItemsUnique: cartItems.length,
			cartItems,
			updatedAt: new Date().toISOString()
		}))
	}

	async function addCartItemToIDB(cartItem: CartItem) {
		const cartFromIDB = await get<Cart>('cart')
		if (!cartFromIDB) {
			// eslint-disable-next-line no-console
			console.error('Cart not found in IDB')
			return
		}

		const cartItems = cartFromIDB?.cartItems ?? []
		const existingCartItem = cartItems.find(
			(item) => item.product.id === cartItem.product.id
		)

		if (existingCartItem) {
			existingCartItem.quantity += cartItem.quantity
			existingCartItem.updatedAt = new Date().toISOString()
		} else {
			cartItems.push(cartItem)
		}

		await updateIdbCartTotals(cartFromIDB, cartItems)
	}

	async function addCartItem(body: CartItemAddBody) {
		if (process.prerender) {
			return
		}
		const authenticated = await useAsyncIDBKeyval('auth', false)
		if (!authenticated.value) {
			const productData = {
				translations: JSON.parse(JSON.stringify(body.product.translations)),
				id: body.product.id,
				slug: body.product.slug,
				category: body.product.category,
				absoluteUrl: body.product.absoluteUrl,
				price: body.product.price,
				vat: body.product.vat,
				vatPercent: body.product.vatPercent,
				vatValue: body.product.vatValue,
				finalPrice: body.product.finalPrice,
				hits: body.product.hits,
				likesCounter: body.product.likesCounter,
				stock: body.product.stock,
				active: body.product.active,
				weight: body.product.weight,
				seoTitle: body.product.seoTitle,
				seoDescription: body.product.seoDescription,
				seoKeywords: body.product.seoKeywords,
				uuid: body.product.uuid,
				discountPercent: body.product.discountPercent,
				discountValue: body.product.discountValue,
				priceSavePercent: body.product.priceSavePercent,
				createdAt: body.product.createdAt,
				updatedAt: body.product.updatedAt,
				mainImageAbsoluteUrl: body.product.mainImageAbsoluteUrl,
				mainImageFilename: body.product.mainImageFilename,
				reviewAverage: body.product.reviewAverage,
				reviewCounter: body.product.reviewCounter
			}
			const newCartItem = {
				id: Date.now(),
				cart: Date.now(),
				product: productData,
				price: body.product.price,
				quantity: body.quantity,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				uuid: uuidv4()
			}
			await addCartItemToIDB(newCartItem)
			return
		}

		const requestBody: CartItemCreateBody = {
			product: body.product.id.toString(),
			quantity: body.quantity.toString()
		}

		const { error: cartError, pending: cartPending } = await useFetch(`/api/cart-items`, {
			method: 'post',
			body: requestBody
		})
		error.value.cart = cartError.value
		pending.value.cart = cartPending.value

		return {
			error: cartError,
			pending: cartPending
		}
	}

	async function updateCartItemInIDB(id: number, body: CartItemPutBody) {
		const cartFromIDB = await get<Cart>('cart')
		if (!cartFromIDB) {
			// eslint-disable-next-line no-console
			console.error('Cart not found in IDB')
			return
		}
		const cartItems = cartFromIDB?.cartItems ?? []
		const cartItem = cartItems.find((item) => item.id === id)
		if (!cartItem) {
			return
		}
		cartItem.quantity = Number(body.quantity)

		await updateIdbCartTotals(cartFromIDB, cartItems)
	}

	async function updateCartItem(id: number, body: CartItemPutBody) {
		if (process.prerender) {
			return
		}
		const authenticated = await useAsyncIDBKeyval('auth', false)
		if (!authenticated.value) {
			await updateCartItemInIDB(id, body)
			return
		}

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

	async function deleteCartItemFromIDB(id: number) {
		const cartFromIDB = await get<Cart>('cart')
		if (!cartFromIDB) {
			// eslint-disable-next-line no-console
			console.error('Cart not found in IDB')
			return
		}
		const cartItems = cartFromIDB?.cartItems ?? []
		const cartItemIndex = cartItems.findIndex((item) => item.id === Number(id))
		if (cartItemIndex !== -1) {
			cartItems.splice(cartItemIndex, 1)
		}

		await updateIdbCartTotals(cartFromIDB, cartItems)
	}

	async function deleteCartItem(id: number) {
		if (process.prerender) {
			return
		}
		const authenticated = await useAsyncIDBKeyval('auth', false)
		if (!authenticated.value) {
			await deleteCartItemFromIDB(id)
			return
		}

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
		getCartTotalItems,
		getCartItemById,
		getCartItemByProductId,
		fetchCart,
		addCartItem,
		updateCartItem,
		deleteCartItem,
		cleanCartState
	}
})
