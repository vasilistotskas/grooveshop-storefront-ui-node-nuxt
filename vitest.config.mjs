import { defineVitestConfig } from 'nuxt-vitest/config'
import { fileURLToPath } from 'node:url'

export default defineVitestConfig({
	test: {
		dir: 'tests',
		testTimeout: 10000,
		setupFiles: ['tests/setup.ts'],
		coverage: {
			providers: 'v8',
			reportsDirectory: 'coverage'
		},
		environmentOptions: {
			nuxt: {
				rootDir: fileURLToPath(new URL('./', import.meta.url))
			}
		}
	},
	define: {
		'process.test': 'true'
	}
})
