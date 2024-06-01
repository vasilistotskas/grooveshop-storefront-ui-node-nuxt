import type { UserAccount } from '~/types/user/account'
import type { Authenticated, AuthenticationMeta } from '~/types/all-auth'

declare module '#auth-utils' {
  interface User extends UserAccount {
  }

  interface UserSession {
    data?: Authenticated | null
    meta?: AuthenticationMeta | null
    user?: User | null
    sessionToken?: string | null
    accessToken?: string | null
  }

  export interface UserSessionRequired extends UserSession {
    user: User
  }

  export interface UserSessionComposable {
    loggedIn: ComputedRef<boolean>
    user: ComputedRef<User | null>
    session: Ref<UserSession>
    fetch: () => Promise<void>
    clear: () => Promise<void>
  }
}

export {}
