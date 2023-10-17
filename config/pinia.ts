import { ModuleOptions } from '@pinia/nuxt'

export const pinia = {
	storesDirs: ['/stores/**']
} satisfies Partial<ModuleOptions>
