declare module '#auth-utils' {
  interface User extends UserDetails {}

  interface UserSession {
    user?: User | null
    /** Post IDs for which this session has already incremented the view counter. */
    viewedPosts?: string[]
    /** The cart's UUID, sent to Django as `X-Cart-Id`: `server/utils/cartSession.ts`. */
    cartId?: string
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
