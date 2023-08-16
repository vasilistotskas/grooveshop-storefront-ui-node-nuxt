import { FetchError } from 'ofetch'
import { Pagination } from '~/types/pagination/pagination'
import { PayWay, PayWayQuery } from '~/types/pay-way/pay-way'

interface ErrorRecord {
	payWays: FetchError | null
	payWay: FetchError | null
}

interface PendingRecord {
	payWays: boolean
	payWay: boolean
}

const errorsFactory = (): ErrorRecord => ({
	payWays: null,
	payWay: null
})

const pendingFactory = (): PendingRecord => ({
	payWays: false,
	payWay: false
})

export interface PayWayState {
	payWays: Pagination<PayWay> | null
	payWay: PayWay | null
	pending: PendingRecord
	error: ErrorRecord
}

export const usePayWayStore = defineStore({
	id: 'payWay',
	state: (): PayWayState => ({
		payWays: null,
		payWay: null,
		pending: pendingFactory(),
		error: errorsFactory()
	}),
	getters: {
		getActivePayWays: (state): PayWay[] | null => {
			return state.payWays?.results?.filter((payWay) => payWay.active) ?? null
		}
	},
	actions: {
		async fetchPayWays(params?: PayWayQuery) {
			try {
				const {
					data: payWays,
					error,
					pending
				} = await useFetch(`/api/pay-way`, {
					method: 'get',
					params
				})
				this.payWays = payWays.value
				this.error.payWays = error.value
				this.pending.payWays = pending.value
			} catch (error) {
				this.error.payWays = error as FetchError
			}
		}
	}
})
