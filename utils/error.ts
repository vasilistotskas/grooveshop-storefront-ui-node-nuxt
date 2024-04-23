import type { ErrorWithMessage } from '~/types'

export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object'
    && error !== null
    && 'message' in error
    && typeof (error as Record<string, unknown>).message === 'string'
  )
}
