import type { H3Event } from 'h3'

type ITheme = 'dark' | 'light'
type IPAPIResponse = {
	status: string
	country: string
	countryCode: string
	region: string
	regionName: string
	city: string
	zip: string
	lat: number
	lon: number
	timezone: string
	isp: string
	org: string
	as: string
	query: string
}

type ITimeZoneApiResponse = {
	abbreviation: string
	client_ip: string
	datetime: string
	day_of_week: number
	day_of_year: number
	dst: boolean
	dst_from: string
	dst_offset: number
	dst_until: string
	raw_offset: number
	timezone: string
	unixtime: number
	utc_datetime: string
	utc_offset: string
	week_number: number
}

export type RealTimeResponse = {
	ipApiResponse?: IPAPIResponse
	timeZoneApiResponse?: ITimeZoneApiResponse
	theme: ITheme
}

export default defineEventHandler(async (event: H3Event) => {
	const defaultTheme = (process.env.NUXT_PUBLIC_DEFAULT_THEME || 'light') as ITheme
	try {
		const ipApiResponse = await $fetch<IPAPIResponse>('http://ip-api.com/json', {
			method: 'GET'
		})

		const timezone = ipApiResponse.timezone
		const timeZoneApiResponse = await $fetch<ITimeZoneApiResponse>(
			`http://worldtimeapi.org/api/timezone/${timezone}`,
			{
				method: 'GET'
			}
		)

		const currentTime = new Date(timeZoneApiResponse.datetime)
		const isNight = currentTime.getHours() >= 18 || currentTime.getHours() <= 6

		return {
			ipApiResponse,
			timeZoneApiResponse,
			theme: isNight ? 'dark' : 'light'
		}
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Error fetching IP location/time data:', error)
		return {
			theme: defaultTheme
		}
	}
})
