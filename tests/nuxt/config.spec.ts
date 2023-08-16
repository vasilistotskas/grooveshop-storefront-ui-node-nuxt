import { expect, it } from 'vitest'

it('should return the runtimeConfig from nuxt.config', () => {
	const config = useRuntimeConfig()
	expect(config).toBeTypeOf('object')
	expect(config?.public?.apiBaseUrl).toEqual('http://127.0.0.1:8010/api/v1')
})
