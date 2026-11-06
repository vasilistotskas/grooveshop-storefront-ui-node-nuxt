import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { REPO, withoutComments } from '../../helpers/sourceText'

/**
 * The media library dialog (`Builder/MediaPicker.vue`: library list, upload,
 * alt text) is the page editor's alone: only the image setting
 * (`Builder/MediaField.vue`) mounts it, and only a setting of the editor's
 * settings form (`Builder/SettingField.vue`) mounts that. Nuxt splits a
 * component into the chunk of the page that uses it, so the library rides in
 * the editor's chunk (`/_builder`) and never in a store page a shopper loads.
 * Mounted anywhere else, it would put the staff library in front of shoppers.
 *
 * Read off the source with comments removed, so a comment cannot trip it.
 */
const PICKER = /<(?:Lazy)?BuilderMediaPicker\b/
const FIELD = /<(?:Lazy)?BuilderMediaField\b/

const MOUNTER = 'app/components/Builder/MediaField.vue'
const FORM = 'app/components/Builder/SettingField.vue'

const toPath = (file: string) => file.replaceAll('\\', '/').slice(REPO.replaceAll('\\', '/').length + 1)

const sourceFiles = ['app', 'server', 'shared', 'runtime', 'modules'].flatMap(dir =>
  (readdirSync(resolve(REPO, dir), { recursive: true }) as string[])
    .filter(entry => /\.(?:ts|vue)$/.test(entry))
    .map(entry => resolve(REPO, dir, entry)),
).map(file => ({ path: toPath(file), source: withoutComments(readFileSync(file, 'utf-8')) }))

describe('the media library dialog', () => {
  it('is found where it lives (the rule has not gone blind)', () => {
    expect(sourceFiles.length).toBeGreaterThan(500)
    expect(sourceFiles.find(({ path }) => path === MOUNTER)?.source).toMatch(PICKER)
    expect(sourceFiles.find(({ path }) => path === FORM)?.source).toMatch(FIELD)
  })

  it('is mounted by the image setting alone', () => {
    expect(sourceFiles.filter(({ source }) => PICKER.test(source)).map(({ path }) => path)).toEqual([MOUNTER])
  })

  it('is a setting of the page editor form alone', () => {
    expect(sourceFiles.filter(({ source }) => FIELD.test(source)).map(({ path }) => path)).toEqual([FORM])
  })
})
