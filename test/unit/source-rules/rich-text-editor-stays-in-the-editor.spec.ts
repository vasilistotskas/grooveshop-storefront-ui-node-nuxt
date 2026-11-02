import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { REPO, withoutComments } from '../../helpers/sourceText'

/**
 * Nuxt UI's rich text editor (`UEditor`, built on TipTap and ProseMirror)
 * is the page editor's alone: one component mounts it,
 * `Builder/RichTextField.vue`, and only a setting of the page editor's
 * settings form (`Builder/SettingField.vue`) mounts that. Nuxt splits a
 * component into the chunk of the page that uses it, so TipTap rides in the
 * editor's chunk (`/_builder`) and never in a store page a shopper loads.
 * Mounted anywhere else, it would put the whole editor in front of shoppers.
 *
 * Read off the source with comments removed, so a comment cannot trip it.
 */
const EDITOR = /<(?:Lazy)?UEditor(?:Toolbar|DragHandle|SuggestionMenu|MentionMenu|EmojiMenu)?\b|\bfrom\s+['"]@tiptap\//
const FIELD = /<(?:Lazy)?BuilderRichTextField\b/

/** The one file that mounts the editor, and the one form that mounts it. */
const MOUNTER = 'app/components/Builder/RichTextField.vue'
const FORM = 'app/components/Builder/SettingField.vue'

const toPath = (file: string) => file.replaceAll('\\', '/').slice(REPO.replaceAll('\\', '/').length + 1)

const sourceFiles = ['app', 'server', 'shared', 'runtime', 'modules'].flatMap(dir =>
  (readdirSync(resolve(REPO, dir), { recursive: true }) as string[])
    .filter(entry => /\.(?:ts|vue)$/.test(entry))
    .map(entry => resolve(REPO, dir, entry)),
).map(file => ({ path: toPath(file), source: withoutComments(readFileSync(file, 'utf-8')) }))

describe('the rich text editor', () => {
  it('is found where it lives (the rule has not gone blind)', () => {
    expect(sourceFiles.length).toBeGreaterThan(500)
    expect(sourceFiles.find(({ path }) => path === MOUNTER)?.source).toMatch(EDITOR)
    expect(sourceFiles.find(({ path }) => path === FORM)?.source).toMatch(FIELD)
  })

  it('is mounted by the rich text setting alone', () => {
    expect(sourceFiles.filter(({ source }) => EDITOR.test(source)).map(({ path }) => path)).toEqual([MOUNTER])
  })

  it('is a setting of the page editor\'s form alone', () => {
    expect(sourceFiles.filter(({ source }) => FIELD.test(source)).map(({ path }) => path)).toEqual([FORM])
  })
})
