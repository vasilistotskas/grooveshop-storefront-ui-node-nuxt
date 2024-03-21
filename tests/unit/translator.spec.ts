import path from 'path'

import { describe, expect, it, vi } from 'vitest'

import * as cacheModule from '~/tools/translator/src/cache'
import * as helpersModule from '~/tools/translator/src/helpers'
import { translateBundle } from '~/tools/translator/src/translator'
import yaml from 'js-yaml'
import fs from 'fs'
import { getFiles } from '~/tools/translator/src/file-ops'
import type { LocaleFile } from '~/tools/translator/src/types'

vi.mock('~/tools/translator/src/helpers')
vi.mock('~/tools/translator/src/cache')

describe('translator tests', async () => {
  const testDir = path.join('tests', 'data', 'locales')
  const inputBundle = yaml.load(
    fs.readFileSync(path.join(testDir, 'en-US.yml'), 'utf8'),
  ) as Record<string, unknown>

  const localePath = path.join(testDir)
  const localeFiles = await getFiles(localePath)
  const sourceFileName = 'en-US'
  const listLocaleToTranslate = localeFiles.filter(
    (l: LocaleFile) => l.lang !== sourceFileName,
  )

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(helpersModule.retry).mockImplementation(
      async (func) => await func(),
    )
    vi.mocked(helpersModule.validateDynamicKeys).mockReturnValue(true)
  })

  it('translate should return a correctly translated object', async () => {
    vi.mocked(helpersModule.getISO6391Code).mockReturnValue('el')

    const translatedBundle = await translateBundle(
      inputBundle,
      listLocaleToTranslate[0],
    )
    expect(translatedBundle).toEqual({
      hello: 'Γειά σου',
      my_name_is: 'Το όνομά μου είναι %{name}',
      what: {
        a: {
          beautiful: {
            day: 'Τι όμορφη μέρα',
          },
        },
      },
    })
  })
  it('uses cached translation if available', async () => {
    const cachedTranslation = 'cached-translation'
    vi.mocked(cacheModule.default.getCacheKeyVal).mockReturnValueOnce(
      cachedTranslation,
    )

    const inputBundle = { key: 'value' }
    const locale = {
      path: path.join(testDir, 'en-US.yml'),
      lang: 'en-US',
      dir: testDir,
    }
    const translatedBundle = await translateBundle(inputBundle, locale)

    expect(translatedBundle).toEqual({ key: cachedTranslation })
  })
})
