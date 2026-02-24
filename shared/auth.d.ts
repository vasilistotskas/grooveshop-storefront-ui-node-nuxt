declare module '#auth-utils' {
  interface User extends UserDetails {
    _dummy?: string
  }

  interface UserSession {
    data?: Authenticated | null
    meta?: AuthenticationMeta | null
    user?: User | null
  }

  interface SecureSessionData {
    sessionToken?: string | null
    accessToken?: string | null
    oauthParams?: {
      provider: string
      access_token?: string
      id_token?: string
      client_id?: string
      process?: string
    }
  }

  export interface UserSessionRequired extends UserSession {
    user: User
  }

  export interface UserSessionComposable {
    loggedIn: ComputedRef<boolean>
    user: ComputedRef<User | null>
    sessionToken: ComputedRef<string | null>
    accessToken: ComputedRef<string | null>
    session: Ref<UserSession>
    fetch: () => Promise<void>
    clear: () => Promise<void>
  }
}

export {}
