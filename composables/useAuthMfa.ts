import {
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
	const { _totpAuthenticated, _totpActive } = useAuthSession()
	const config = useRuntimeConfig()
	const publicConfig = config.public

	async function totpAuthenticate(body: MfaTotpAuthenticateBody) {
		const { data, pending, error, refresh } = await useFetch<MfaTotpAuthenticateResponse>(
			'/api/auth/mfa/totp/authenticate',
			{
				method: 'POST',
				body
			}
		)
		if (!error.value && data.value) {
			_totpAuthenticated.set('true')
		}

		return { data, pending, error, refresh }
	}

	async function totpDeactivate(body: MfaTotpDeactivateBody) {
		const route = useRoute()
		const { data, pending, error, refresh } = await useFetch<MfaTotpDeactivateResponse>(
			'/api/auth/mfa/totp/deactivate',
			{
				method: 'POST',
				body
			}
		)
		if (!error.value && data.value) {
			const returnToPath = route.query.redirect?.toString()
			const redirectTo = returnToPath || publicConfig.auth.redirect.account

			setTimeout(async () => {
				_totpActive.set('false')
				await navigateTo(redirectTo)
			}, 100)
		}

		return { data, pending, error, refresh }
	}

	async function totpActivateGet() {
		const { data, pending, error, refresh } = await useFetch<MfaTotpActivateGetResponse>(
			'/api/auth/mfa/totp/activate',
			{
				method: 'GET'
			}
		)

		return { data, pending, error, refresh }
	}

	async function totpActivatePost(body: MfaTotpActivatePostBody) {
		const route = useRoute()
		const { data, pending, error, refresh } = await useFetch<MfaTotpActivatePostResponse>(
			'/api/auth/mfa/totp/activate',
			{
				method: 'POST',
				body
			}
		)

		if (!error.value && data.value?.success) {
			const returnToPath = route.query.redirect?.toString()
			const redirectTo = returnToPath || publicConfig.auth.redirect.mfa.index

			setTimeout(async () => {
				_totpActive.set('true')
				await navigateTo(redirectTo)
			}, 100)
		}

		return { data, pending, error, refresh }
	}

	async function totpActive() {
		const { data, pending, error, refresh } = await useFetch<MfaTotpActiveResponse>(
			'/api/auth/mfa/totp/active',
			{
				method: 'GET'
			}
		)

		if (!error.value && data.value?.active) {
			_totpActive.set('true')
		}

		return { data, pending, error, refresh }
	}

	async function recoveryCodesGenerate(body: MfaRecoveryCodesGenerateBody) {
		const { data, pending, error, refresh } =
			await useFetch<MfaRecoveryCodesGenerateResponse>(
				'/api/auth/mfa/recovery-codes/generate',
				{
					method: 'POST',
					body
				}
			)

		return { data, pending, error, refresh }
	}

	async function recoveryCodesList() {
		const { data, pending, error, refresh } =
			await useFetch<MfaRecoveryCodesListResponse>('/api/auth/mfa/recovery-codes/list', {
				method: 'GET'
			})

		return { data, pending, error, refresh }
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
