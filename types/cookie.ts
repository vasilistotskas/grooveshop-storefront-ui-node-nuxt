import { z } from 'zod'

export const ZodDefaultCookies = z.object({
	ncc_c: z.union([z.string(), z.undefined()]),
	ncc_e: z.union([z.string(), z.undefined()]),
	i18n_redirected: z.union([z.string(), z.undefined()]),
	csrftoken: z.union([z.string(), z.undefined()]),
	sessionid: z.union([z.string(), z.undefined()])
})

export const ZodCookies = z.union([
	z.undefined(),
	z.record(z.string()),
	z.array(z.tuple([z.string(), z.string()])),
	ZodDefaultCookies
])
