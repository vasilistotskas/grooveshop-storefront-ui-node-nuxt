export const vitest = {
	startOnBoot: true,
	logToConsole: true,
	vitestConfig: {
		setupFiles: ['./tests/setup'],
		environmentOptions: {
			nuxt: {
				mock: {
					indexedDb: true
				}
			}
		}
	}
}
