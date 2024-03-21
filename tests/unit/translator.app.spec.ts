import * as path from 'path'

import { describe, expect, it, vi } from 'vitest'

import main from '~/tools/translator/src/app'
import * as configModule from '~/tools/translator/src/config'
import * as fileOpsModule from '~/tools/translator/src/file-ops'
import * as translatorModule from '~/tools/translator/src/translator'
import { type TranslatorConfig } from '~/tools/translator/src/config'

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
          bundleMaxRetries: 3,
        },
      } as TranslatorConfig
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
          stat: vi.fn().mockResolvedValue({ isFile: () => true }),
          writeFile: vi.fn().mockResolvedValue(undefined),
        },
        existsSync: vi.fn().mockReturnValue(true),
        readFileSync: vi.fn().mockReturnValue(JSON.stringify(mockConfig)),
        constants: originalModule.constants,
      }
    })
    vi.mock('path', async () => {
      const actual = await vi.importActual('path')
      return {
        ...actual,
        join: (...args: string[]) => args.join('/'),
      }
    })
    vi.mock('~tools/translator/src/config')
    vi.mock('~tools/translator/src/file-ops', () => {
      const mockLocaleFiles = [
        { path: path.join(testDir, 'en-US.yml'), lang: 'en-US', dir: testDir },
        { path: path.join(testDir, 'el-GR.yml'), lang: 'el-GR', dir: testDir },
      ]
      return { getFiles: vi.fn().mockResolvedValue(mockLocaleFiles) }
    })
    vi.mock('~tools/translator/src/translator', () => ({
      translateBundle: vi.fn().mockResolvedValue({ hello: 'Γεια' }),
    }))
    vi.mock('~tools/translator/src/consola', () => ({ consola: vi.fn() }))
    vi.spyOn(configModule, 'loadTranslatorConfig')
    vi.spyOn(fileOpsModule, 'getFiles')
    vi.spyOn(translatorModule, 'translateBundle')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should successfully execute the main function', async () => {
    await main()
    expect(configModule.loadTranslatorConfig).toHaveBeenCalled()
    expect(fileOpsModule.getFiles).toHaveBeenCalled()
    expect(translatorModule.translateBundle).toHaveBeenCalled()
  })
})
