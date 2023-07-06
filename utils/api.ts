import { QueryObject } from 'ufo'

export function buildFullUrl(url: string, query: QueryObject): string {
	if (Object.keys(query).length > 0) {
		url += '?'
		Object.entries(query).forEach(([key, value]) => {
			url += `${key}=${value}&`
		})
	}
	return url
}
