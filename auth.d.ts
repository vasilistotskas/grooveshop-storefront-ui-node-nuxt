import type { UserAccount } from '~/types/user/account'

declare module '#auth-utils' {
  interface User extends UserAccount {
  }

  interface UserSession {
    user?: User | null
  }
}

export {}
