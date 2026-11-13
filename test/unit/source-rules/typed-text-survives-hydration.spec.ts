import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { APP, COMPONENTS, componentsByName, readSource, relativeLabel, sfcScript, sfcTemplate, vueFiles, walkElements } from '../../helpers/sourceText'

/**
 * A text field a visitor can type into before its component hydrates
 * keeps what was typed (`useKeepTypedBeforeHydration`).
 *
 * Vue's hydration force-patches an input's `value` from the vnode, so a
 * field drawn by a lazily hydrated component, typed into while it was
 * still the server's HTML, was emptied when it hydrated (the newsletter
 * band: filled, then empty 1.5 s later). The lazily hydrated components
 * are the builder's sections registered with `lazySection` or
 * `idleSection` (`app/utils/componentRegistry.ts`) and every `Lazy…`
 * element with a `hydrate-on-*` strategy, followed into the components
 * they draw, outside an overlay (a modal, drawer, slideover or popover
 * draws its content once opened). Each one that draws a text field on the server calls the
 * mechanism, itself or through `useNewsletterSignup`, which calls it
 * before its first `await`.
 */
const MECHANISM = /\buse(KeepTypedBeforeHydration|NewsletterSignup)\(/

/**
 * Components in a lazily hydrated tree whose text field the server never
 * draws, and why: no one can type into it before hydration.
 */
const NOT_SERVER_DRAWN = new Map([
  ['DynamicForm/index.vue', 'the comment form is drawn for a signed-in reader, whose session arrives after hydration'],
])

/** Overlays draw their content only once opened, after hydration: nothing inside them is typed into before. */
const OVERLAYS = new Set(['UModal', 'UDrawer', 'USlideover', 'UPopover'])

const files = vueFiles(COMPONENTS)
const byName = componentsByName(files)
const fileOf = (tag: string) => byName.get(tag.replace(/^Lazy/, ''))

/** The files the registry hydrates lazily. */
function lazySections(): string[] {
  const registry = readSource(resolve(APP, 'utils/componentRegistry.ts'))
  return [...registry.matchAll(/(?:lazySection|idleSection)\(\(\) => import\('~\/(components\/[^']+)'\)\)/g)]
    .map(match => resolve(APP, match[1]!))
}

/** The components every file draws with a `hydrate-on-*` strategy. */
function lazilyHydratedElements(): string[] {
  return files.flatMap((file) => {
    const found: string[] = []
    walkElements(sfcTemplate(file), (node) => {
      const hydrates = node.props.some(prop => (prop.type === 6 && prop.name.startsWith('hydrate-'))
        || (prop.type === 7 && prop.name === 'bind' && prop.arg !== undefined && 'content' in prop.arg && String(prop.arg.content).startsWith('hydrate-')))
      const target = hydrates ? fileOf(node.tag) : undefined
      if (target) found.push(target)
    })
    return found
  })
}

/** The roots and every component of this app they draw, transitively. */
function closure(roots: readonly string[]): Set<string> {
  const seen = new Set<string>()
  const queue = [...roots]
  while (queue.length) {
    const file = queue.pop()!
    if (seen.has(file)) continue
    seen.add(file)
    walkElements(sfcTemplate(file), (node) => {
      if (OVERLAYS.has(node.tag)) return false
      const child = fileOf(node.tag)
      if (child) queue.push(child)
    })
  }
  return seen
}

/** Whether a template draws a field a visitor types text into. */
function drawsTextField(file: string): boolean {
  let draws = false
  walkElements(sfcTemplate(file), (node) => {
    if (OVERLAYS.has(node.tag)) return false
    const type = node.props.find(prop => prop.type === 6 && prop.name === 'type')
    const typeName = type?.type === 6 ? type.value?.content : undefined
    if (['UInput', 'UTextarea'].includes(node.tag) || (node.tag === 'input' && !['checkbox', 'radio', 'hidden'].includes(typeName ?? ''))) draws = true
  })
  return draws
}

describe('text typed before hydration', () => {
  const roots = [...lazySections(), ...lazilyHydratedElements()]
  const forms = [...closure(roots)].filter(drawsTextField)

  it('is kept by every lazily hydrated component that draws a text field', () => {
    // Canary: the newsletter band and webside's footer form at least.
    expect(forms.length).toBeGreaterThanOrEqual(2)
    expect(forms
      .filter(file => !NOT_SERVER_DRAWN.has(relativeLabel(COMPONENTS, file)))
      .filter(file => !MECHANISM.test(sfcScript(file)))
      .map(file => relativeLabel(COMPONENTS, file))).toEqual([])
  })

  it('exempts only components still in a lazily hydrated tree with a text field', () => {
    const labels = forms.map(file => relativeLabel(COMPONENTS, file))
    for (const file of NOT_SERVER_DRAWN.keys()) expect(labels).toContain(file)
  })

  it('registers the mechanism in useNewsletterSignup before its first await', () => {
    const source = readSource(resolve(APP, 'composables/useNewsletterSignup.ts'))
    const body = source.slice(source.indexOf('export async function useNewsletterSignup('))
    const kept = body.indexOf('useKeepTypedBeforeHydration(state)')

    expect(kept).toBeGreaterThan(0)
    expect(kept).toBeLessThan(body.indexOf('await '))
  })
})
