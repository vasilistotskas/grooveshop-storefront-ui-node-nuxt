// Session
export type Session = {
	isSessionAuthenticated: boolean
	CSRFToken: string
	referer?: string | null | undefined
	userAgent: string | null
	sessionid: string | null
	role: string
	lastActivity?: string | null | undefined
}

export type SessionRefreshBody = {}

export type SessionRefreshResponse = {
	success: boolean
}

export type SessionRevokeAllResponse = {
	success: boolean
}

export type SessionRevokeResponse = {
	success: boolean
}

// User
export type User = {
	id: number
	email: string
}

export enum UserRole {
	SUPERUSER = 'admin',
	STAFF = 'staff',
	USER = 'user',
	GUEST = 'guest'
}

// Login
export type LoginBody = {
	email: string
	password: string
}
export type LoginResponse = {
	access: string
	refresh?: string | null | undefined
	user: {
		id: number
		email: string
	}
}

// Logout
export type LogoutBody = {}

export type LogoutResponse = {
	detail: string
}

// Password
export type PasswordResetBody = {
	email: string
}

export type PasswordResetConfirmBody = {
	newPassword1: string
	newPassword2: string
	uid: string
	token: string
}

export type PasswordChangeBody = {
	newPassword1: string
	newPassword2: string
}

export type PasswordChangeResponse = {
	detail: string
}

export type PasswordResetResponse = {
	detail: string
}

export type PasswordResetConfirmResponse = {
	detail: string
}

// Registration
export type RegistrationBody = {
	email: string
	password1: string
	password2: string
}

export type RegistrationVerifyEmailBody = {
	key: string
}

export type RegistrationResendEmailBody = {
	email: string
}

export type RegistrationResponse = {
	detail?: string | null | undefined
	access?: string | null | undefined
	refresh?: string | null | undefined
	user?:
		| {
				id: number
				email: string
		  }
		| null
		| undefined
}

export type RegistrationResendEmailResponse = {
	detail: string
}

export type RegistrationVerifyEmailResponse = {
	detail: string
}

export type ProviderSettings = {
	clientId: string
	clientSecret: string
	scopes: string
	authorizeUrl: string
	tokenUrl: string
	userUrl: string
}

export type Provider = Record<string, ProviderSettings>

export type ProviderParams = {
	provider: string
}

export type ProviderLoginBody = {
	accessToken?: string | null | undefined
	code?: string | null | undefined
	idToken?: string | null | undefined
}

export type ProviderConnectBody = {
	accessToken?: string | null | undefined
	code?: string | null | undefined
	idToken?: string | null | undefined
}

export type ProviderCallbackBody = {
	code: string
	state?: string | null | undefined
}

export type ProviderCallbackParams = {
	provider: string
}

export type ProviderLoginResponse = {
	access: string
	refresh?: string | null | undefined
	user: {
		id: number
		email: string
	}
	accessExpiration?: string | null | undefined
	refreshExpiration?: string | null | undefined
}

export type ProviderConnectResponse = {
	access: string
	refresh: string | null
	user: {
		id: number
		email: string
	}
}

// Social Accounts
export type SocialAccount = {
	id: number
	provider: Provider
	uid: string
	lastLogin: string
	dateJoined: string
}

export type SocialAccountDisconnectBody = {
	accessToken?: string | null | undefined
	code?: string | null | undefined
	idToken?: string | null | undefined
}

export type SocialAccountResponse = {
	id: number
	provider: string
	uid: string
	lastLogin: string
	dateJoined: string
}

export type SocialAccountDisconnectResponse = {
	detail: string
}

// Token
export type TokenVerifyBody = {
	token: string
}

export type TokenRefreshBody = {
	refresh: string
}

export type TokenVerifyResponse = {}

export type TokenRefreshResponse = {
	access: string
	accessExpiration: string
}

// Mail
export type MailMessage = {
	to: string
	subject: string
	html: string
}

interface MailCustomProvider {
	name: 'custom'
	url: string
	authorization: string
}

interface MailSendgridProvider {
	name: 'sendgrid'
	apiKey: string
}

interface MailResendProvider {
	name: 'resend'
	apiKey: string
}

// Actions
export type IsUserRegisteredBody = {
	email: string
}

export type IsUserRegisteredResponse = {
	registered: boolean
}

// MFA
export type MfaTotpAuthenticateBody = {
	code: string
}

export type MfaTotpActiveResponse = {
	active: boolean
}

export type MfaTotpAuthenticateResponse = {
	success: boolean
}

export type MfaTotpActivatePostBody = {
	code: string
}

export type MfaTotpActivatePostResponse = {
	success: boolean
}

export type MfaTotpActivateGetResponse = {
	totpSvg: string
	secret: string
}

export type MfaTotpDeactivateBody = {}

export type MfaTotpDeactivateResponse = {
	success: boolean
}

export type MfaRecoveryCodesGenerateBody = {}

export type MfaRecoveryCodesGenerateResponse = {
	codes: string[]
}

export type MfaRecoveryCodesListResponse = {
	unusedCodes: string[]
	totalCount: number
}

export interface AuthCookieNames {
	sessionCookieName: string
	csrftokenCookieName: string
	accessTokenCookieName: string
	refreshTokenCookieName: string
	totpAuthenticatedCookieName: string
	totpActiveCookieName: string
}

export const defaultAuthCookieNames: AuthCookieNames = {
	sessionCookieName: 'sessionid',
	csrftokenCookieName: 'csrftoken',
	accessTokenCookieName: 'jwt_auth',
	refreshTokenCookieName: 'jwt_refresh_auth',
	totpAuthenticatedCookieName: 'totp_authenticated',
	totpActiveCookieName: 'totp_active'
}
