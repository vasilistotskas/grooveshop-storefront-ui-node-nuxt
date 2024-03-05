import path from 'path'

import { describe, expect, it, vi } from 'vitest'

import * as cacheModule from '~/tools/translator/src/cache'
import * as helpersModule from '~/tools/translator/src/helpers'
import { translateBundle } from '~/tools/translator/src/translator'

vi.mock('translate', () => ({
	default: vi.fn((text) => `translated-${text}`)
}))
vi.mock('~/tools/translator/src/helpers')
vi.mock('~/tools/translator/src/cache')

describe('translator tests', () => {
	const testDir = path.join('tests', 'data', 'locales')

	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(helpersModule.getISO6391Code).mockReturnValue('en')
		vi.mocked(helpersModule.retry).mockImplementation(async (func) => await func())
		vi.mocked(helpersModule.validateDynamicKeys).mockReturnValue(true)
		vi.mocked(cacheModule.getCacheKeyVal).mockReturnValue(undefined)
		vi.mocked(cacheModule.saveCacheKeyVal).mockImplementation(() => {})
	})

	it('translates simple key-value pairs correctly', async () => {
		const inputBundle = { key1: 'value1', key2: 'value2' }
		const locale = { path: path.join(testDir, 'en-US.yml'), lang: 'en-US', dir: testDir }
		const translatedBundle = await translateBundle(inputBundle, locale)
		expect(translatedBundle).toEqual({
			key1: 'translated-value1',
			key2: 'translated-value2'
		})
	})
	it('translate should return a correctly translated object', async () => {
		vi.mock('translate', () => ({
			default: vi.fn().mockImplementation((text) => `translated-${text}`)
		}))

		const testFile = { hello: 'Hello' }
		const testLocale = {
			path: 'tests/data/locales/el-GR.yml',
			lang: 'el-GR',
			dir: 'tests/data/locales'
		}

		const expectedOutput = { hello: 'translated-Hello'.toLowerCase() }
		const translatedFile = await translateBundle(testFile, testLocale)

		expect(translatedFile).toEqual(expectedOutput)
	})
	it('handles translation with dynamic keys correctly', async () => {
		const inputBundle = { greeting: 'Hello, %{name}' }
		const locale = { path: path.join(testDir, 'en-US.yml'), lang: 'en-US', dir: testDir }
		const translatedBundle = await translateBundle(inputBundle, locale)
		expect(translatedBundle).toEqual({ greeting: 'translated-hello, %{name}' })
	})
	it('translates nested objects correctly', async () => {
		const inputBundle = { section: { key: 'value' } }
		const locale = { path: path.join(testDir, 'en-US.yml'), lang: 'en-US', dir: testDir }
		const translatedBundle = await translateBundle(inputBundle, locale)

		expect(translatedBundle).toEqual({ section: { key: 'translated-value' } })
	})
	it('uses cached translation if available', async () => {
		const cachedTranslation = 'cached-translation'
		vi.mocked(cacheModule.getCacheKeyVal).mockReturnValueOnce(cachedTranslation)

		const inputBundle = { key: 'value' }
		const locale = { path: path.join(testDir, 'en-US.yml'), lang: 'en-US', dir: testDir }
		const translatedBundle = await translateBundle(inputBundle, locale)

		expect(translatedBundle).toEqual({ key: cachedTranslation })
	})
})
