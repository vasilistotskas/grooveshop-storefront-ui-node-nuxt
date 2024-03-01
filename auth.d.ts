import type { UserAccount } from '~/types/user/account'

declare module '#auth-utils' {
	interface User extends UserAccount {}

	interface UserSession {
		extended?: any
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
