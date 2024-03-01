import * as path from 'path'

import { describe, expect, it, vi } from 'vitest'

import { main } from '~/tools/translator/src/app'
import * as configModule from '~/tools/translator/src/config'
import * as fileOpsModule from '~/tools/translator/src/file-ops'
import * as translatorModule from '~/tools/translator/src/translator'
import type { Config } from '~/tools/translator/src/types'

describe('app.ts tests', () => {
	const testDir = path.join('tests', 'data', 'locales')

	beforeEach(() => {
		vi.mock('fs', async (importOriginal) => {
			const originalModule = await importOriginal<typeof import('fs')>()
			const mockConfig = {
				localePath: './tests/data/locales',
				sourceFileName: 'en-US',
				translate: {
					engine: 'google',
					bundleDelay: 0,
					bundleMaxRetries: 3
				}
			} as Config<any>
			return {
				...originalModule,
				promises: {
					access: vi.fn((filePath) => {
						if (filePath.endsWith('translator.config.json')) {
							return Promise.resolve() // Simulate found config file
						}
						return Promise.reject(new Error(`File not found: ${filePath}`))
					}),
					readFile: vi.fn().mockResolvedValue(JSON.stringify(mockConfig)),
					readdir: vi.fn().mockResolvedValue(['en-US.yml', 'el-GR.yml']),
					stat: vi.fn().mockResolvedValue({ isFile: () => true })
				},
				existsSync: vi.fn().mockReturnValue(true),
				readFileSync: vi.fn().mockReturnValue(JSON.stringify(mockConfig)),
				constants: originalModule.constants
			}
		})
		vi.mock('path', async () => {
			const actual = await vi.importActual('path')
			return {
				...actual,
				join: (...args: string[]) => args.join('/')
			}
		})
		vi.mock('~tools/translator/src/config')
		vi.mock('~tools/translator/src/file-ops', () => {
			const mockLocaleFiles = [
				{ path: path.join(testDir, 'en-US.yml'), lang: 'en-US', dir: testDir },
				{ path: path.join(testDir, 'el-GR.yml'), lang: 'el-GR', dir: testDir }
			]
			return { getFiles: vi.fn().mockResolvedValue(mockLocaleFiles) }
		})
		vi.mock('~tools/translator/src/translator', () => ({
			translateBundle: vi.fn().mockResolvedValue({ hello: 'Γεια' })
		}))
		vi.mock('~tools/translator/src/logger', () => ({ useLogger: vi.fn() }))
		vi.spyOn(configModule, 'loadConfig')
		vi.spyOn(fileOpsModule, 'getFiles')
		vi.spyOn(translatorModule, 'translateBundle')
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('should successfully execute the main function', async () => {
		await main()

		expect(configModule.loadConfig).toHaveBeenCalled()
		expect(fileOpsModule.getFiles).toHaveBeenCalled()
		expect(translatorModule.translateBundle).toHaveBeenCalled()
	})
	it('handles configuration loading error', async () => {
		vi.mocked(configModule.loadConfig).mockRejectedValue(new Error('Config load error'))
		await expect(main()).rejects.toThrow('Config load error')
		expect(fileOpsModule.getFiles).not.toHaveBeenCalled()
	})
	it('handles file reading error', async () => {
		const expectedErrorPattern =
			/Failed to parse and validate config file at.*translator.config.json. Error: SyntaxError: "undefined" is not valid JSON/

		vi.mocked(fileOpsModule.getFiles).mockRejectedValue(new Error('Error reading file'))

		await expect(main()).rejects.toThrow(expectedErrorPattern)
		expect(translatorModule.translateBundle).not.toHaveBeenCalled()
	})
})
