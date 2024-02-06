import type { IFetchError } from 'ofetch'
import type {
	Address,
	AddressCreateBody,
	AddressPutBody,
	AddressQuery
} from '~/types/user/address'
import type { Pagination } from '~/types/pagination'

interface ErrorRecord {
	addresses: IFetchError | null
	address: IFetchError | null
}

interface PendingRecord {
	addresses: boolean
	address: boolean
}

const errorsFactory = (): ErrorRecord => ({
	addresses: null,
	address: null
})

const pendingFactory = (): PendingRecord => ({
	addresses: false,
	address: false
})

export const useUserAddressStore = defineStore('userAddress', () => {
	const addresses = ref<Pagination<Address> | null>(null)
	const address = ref<Address | null>(null)
	const pending = ref<PendingRecord>(pendingFactory())
	const error = ref<ErrorRecord>(errorsFactory())

	async function fetchAddresses({ page, ordering, user }: AddressQuery) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: addressesError,
			pending: addressesPending,
			refresh
		} = await useFetch<Pagination<Address>>(`/api/user/addresses`, {
			method: 'get',
			params: {
				page,
				ordering,
				user
			}
		})
		addresses.value = data.value
		error.value.addresses = addressesError.value
		pending.value.addresses = addressesPending.value

		return {
			data,
			error: addressesError,
			pending: addressesPending,
			refresh
		}
	}

	async function fetchUserAddresses({ page, ordering, user, pagination }: AddressQuery) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: addressesError,
			pending: addressesPending,
			refresh
		} = await useFetch<Pagination<Address>>(`/api/user/addresses/get-user-addresses`, {
			method: 'get',
			params: {
				page,
				ordering,
				user,
				pagination
			}
		})
		addresses.value = data.value
		error.value.addresses = addressesError.value
		pending.value.addresses = addressesPending.value

		return {
			data,
			error: addressesError,
			pending: addressesPending,
			refresh
		}
	}

	async function fetchAddress(id: string | number) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: addressError,
			pending: addressPending,
			refresh
		} = await useFetch<Address>(`/api/user/addresses/${id}`, {
			method: 'get'
		})
		address.value = data.value
		error.value.address = addressError.value
		pending.value.address = addressPending.value

		return {
			data,
			error: addressError,
			pending: addressPending,
			refresh
		}
	}

	async function createAddress(body: AddressCreateBody) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: addressError,
			pending: addressPending,
			refresh
		} = await useFetch<Address>(`/api/user/addresses`, {
			method: 'post',
			body
		})
		address.value = data.value
		error.value.address = addressError.value
		pending.value.address = addressPending.value

		return {
			data,
			error: addressError,
			pending: addressPending,
			refresh
		}
	}

	async function updateAddress(id: string | number, body: AddressPutBody) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: addressError,
			pending: addressPending,
			refresh
		} = await useFetch<Address>(`/api/user/addresses/${id}`, {
			method: 'put',
			body
		})
		address.value = data.value
		error.value.address = addressError.value
		pending.value.address = addressPending.value

		return {
			data,
			error: addressError,
			pending: addressPending,
			refresh
		}
	}

	async function deleteAddress(id: string | number) {
		if (process.prerender) {
			return
		}
		const {
			error: addressError,
			pending: addressPending,
			refresh
		} = await useFetch(`/api/user/addresses/${id}`, {
			method: 'delete'
		})
		error.value.address = addressError.value
		pending.value.address = addressPending.value
		const index = addresses.value?.results?.findIndex(
			(address) => Number(address.id) === Number(id)
		)
		if (index !== undefined && index !== -1) {
			addresses.value?.results?.splice(index, 1)
		}

		return {
			error: addressError,
			pending: addressPending,
			refresh
		}
	}

	async function setMainAddress(id: string | number) {
		if (process.prerender) {
			return
		}
		const {
			error: addressError,
			pending: addressPending,
			refresh
		} = await useFetch(`/api/user/addresses/${id}/set-main`, {
			method: 'post'
		})
		error.value.address = addressError.value
		pending.value.address = addressPending.value
		if (address.value) {
			address.value.isMain = true
		}

		return {
			error: addressError,
			pending: addressPending,
			refresh
		}
	}

	return {
		addresses,
		address,
		pending,
		error,
		fetchAddresses,
		fetchUserAddresses,
		fetchAddress,
		createAddress,
		updateAddress,
		deleteAddress,
		setMainAddress
	}
})
