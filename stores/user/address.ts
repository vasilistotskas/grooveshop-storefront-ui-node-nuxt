import { IFetchError } from 'ofetch'
import {
	Address,
	AddressCreateRequest,
	AddressPutRequest,
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

export interface AddressState {
	addresses: Pagination<Address> | null
	address: Address | null
	pending: PendingRecord
	error: ErrorRecord
}

export const useUserAddressStore = defineStore({
	id: 'user-address',
	state: (): AddressState => ({
		addresses: null,
		address: null,
		pending: pendingFactory(),
		error: errorsFactory()
	}),
	getters: {
		getAddressById: (state) => (id: number) => {
			return state.addresses?.results?.find((address) => address.id === id)
		}
	},
	actions: {
		async fetchAddresses({ page, ordering, userId }: AddressQuery): Promise<void> {
			try {
				const {
					data: addresses,
					error,
					pending
				} = await useFetch(`/api/user-address`, {
					method: 'get',
					params: {
						page,
						ordering,
						userId
					}
				})
				this.addresses = addresses.value
				this.error.addresses = error.value
				this.pending.addresses = pending.value
			} catch (error) {
				this.error.addresses = error as IFetchError
			}
		},
		async fetchAddress(id: string | number): Promise<void> {
			try {
				const {
					data: address,
					error,
					pending
				} = await useFetch(`/api/user-address/${id}`, {
					method: 'get'
				})
				this.address = address.value
				this.error.address = error.value
				this.pending.address = pending.value
			} catch (error) {
				this.error.address = error as IFetchError
			}
		},
		async createAddress(body: AddressCreateRequest): Promise<void> {
			try {
				const {
					data: address,
					error,
					pending
				} = await useFetch(`/api/user-address`, {
					method: 'post',
					body
				})
				this.address = address.value
				this.error.address = error.value
				this.pending.address = pending.value
			} catch (error) {
				this.error.address = error as IFetchError
			}
		},
		async updateAddress(id: string | number, body: AddressPutRequest): Promise<void> {
			try {
				const {
					data: address,
					error,
					pending
				} = await useFetch(`/api/user-address/${id}`, {
					method: 'put',
					body
				})
				this.address = address.value
				this.error.address = error.value
				this.pending.address = pending.value
			} catch (error) {
				this.error.address = error as IFetchError
			}
		},
		async deleteAddress(id: string | number): Promise<void> {
			try {
				const { error, pending } = await useFetch(`/api/user-address/${id}`, {
					method: 'delete'
				})
				this.error.address = error.value
				this.pending.address = pending.value
				const index = this.addresses?.results?.findIndex(
					(address) => Number(address.id) === Number(id)
				)
				if (index !== undefined && index !== -1) {
					this.addresses?.results?.splice(index, 1)
				}
			} catch (error) {
				this.error.address = error as IFetchError
			}
		},
		async setMainAddress(id: string | number): Promise<void> {
			try {
				const { error, pending } = await useFetch(`/api/user-address/${id}/set-main`, {
					method: 'post'
				})
				this.error.address = error.value
				this.pending.address = pending.value
				if (this.address) {
					this.address.isMain = true
				}
			} catch (error) {
				this.error.address = error as IFetchError
			}
		}
	}
})
