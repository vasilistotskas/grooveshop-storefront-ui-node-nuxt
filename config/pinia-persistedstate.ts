import type { ModuleOptions } from '@pinia-plugin-persistedstate/nuxt'

export const piniaPersistedstate = {
	storage: 'localStorage',
	debug: process.env.NODE_ENV !== 'production'
} satisfies Partial<ModuleOptions>
