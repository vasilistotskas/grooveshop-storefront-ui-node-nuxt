import { H3Event } from 'h3'
import { NitroFetchOptions, NitroFetchRequest } from 'nitropack'
import { defu } from 'defu'

export function $api<T>(
	request: NitroFetchRequest,
	event: H3Event,
	options: NitroFetchOptions<NitroFetchRequest> = {}
): Promise<T> {
	const jwtAuth = getCookie(event, 'jwt-auth') || ''

	const method = options.method || event.method

	options.credentials = options.credentials || 'omit'
	options.method = method

	if (jwtAuth) {
		options.headers = defu(
			{
				Authorization: 'Bearer ' + jwtAuth
			},
			options.headers
		)
	}

	return $fetch<T>(request, options)
}
