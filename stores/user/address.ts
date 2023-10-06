import { IFetchError } from 'ofetch'
import {
	Address,
	AddressCreateBody,
	AddressPutBody,
	AddressQuery
} from '~/types/user/address'
import { Pagination } from '~/types/pagination/pagination'

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
		const {
			data,
			error: addressesError,
			pending: addressesPending,
			refresh
		} = await useFetch<Pagination<Address>>(`/api/user-address`, {
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

	async function fetchAddress(id: string | number) {
		const {
			data,
			error: addressError,
			pending: addressPending,
			refresh
		} = await useFetch<Address>(`/api/user-address/${id}`, {
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
		const {
			data,
			error: addressError,
			pending: addressPending,
			refresh
		} = await useFetch<Address>(`/api/user-address`, {
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
		const {
			data,
			error: addressError,
			pending: addressPending,
			refresh
		} = await useFetch<Address>(`/api/user-address/${id}`, {
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
		const {
			error: addressError,
			pending: addressPending,
			refresh
		} = await useFetch(`/api/user-address/${id}`, {
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
		const {
			error: addressError,
			pending: addressPending,
			refresh
		} = await useFetch(`/api/user-address/${id}/set-main`, {
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
		fetchAddress,
		createAddress,
		updateAddress,
		deleteAddress,
		setMainAddress
	}
})
