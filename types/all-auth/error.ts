import type {
  BadResponse,
  ConflictResponse,
  ForbiddenResponse,
  InvalidSessionResponse,
  NotAuthenticatedResponse,
  NotFoundResponse,
} from '~/types/all-auth'

export type AllAuthError = {
  data: {
    data: BadResponse | NotAuthenticatedResponse | InvalidSessionResponse | ForbiddenResponse | NotFoundResponse | ConflictResponse
  }
}

export type AllAuthResponseError =
  BadResponse
  | NotAuthenticatedResponse
  | InvalidSessionResponse
  | ForbiddenResponse
  | NotFoundResponse
  | ConflictResponse
