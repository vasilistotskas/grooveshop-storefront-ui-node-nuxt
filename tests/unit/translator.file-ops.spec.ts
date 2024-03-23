import path from 'path'

import { getFilesFromDir } from '~/tools/translator/src/file-ops'
import { loadTranslatorConfig } from '~/tools/translator/src/config'

describe('translator file-ops tests', async () => {
  beforeEach(async () => {
    await loadTranslatorConfig()
  })

  it('returns an empty array for an empty directory', async () => {
    const files = await getFilesFromDir('emptyDir')
    expect(files).toEqual([])
  })

  it('retrieves .yml files from a directory and subdirs', async () => {
    const testDir = path.join('tests', 'data', 'locales')
    const testSubDir = path.join(testDir, 'subdir')
    const files = await getFilesFromDir(testDir)
    expect(files).toEqual([
      {
        path: path.join(testDir, 'de-DE.json'),
        langCode: 'de-DE',
        dir: testDir,
      },
      {
        path: path.join(testDir, 'de-DE.yml'),
        langCode: 'de-DE',
        dir: testDir,
      },
      {
        path: path.join(testDir, 'el-GR.yml'),
        langCode: 'el-GR',
        dir: testDir,
      },
      {
        path: path.join(testDir, 'en-US.yml'),
        langCode: 'en-US',
        dir: testDir,
      },
      {
        path: path.join(testSubDir, 'el-GR.yml'),
        langCode: 'el-GR',
        dir: testSubDir,
      },
      {
        path: path.join(testSubDir, 'en-US.yml'),
        langCode: 'en-US',
        dir: testSubDir,
      },
    ])
  })
})
