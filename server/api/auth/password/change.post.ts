import type { H3Event } from 'h3'
import { z } from 'zod'

import type { PasswordChangeBody, PasswordChangeResponse } from '~/types/auth'

export const ZodPasswordChangeResponse = z.object({
	detail: z.string()
}) satisfies z.ZodType<PasswordChangeResponse>

export const ZodPasswordChangeBody = z.object({
	newPassword1: z.string(),
	newPassword2: z.string()
}) satisfies z.ZodType<PasswordChangeBody>

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const session = await requireUserSession(event)
	try {
		const body = await readValidatedBody(event, ZodPasswordChangeBody.parse)
		const response = await $fetch(`${config.public.apiBaseUrl}/auth/password/change`, {
			method: 'POST',
			body,
			headers: {
				Authorization: `Bearer ${session?.token}`
			}
		})
		return await parseDataAs(response, ZodPasswordChangeResponse)
	} catch (error) {
		await handleError(error)
	}
})
