import { describe, it, expect } from 'vitest'
import { COMPONENTS, boundAttribute, readSource, relativeLabel, sfcTemplate, vueFiles, walkElements } from '../../helpers/sourceText'

/**
 * A lazily hydrated header menu hydrates on a pointer MOVE.
 *
 * Vue's `hydrateOnInteraction` replays the event that hydrated a
 * component, and Reka's NavigationMenu opens a panel on `pointermove`,
 * never on `pointerenter`. With the default events (`pointerenter`,
 * `click`, `focus`) the replayed `pointerenter` opened nothing: the first
 * hover after a page load showed no panel (real browser, 2026-11-12).
 * `pointerdown` hydrates a tap before its click, `focusin` a keyboard
 * before its key.
 */
const REQUIRED = ['pointermove', 'pointerdown', 'focusin']

function menus(file: string): Array<{ at: string, events: string[] | undefined }> {
  const out: Array<{ at: string, events: string[] | undefined }> = []
  const source = readSource(file)
  walkElements(sfcTemplate(file), (node) => {
    if (node.tag !== 'LazyUNavigationMenu') return
    const bound = boundAttribute(node, 'hydrate-on-interaction')
    // The events are a constant of the script, named in the binding.
    const declaration = bound && new RegExp(`const ${bound} = \\[([^\\]]*)\\]`).exec(source)?.[1]
    out.push({
      at: `${relativeLabel(COMPONENTS, file)}:${node.loc.start.line}`,
      events: declaration ? [...declaration.matchAll(/'([a-z]+)'/g)].map(match => match[1]!) : undefined,
    })
  })
  return out
}

describe('a lazily hydrated header menu hydrates on the events Reka opens on', () => {
  const found = vueFiles(COMPONENTS).flatMap(menus)

  it('finds both designs\' header menus', () => {
    expect(found.map(menu => menu.at.split(':')[0])).toEqual(expect.arrayContaining([
      'Chrome/Navbar.vue',
      'variants/webside/Page/Navbar.vue',
    ]))
  })

  it('hydrates each on a pointer move, a tap and a focus', () => {
    const wrong = found.filter(menu => !REQUIRED.every(event => menu.events?.includes(event))).map(menu => menu.at)

    expect(wrong).toEqual([])
  })
})
