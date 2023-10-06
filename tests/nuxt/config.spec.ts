import { expect, it } from 'vitest'

it('should return the runtimeConfig from nuxt.config', () => {
	const config = useRuntimeConfig()
	expect(config).toBeTypeOf('object')
	expect(config?.public?.apiBaseUrl).toEqual('http://localhost:8000/api/v1')
})
