import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { REPO, withoutComments } from '../../helpers/sourceText'

/**
 * The outline's drag and drop (Sortable.js through VueUse's `useSortable`)
 * is the editor's alone: one component imports it, `Builder/OutlineTree.vue`,
 * and only the editor's outline mounts that component. Nuxt splits a
 * component into the chunk of the page that uses it, so the library rides in
 * the editor's chunk (`/_builder`) and never in a store page a shopper loads,
 * the editor's preview included. A second importer anywhere else, or the
 * tree mounted outside the outline, would put it in front of shoppers.
 *
 * Read off the source with comments removed, so a comment cannot trip it.
 */
const DRAG_LIBRARY = /\bfrom\s+['"](?:sortablejs|@vueuse\/integrations(?:\/[^'"]*)?)['"]/
const TREE = /<(?:Lazy)?BuilderOutlineTree\b/

/** The one file that may import the library, and the one that may mount it. */
const IMPORTER = 'app/components/Builder/OutlineTree.vue'
const MOUNTER = 'app/components/Builder/Outline.vue'

const toPath = (file: string) => file.replaceAll('\\', '/').slice(REPO.replaceAll('\\', '/').length + 1)

const sourceFiles = ['app', 'server', 'shared', 'runtime', 'modules'].flatMap(dir =>
  (readdirSync(resolve(REPO, dir), { recursive: true }) as string[])
    .filter(entry => /\.(?:ts|vue)$/.test(entry))
    .map(entry => resolve(REPO, dir, entry)),
).map(file => ({ path: toPath(file), source: withoutComments(readFileSync(file, 'utf-8')) }))

describe('the outline\'s drag library', () => {
  it('is found where it lives (the rule has not gone blind)', () => {
    expect(sourceFiles.length).toBeGreaterThan(500)
    expect(sourceFiles.find(({ path }) => path === IMPORTER)?.source).toMatch(DRAG_LIBRARY)
    expect(sourceFiles.find(({ path }) => path === MOUNTER)?.source).toMatch(TREE)
  })

  it('is imported by the outline\'s tree alone', () => {
    expect(sourceFiles.filter(({ source }) => DRAG_LIBRARY.test(source)).map(({ path }) => path)).toEqual([IMPORTER])
  })

  it('is mounted by the editor\'s outline alone', () => {
    expect(sourceFiles.filter(({ source }) => TREE.test(source)).map(({ path }) => path)).toEqual([MOUNTER])
  })
})
