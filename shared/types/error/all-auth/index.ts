export type AllAuthError = {
  data: BadResponse | NotAuthenticatedResponse | InvalidSessionResponse | ForbiddenResponse | NotFoundResponse | ConflictResponse | TooManyRequestsResponse
}

export type AllAuthClientError = {
  data: {
    data: BadResponse | NotAuthenticatedResponse | InvalidSessionResponse | ForbiddenResponse | NotFoundResponse | ConflictResponse
  }
}
