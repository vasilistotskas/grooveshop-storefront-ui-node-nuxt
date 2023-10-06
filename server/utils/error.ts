import { useLogger } from '@nuxt/kit'
import { createError, H3Error, H3Event, sendRedirect } from 'h3'
import { ZodError } from 'zod'
import { withQuery } from 'ufo'
import { FetchError } from 'ofetch'

type ErrorWithMessage = {
	message: string
}

export const reportError = ({ message }: { message: string }) => {
	const logger = useLogger('error')
	logger.error(message)
}

export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
	return (
		typeof error === 'object' &&
		error !== null &&
		'message' in error &&
		typeof (error as Record<string, unknown>).message === 'string'
	)
}

export function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
	if (isErrorWithMessage(maybeError)) return maybeError

	try {
		return new Error(JSON.stringify(maybeError))
	} catch {
		// fallback in case there's an error stringifying the maybeError
		// like with circular references for example.
		return new Error(String(maybeError))
	}
}

export function getErrorMessage(error: unknown) {
	return toErrorWithMessage(error).message
}

export async function handleError(
	error: unknown,
	redirect?: { event: H3Event; url: string }
) {
	const h3Error = new H3Error('server-error')
	h3Error.statusCode = 500
	reportError(toErrorWithMessage(error))

	if (redirect) {
		await sendRedirect(
			redirect.event,
			withQuery(redirect.url, { error: h3Error.message })
		)
		return
	}

	if (error) {
		if (error instanceof ZodError) {
			h3Error.message = error.issues[0].path + ' | ' + error.issues[0].message
			h3Error.statusCode = 400
		} else if (isErrorWithMessage(error) && error.message === 'unauthorized') {
			h3Error.message = 'unauthorized'
			h3Error.statusCode = 401
		} else if (isErrorWithMessage(error)) {
			h3Error.message = error.message
			h3Error.statusCode = 400
		}
	}

	if (error instanceof FetchError) {
		throw createError({
			statusCode: error?.statusCode,
			statusMessage: error?.statusMessage,
			data: error?.data,
			message: error?.message
		})
	}

	if (error instanceof H3Error) {
		throw createError({
			statusCode: error?.statusCode,
			statusMessage: error?.statusMessage,
			data: error?.data,
			message: error?.message
		})
	}

	throw createError(h3Error)
}
