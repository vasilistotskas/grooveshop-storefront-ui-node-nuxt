import path from 'path'

import { setupProgressBar } from '~/tools/translator/src/app'
import { FileExtensions } from '~/tools/translator/src/types'
import { loadTranslatorConfig } from '~/tools/translator/src/config'
import { findFileExtension } from '~/tools/translator/src/file-ops'

describe('app.ts tests', async () => {
  beforeEach(async () => {
    await loadTranslatorConfig()
  })

  it('loads the translation config successfully', async () => {
    expect(loadTranslatorConfig).not.toThrow()
  })

  it('finds the correct file extension', async () => {
    const testDir = path.join('tests', 'data', 'locales')
    const extension = await findFileExtension(testDir, 'en-US', [
      FileExtensions.YML,
      FileExtensions.YAML,
      FileExtensions.TS,
      FileExtensions.JSON,
    ])
    expect(extension).toBe('yml')
  })

  it('returns null for any other debug mode', () => {
    const progressBar = setupProgressBar('consola', 10)
    expect(progressBar).toBeNull()
  })
})
