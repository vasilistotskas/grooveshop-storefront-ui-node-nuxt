export type AllAuthError = {
  data: BadResponse | NotAuthenticatedResponse | InvalidSessionResponse | ForbiddenResponse | NotFoundResponse | ConflictResponse
}

export type AllAuthClientError = {
  data: {
    data: BadResponse | NotAuthenticatedResponse | InvalidSessionResponse | ForbiddenResponse | NotFoundResponse | ConflictResponse
  }
}
