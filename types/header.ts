import { z } from 'zod'

export const ZodDefaultHeaders = z.object({
	host: z.union([z.string(), z.undefined()]),
	connection: z.union([z.string(), z.undefined()]),
	pragma: z.union([z.string(), z.undefined()]),
	accept: z.union([z.string(), z.undefined()]),
	referer: z.union([z.string(), z.undefined()]),
	cookie: z.union([z.string(), z.undefined()]),
	'cache-control': z.union([z.string(), z.undefined()]),
	'sec-ch-ua': z.union([z.string(), z.undefined()]),
	'sec-ch-ua-mobile': z.union([z.string(), z.undefined()]),
	'user-agent': z.union([z.string(), z.undefined()]),
	'sec-ch-ua-platform': z.union([z.string(), z.undefined()]),
	'sec-fetch-site': z.union([z.string(), z.undefined()]),
	'sec-fetch-mode': z.union([z.string(), z.undefined()]),
	'sec-fetch-dest': z.union([z.string(), z.undefined()]),
	'accept-encoding': z.union([z.string(), z.undefined()]),
	'accept-language': z.union([z.string(), z.undefined()]),
	'x-forwarded-for': z.union([z.string(), z.undefined()]),
	'x-forwarded-port': z.union([z.string(), z.undefined()]),
	'x-forwarded-proto': z.union([z.string(), z.undefined()]),
	'x-nitro-prerender': z.union([z.string(), z.undefined()])
})

export const ZodHeaders = z.union([
	z.undefined(),
	z.record(z.string()),
	z.array(z.tuple([z.string(), z.string()])),
	ZodDefaultHeaders
])
