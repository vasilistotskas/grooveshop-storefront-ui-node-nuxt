import { isCI } from 'std-env'

export default defineAppConfig({
	ui: {
		primary: 'blue',
		gray: 'cool'
	},
	storage: {
		driver: process.env.NUXT_STORAGE_DRIVER ?? (isCI ? 'cloudflare' : 'fs')
	}
})
