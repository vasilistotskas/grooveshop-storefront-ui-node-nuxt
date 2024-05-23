import type { BadResponse, InvalidSessionResponse, NotAuthenticatedResponse } from '~/types/all-auth'

export type AllAuthError = {
  data: BadResponse | NotAuthenticatedResponse | InvalidSessionResponse
}

export type AllAuthResponseError = BadResponse | NotAuthenticatedResponse | InvalidSessionResponse
