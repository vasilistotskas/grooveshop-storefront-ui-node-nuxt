import { promises as fsPromises } from 'fs'
import path from 'path'

import { describe, expect, it, vi } from 'vitest'

import * as configModule from '~/tools/translator/src/config'
import { getFiles } from '~/tools/translator/src/file-ops'

vi.mock('fs')
vi.mock('~/tools/translator/src/config')

describe('translator file-ops tests', () => {
  const testDir = path.join('tests', 'data', 'locales')

  beforeEach(async () => {
    vi.clearAllMocks()
    await configModule.loadTranslatorConfig()
  })

  it('returns an empty array for an empty directory', async () => {
    vi.mocked(fsPromises.readdir).mockResolvedValue([])
    const files = await getFiles('emptyDir')
    expect(files).toEqual([])
  })
  it('throws an error for a non-existent directory', async () => {
    vi.mocked(fsPromises.readdir).mockRejectedValue(
      new Error('Directory does not exist'),
    )
    await expect(getFiles('nonexistentDir')).rejects.toThrow(
      'Directory does not exist',
    )
  })
  it('handles file system errors correctly', async () => {
    vi.mocked(fsPromises.readdir).mockRejectedValue(
      new Error('File system error'),
    )
    await expect(getFiles('errorDir')).rejects.toThrow('File system error')
  })
  it('retrieves .yml files from a directory', async () => {
    // @ts-ignore
    vi.mocked(fsPromises.readdir).mockResolvedValue(['en-US.yml', 'el-GR.yml'])
    // @ts-ignore
    vi.mocked(fsPromises.stat).mockImplementation((filePath) => {
      return Promise.resolve({
        isFile: () => (filePath as string).endsWith('.yml'),
        isDirectory: () => !(filePath as string).endsWith('.yml'),
      })
    })

    const files = await getFiles(testDir)
    expect(files).toEqual([
      { path: path.join(testDir, 'en-US.yml'), lang: 'en-US', dir: testDir },
      { path: path.join(testDir, 'el-GR.yml'), lang: 'el-GR', dir: testDir },
    ])
  })

  it('ignores non-.yml files', async () => {
    // @ts-ignore
    vi.mocked(fsPromises.readdir).mockResolvedValue(['en-US.txt', 'el-GR.yml'])
    // @ts-ignore
    vi.mocked(fsPromises.stat).mockImplementation(() => {
      return Promise.resolve({
        isFile: () => true,
        isDirectory: () => false,
      })
    })

    const files = await getFiles(testDir)
    expect(files).toEqual([
      { path: path.join(testDir, 'el-GR.yml'), lang: 'el-GR', dir: testDir },
    ])
  })

  it('recursively retrieves files from nested directories', async () => {
    // @ts-ignore
    vi.mocked(fsPromises.readdir).mockImplementation((dir) => {
      if (dir === testDir) {
        // @ts-ignore
        return Promise.resolve(['subdir'])
      } else if (dir === path.join(testDir, 'subdir')) {
        // @ts-ignore
        return Promise.resolve(['en-US.yml'])
      }
      // @ts-ignore
      return Promise.resolve([])
    })
    // @ts-ignore
    vi.mocked(fsPromises.stat).mockImplementation((filePath) => {
      // @ts-ignore
      return Promise.resolve({
        isFile: () => (filePath as string).endsWith('.yml'),
        isDirectory: () => !(filePath as string).endsWith('.yml'),
      })
    })

    const files = await getFiles(testDir)
    expect(files).toEqual([
      {
        path: path.join(testDir, 'subdir', 'en-US.yml'),
        lang: 'en-US',
        dir: path.join(testDir, 'subdir'),
      },
    ])
  })
})
