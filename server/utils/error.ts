import { useLogger } from '@nuxt/kit'
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

export async function handleError(error: unknown) {
	await reportError(toErrorWithMessage(error))
	if (error instanceof FetchError) {
		throw createError({
			statusCode: error?.statusCode,
			statusMessage: error?.statusMessage,
			data: error?.data,
			message: error?.message
		})
	}
	throw error
}
