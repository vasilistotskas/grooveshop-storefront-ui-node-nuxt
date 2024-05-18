import type { H3Event } from 'h3'
import { H3Error } from 'h3'
import { FetchError } from 'ofetch'
import { withQuery } from 'ufo'
import { ZodError } from 'zod'

type ErrorWithMessage = {
  message: string
}

export const reportError = ({ message }: { message: string }) => {
  console.error(message)
}

export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object'
    && error !== null
    && 'message' in error
    && typeof (error as Record<string, unknown>).message === 'string'
  )
}

export const isErrorWithSessionToken = (error: unknown): error is { data: { meta: { session_token: string } } } => {
  if (
    typeof error === 'object'
    && error !== null
    && 'data' in error
  ) {
    const data = (error as { data: unknown }).data
    if (
      typeof data === 'object'
      && data !== null
      && 'meta' in data
    ) {
      const meta = (data as { meta: unknown }).meta
      return (
        typeof meta === 'object'
        && meta !== null
        && 'session_token' in meta
        && typeof (meta as { session_token: unknown }).session_token === 'string'
      )
    }
  }
  return false
}

export function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError

  try {
    return new Error(JSON.stringify(maybeError))
  }
  catch {
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
  redirect?: { event: H3Event, url: string },
) {
  const h3Error = new H3Error('server-error')
  h3Error.statusCode = 500
  reportError(toErrorWithMessage(error))

  if (redirect) {
    await sendRedirect(
      redirect.event,
      withQuery(redirect.url, { error: h3Error.message }),
    )
    return
  }

  if (error) {
    if (error instanceof ZodError) {
      h3Error.message = error.issues[0].path + ' | ' + error.issues[0].message
      h3Error.statusCode = 400
      h3Error.cause = error.cause
      h3Error.name = error.name
      h3Error.stack = error.stack
    }
    else if (isErrorWithMessage(error) && error.message === 'unauthorized') {
      h3Error.message = 'unauthorized'
      h3Error.statusCode = 401
    }
    else if (isErrorWithMessage(error)) {
      h3Error.message = error.message
      h3Error.statusCode = 400
    }
  }

  if (error instanceof FetchError) {
    throw createError(error)
  }

  if (error instanceof H3Error) {
    throw createError(error)
  }

  throw createError(h3Error)
}
