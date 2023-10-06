import { defineNuxtModule } from '@nuxt/kit'
import { getEnv, version } from '../config/env'

export interface BuildInfo {
	version: string
	commit: string
	shortCommit: string
	time: number
	branch: string
	env: 'preview' | 'canary' | 'dev' | 'release'
}

export default defineNuxtModule({
	meta: {
		name: 'build-env'
	},
	async setup(_options, nuxt) {
		const { env, commit, shortCommit, branch } = await getEnv()
		const buildInfo: BuildInfo = {
			version,
			time: +Date.now(),
			commit,
			shortCommit,
			branch,
			env
		}

		nuxt.options.appConfig = nuxt.options.appConfig || {}
		nuxt.options.appConfig.env = env
		nuxt.options.appConfig.buildInfo = buildInfo

		nuxt.options.nitro.virtual = nuxt.options.nitro.virtual || {}
		nuxt.options.nitro.virtual['#build-info'] = `export const env = ${JSON.stringify(
			env
		)}`
	}
})
