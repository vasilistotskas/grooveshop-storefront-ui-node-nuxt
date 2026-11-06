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
 * A component is reached by its tag (PascalCase or kebab-case, `Lazy` or
 * not), by `resolveComponent('...')`, by `h(...)` or by an import of its file,
 * so each way is held. Read off the source with comments removed, so a
 * comment cannot trip it.
 */
const reaching = (pascal: string, kebab: string, file: string) => new RegExp(
  `<(?:Lazy|lazy-)?(?:${pascal}|${kebab})\\b`
  + `|resolveComponent\\(\\s*['"\`](?:Lazy)?${pascal}['"\`]`
  + `|\\bh\\(\\s*(?:Lazy)?${pascal}\\b`
  + `|\\b(?:Lazy)?${pascal}\\b(?=\\s*[,)}])`
  + `|Builder/${file}(?:\\.vue)?['"\`]`,
)

const PICKER = reaching('BuilderMediaPicker', 'builder-media-picker', 'MediaPicker')
const FIELD = reaching('BuilderMediaField', 'builder-media-field', 'MediaField')

const PICKER_FILE = 'app/components/Builder/MediaPicker.vue'
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

  it.each([
    ['a tag', '<BuilderMediaPicker v-model:open="open" />'],
    ['a lazy tag', '<LazyBuilderMediaPicker />'],
    ['a kebab-case tag', '<builder-media-picker />'],
    ['resolveComponent', 'resolveComponent(\'BuilderMediaPicker\')'],
    ['resolveComponent of the lazy name', 'resolveComponent(\'LazyBuilderMediaPicker\')'],
    ['h()', 'h(BuilderMediaPicker, { open: true })'],
    ['an import', 'import Picker from \'~/components/Builder/MediaPicker.vue\''],
    ['a component map', 'components: { BuilderMediaPicker }'],
  ])('sees the picker reached by %s', (_how, snippet) => {
    expect(snippet).toMatch(PICKER)
  })

  it.each([
    ['a tag', '<BuilderMediaField :value="1" />'],
    ['a kebab-case tag', '<builder-media-field />'],
    ['resolveComponent', 'resolveComponent(\'BuilderMediaField\')'],
    ['h()', 'h(LazyBuilderMediaField, {})'],
    ['an import', 'import Field from \'~/components/Builder/MediaField.vue\''],
  ])('sees the field reached by %s', (_how, snippet) => {
    expect(snippet).toMatch(FIELD)
  })

  it('is reached from the image setting alone', () => {
    const offenders = sourceFiles.filter(({ path, source }) => path !== PICKER_FILE && PICKER.test(source)).map(({ path }) => path)

    expect(offenders).toEqual([MOUNTER])
  })

  it('is a setting of the page editor form alone', () => {
    const offenders = sourceFiles.filter(({ path, source }) => path !== MOUNTER && FIELD.test(source)).map(({ path }) => path)

    expect(offenders).toEqual([FORM])
  })
})
