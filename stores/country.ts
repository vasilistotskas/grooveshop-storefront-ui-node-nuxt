import { FetchError } from 'ofetch'
import { CountriesQuery, Country } from '~/zod/country/country'
import { Pagination } from '~/zod/pagination/pagination'

interface ErrorRecord {
	countries: FetchError | null
	country: FetchError | null
}

interface PendingRecord {
	countries: boolean
	country: boolean
}

const errorsFactory = (): ErrorRecord => ({
	countries: null,
	country: null
})

const pendingFactory = (): PendingRecord => ({
	countries: false,
	country: false
})

export interface CountryState {
	countries: Pagination<Country> | null
	country: Country | null
	pending: PendingRecord
	error: ErrorRecord
}

export const useCountryStore = defineStore({
	id: 'country',
	state: (): CountryState => ({
		countries: null,
		country: null,
		pending: pendingFactory(),
		error: errorsFactory()
	}),
	actions: {
		async fetchCountries(params?: CountriesQuery) {
			try {
				const {
					data: countries,
					error,
					pending
				} = await useFetch(`/api/countries`, {
					method: 'get',
					params
				})
				this.countries = countries.value
				this.error.countries = error.value
				this.pending.countries = pending.value
			} catch (error) {
				this.error.countries = error as FetchError
			}
		}
	}
})
