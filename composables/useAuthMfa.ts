import type {
	MfaRecoveryCodesGenerateBody,
	MfaRecoveryCodesGenerateResponse,
	MfaRecoveryCodesListResponse,
	MfaTotpActivateGetResponse,
	MfaTotpActivatePostBody,
	MfaTotpActivatePostResponse,
	MfaTotpActiveResponse,
	MfaTotpAuthenticateBody,
	MfaTotpAuthenticateResponse,
	MfaTotpDeactivateBody,
	MfaTotpDeactivateResponse
} from '~/types/auth'

export default function () {
	function totpActivateGet() {
		return useFetch<MfaTotpActivateGetResponse>('/api/auth/mfa/totp/activate', {
			method: 'GET'
		})
	}

	function totpActive() {
		return useFetch<MfaTotpActiveResponse>('/api/auth/mfa/totp/active', {
			method: 'GET'
		})
	}

	function recoveryCodesList() {
		return useFetch<MfaRecoveryCodesListResponse>('/api/auth/mfa/recovery-codes/list', {
			method: 'GET'
		})
	}

	function totpAuthenticate(body: MfaTotpAuthenticateBody) {
		return useFetch<MfaTotpAuthenticateResponse>('/api/auth/mfa/totp/authenticate', {
			method: 'POST',
			body
		})
	}

	function totpDeactivate(body: MfaTotpDeactivateBody) {
		return useFetch<MfaTotpDeactivateResponse>('/api/auth/mfa/totp/deactivate', {
			method: 'POST',
			body
		})
	}

	function totpActivatePost(body: MfaTotpActivatePostBody) {
		return useFetch<MfaTotpActivatePostResponse>('/api/auth/mfa/totp/activate', {
			method: 'POST',
			body
		})
	}

	function recoveryCodesGenerate(body: MfaRecoveryCodesGenerateBody) {
		return useFetch<MfaRecoveryCodesGenerateResponse>(
			'/api/auth/mfa/recovery-codes/generate',
			{
				method: 'POST',
				body
			}
		)
	}

	return {
		totpAuthenticate,
		totpDeactivate,
		totpActivateGet,
		totpActivatePost,
		totpActive,
		recoveryCodesGenerate,
		recoveryCodesList
	}
}
