import type { UserAccount } from '~/types/user/account'
import type { Authenticated, AuthenticationMeta } from '~/types/all-auth'

declare module '#auth-utils' {
  interface User extends UserAccount {
  }

  interface UserSession {
    data?: Authenticated | null
    meta?: AuthenticationMeta | null
    user?: User | null
    token?: string | null
    tokenExpiration?: string | null
    refreshToken?: string | null
    refreshTokenExpiration?: string | null
    totpActive?: boolean | null
    totpAuthenticated?: boolean | null
    loggedInAt?: Date | null
    rememberMe?: boolean | null
  }
}

export {}
