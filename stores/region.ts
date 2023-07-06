import { FetchError } from 'ofetch'
import { Region, RegionsQuery } from '~/zod/region/region'
import { Pagination } from '~/zod/pagination/pagination'

interface ErrorRecord {
	regions: FetchError | null
	region: FetchError | null
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

export interface RegionState {
	regions: Pagination<Region> | null
	region: Region | null
	pending: PendingRecord
	error: ErrorRecord
}

export const useRegionStore = defineStore({
	id: 'region',
	state: (): RegionState => ({
		regions: null,
		region: null,
		pending: pendingFactory(),
		error: errorsFactory()
	}),
	actions: {
		async fetchRegions({ alpha2 }: RegionsQuery) {
			try {
				const {
					data: regions,
					error,
					pending
				} = await useFetch(`/api/regions`, {
					method: 'get',
					params: {
						alpha2
					}
				})
				this.regions = regions.value
				this.error.regions = error.value
				this.pending.regions = pending.value
			} catch (error) {
				this.error.regions = error as FetchError
			}
		}
	}
})
