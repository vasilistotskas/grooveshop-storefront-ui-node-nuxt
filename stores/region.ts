import type { IFetchError } from 'ofetch'
import type { Region, RegionsQuery } from '~/types/region'
import type { Pagination } from '~/types/pagination'

interface ErrorRecord {
	regions: IFetchError | null
	region: IFetchError | null
}

interface PendingRecord {
	regions: boolean
	region: boolean
}

const errorsFactory = (): ErrorRecord => ({
	regions: null,
	region: null
})

const pendingFactory = (): PendingRecord => ({
	regions: false,
	region: false
})

export const useRegionStore = defineStore('region', () => {
	const regions = ref<Pagination<Region> | null>(null)
	const region = ref<Region | null>(null)
	const pending = ref<PendingRecord>(pendingFactory())
	const error = ref<ErrorRecord>(errorsFactory())

	async function fetchRegions({ alpha2 }: RegionsQuery) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: regionError,
			pending: regionPending,
			refresh
		} = await useFetch<Pagination<Region>>(`/api/regions`, {
			method: 'get',
			params: {
				alpha2
			}
		})
		regions.value = data.value
		error.value.regions = regionError.value
		pending.value.regions = regionPending.value

		return {
			data,
			error: regionError,
			pending: regionPending,
			refresh
		}
	}

	return {
		regions,
		region,
		pending,
		error,
		fetchRegions
	}
})
