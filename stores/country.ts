import type { IFetchError } from 'ofetch'
import type { CountriesQuery, Country } from '~/types/country'
import type { Pagination } from '~/types/pagination'

interface ErrorRecord {
	countries: IFetchError | null
	country: IFetchError | null
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

export const useCountryStore = defineStore('country', () => {
	const countries = ref<Pagination<Country> | null>(null)
	const country = ref<Country | null>(null)
	const pending = ref<PendingRecord>(pendingFactory())
	const error = ref<ErrorRecord>(errorsFactory())

	async function fetchCountries(params?: CountriesQuery) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: countryError,
			pending: countryPending,
			refresh
		} = await useFetch<Pagination<Country>>(`/api/countries`, {
			method: 'get',
			params
		})
		countries.value = data.value
		error.value.countries = countryError.value
		pending.value.countries = countryPending.value

		return {
			data,
			error: countryError,
			pending: countryPending,
			refresh
		}
	}

	async function fetchCountry(id: string) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: countryError,
			pending: countryPending,
			refresh
		} = await useFetch<Country>(`/api/countries/${id}`, {
			method: 'get'
		})
		country.value = data.value
		error.value.country = countryError.value
		pending.value.country = countryPending.value

		return {
			data,
			error: countryError,
			pending: countryPending,
			refresh
		}
	}

	return {
		countries,
		country,
		pending,
		error,
		fetchCountries,
		fetchCountry
	}
})
