import type { IFetchError } from 'ofetch'
import type { Pagination } from '~/types/pagination/pagination'
import type { PayWay, PayWayQuery } from '~/types/pay-way/pay-way'

interface ErrorRecord {
	payWays: IFetchError | null
	payWay: IFetchError | null
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

export const usePayWayStore = defineStore('payWay', () => {
	const payWays = ref<Pagination<PayWay> | null>(null)
	const payWay = ref<PayWay | null>(null)
	const pending = ref<PendingRecord>(pendingFactory())
	const error = ref<ErrorRecord>(errorsFactory())

	const getActivePayWays = computed(() => {
		return payWays.value?.results?.filter((payWay) => payWay.active) ?? null
	})

	const getSelectedPayWayId = computed(() => {
		return payWay.value?.id ?? null
	})

	async function fetchPayWays(params?: PayWayQuery) {
		const {
			data,
			error: payWayError,
			pending: payWayPending,
			refresh
		} = await useFetch<Pagination<PayWay>>(`/api/pay-way`, {
			method: 'get',
			params
		})
		payWays.value = data.value
		error.value.payWays = payWayError.value
		pending.value.payWays = payWayPending.value

		return {
			data,
			error: payWayError,
			pending: payWayPending,
			refresh
		}
	}

	async function fetchPayWay(id: string) {
		const {
			data,
			error: payWayError,
			pending: payWayPending,
			refresh
		} = await useFetch<PayWay>(`/api/pay-way/${id}`, {
			method: 'get'
		})
		payWay.value = data.value
		error.value.payWay = payWayError.value
		pending.value.payWay = payWayPending.value

		return {
			data,
			error: payWayError,
			pending: payWayPending,
			refresh
		}
	}

	return {
		payWays,
		payWay,
		pending,
		error,
		getActivePayWays,
		getSelectedPayWayId,
		fetchPayWays,
		fetchPayWay
	}
})
