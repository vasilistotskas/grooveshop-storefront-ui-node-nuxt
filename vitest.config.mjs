import { defineVitestConfig } from 'nuxt-vitest/config'
import { fileURLToPath } from 'node:url'

/** @type {import("nuxt-vitest/config")} */
const config = {
	test: {
		environment: 'nuxt',
		dir: 'tests',
		testTimeout: 10000,
		setupFiles: ['tests/setup.ts'],
		coverage: {
			providers: 'v8',
			reportsDirectory: 'coverage'
		},
		environmentOptions: {
			nuxt: {
				rootDir: fileURLToPath(new URL('./', import.meta.url)),
				domEnvironment: 'jsdom'
			}
		}
	},
	define: {
		'process.test': true
	}
}

export default defineVitestConfig(config)
