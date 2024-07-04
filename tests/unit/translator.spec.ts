import path from 'path'

import { translateBundle } from '~~/tools/translator/src/translator'
import { readFileContents } from '~~/tools/translator/src/file-ops'
import { FileExtensions } from '~~/tools/translator/src/types'
import { getISO6391Code, retry, validateDynamicKeys } from '~~/tools/translator/src/helpers'

describe('translator tests', async () => {
  vi.mock('~~/tools/translator/src/helpers')

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(retry).mockImplementation(async func => await func())
    vi.mocked(validateDynamicKeys).mockReturnValue(true)
  })

  it('translate should return a correctly translated object', async () => {
    vi.mocked(getISO6391Code).mockReturnValue('el')

    const testDir = path.join('tests', 'data', 'locales')
    const input = path.join(testDir, 'en-US.yml')
    const inputBundle = await readFileContents(input, FileExtensions.YML)

    const translatedBundle = await translateBundle(inputBundle, {
      path: path.join(testDir, 'el-GR.yml'),
      langCode: 'el',
      dir: testDir,
    })

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
})
