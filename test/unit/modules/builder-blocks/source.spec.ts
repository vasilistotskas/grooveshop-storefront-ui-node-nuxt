import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { blockFiles, blocksModuleSource } from '../../../../modules/builder-blocks/source.ts'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'builder-blocks-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

const touch = (...path: string[]) => {
  mkdirSync(join(dir, ...path.slice(0, -1)), { recursive: true })
  writeFileSync(join(dir, ...path), 'export default {}\n')
}

describe('blockFiles', () => {
  it('lists every *.block.ts below the directory, sorted, folders included', () => {
    touch('hero.block.ts')
    touch('faq.block.ts')
    touch('media', 'gallery.block.ts')

    expect(blockFiles(dir)).toEqual([
      join(dir, 'faq.block.ts'),
      join(dir, 'hero.block.ts'),
      join(dir, 'media', 'gallery.block.ts'),
    ])
  })

  it('leaves out files that are not definitions', () => {
    touch('hero.block.ts')
    touch('hero.ts')
    touch('hero.block.test.ts')
    touch('hero.block.vue')

    expect(blockFiles(dir)).toEqual([join(dir, 'hero.block.ts')])
  })

  it('finds none in a directory that does not exist yet', () => {
    expect(blockFiles(join(dir, 'blocks'))).toEqual([])
  })
})

describe('blocksModuleSource', () => {
  it('imports each file\'s default export and lists them', () => {
    expect(blocksModuleSource(['C:\\app\\blocks\\faq.block.ts', '/app/blocks/hero.block.ts'])).toBe([
      'import block0 from "C:/app/blocks/faq.block.ts"',
      'import block1 from "/app/blocks/hero.block.ts"',
      'export default [block0, block1]',
      '',
    ].join('\n'))
  })

  it('exports an empty list when there is no block', () => {
    expect(blocksModuleSource([])).toBe('\nexport default []\n')
  })
})
