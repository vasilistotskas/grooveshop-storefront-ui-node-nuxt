import { IFetchError } from 'ofetch'
import { Session } from '~/types/auth/session'

interface ErrorRecord {
	isAuthenticated: IFetchError | null
}

interface PendingRecord {
	isAuthenticated: boolean
}

const errorsFactory = (): ErrorRecord => ({
	isAuthenticated: null
})

const pendingFactory = (): PendingRecord => ({
	isAuthenticated: false
})

export interface AuthState {
	isAuthenticated: boolean
	pending: PendingRecord
	error: ErrorRecord
}
export const useAuthStore = defineStore({
	id: 'auth',
	state: (): AuthState => ({
		isAuthenticated: false,
		pending: pendingFactory(),
		error: errorsFactory()
	}),
	actions: {
		async fetchAuth() {
			try {
				const {
					data: auth,
					error,
					pending
				} = await useFetch<Session>(`/api/auth`, {
					method: 'get'
				})
				this.isAuthenticated = auth.value?.isAuthenticated || false
				this.error.isAuthenticated = error.value
				this.pending.isAuthenticated = pending.value
			} catch (error) {
				this.error.isAuthenticated = error as IFetchError
			}
		}
	}
})
