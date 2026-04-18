declare module '#auth-utils' {
  interface User extends UserDetails {
    // Not yet in the auto-generated UserDetails; present in Django
    // serializer from 2026-04-18. Regenerate via `pnpm openapi-ts`
    // to drop this augmentation once the schema refreshes.
    languageCode?: string
  }

  interface UserSession {
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
