import type * as z from 'zod'

export type AllAuthResponse = z.infer<typeof ZodAllAuthResponse>
export type AllAuthResponseError =
  BadResponse
  | NotAuthenticatedResponse
  | InvalidSessionResponse
  | ForbiddenResponse
  | NotFoundResponse
  | ConflictResponse
