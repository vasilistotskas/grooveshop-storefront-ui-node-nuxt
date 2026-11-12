import { describe, it, expect } from 'vitest'
import type { ElementNode } from '../../helpers/sourceText'
import { COMPONENTS, composableFiles, readSource, relativeLabel, sfcScript, sfcTemplate, vueFiles, walkElements, withoutComments } from '../../helpers/sourceText'

/**
 * A component that draws the session after hydration
 * (`useSessionAfterHydration`) draws the GUEST on its first render, which is
 * the markup the anonymous cached page was sent, and the signed-in parts only
 * after it has mounted.
 *
 * That holds for what the component renders itself. A `Lazy…` child is an
 * async component: it resolves and hydrates AFTER its parent has mounted, by
 * which time the session is already the reader's, so a prop, a slot or a
 * branch inside it that follows the session hydrates the signed-in state over
 * the guest HTML (a hydration mismatch on every signed-in visit: the comments
 * block's empty state, 2026-11-12). So a `Lazy…` element may name the session
 * only in its own `v-if` / `v-else-if`: false on the first render, it is then
 * created after mount, never hydrated. Anything else that follows the session
 * is split into two such elements, as the comments block does.
 *
 * "The session" is `loggedIn` and `user` as the component got them from
 * `useSessionAfterHydration` or from a composable that calls it, under
 * whatever name it gave them.
 */
const ACCESSOR = 'useSessionAfterHydration'
const SESSION_KEYS = ['loggedIn', 'user']

/** The composables that hand their caller the accessor's `loggedIn` / `user`, and the accessor itself. */
const SOURCES = [
  ACCESSOR,
  ...composableFiles().flatMap((file) => {
    const source = readSource(file)
    return source.includes(`${ACCESSOR}(`) ? [...source.matchAll(/export (?:async )?function (\w+)/g)].map(match => match[1]!) : []
  }),
]

/** The names a component gave the session: `const { loggedIn: member, user } = await useX(...)`. */
function sessionNames(script: string): string[] {
  const names: string[] = []
  for (const source of SOURCES) {
    for (const match of script.matchAll(new RegExp(String.raw`const\s*\{([^}]*)\}\s*=\s*(?:await\s+)?${source}\(`, 'g'))) {
      for (const entry of match[1]!.split(',')) {
        const [key, alias] = entry.split(':').map(part => part.trim())
        if (key && SESSION_KEYS.includes(key)) names.push(alias || key)
      }
    }
  }
  return names
}

/** What a `Lazy…` element draws from: its attributes except its own `v-if`, and everything inside it. */
function drawnFrom(node: ElementNode): string {
  const attributes = node.props
    .filter(prop => !(prop.type === 7 && (prop.name === 'if' || prop.name === 'else-if')))
    .map(prop => prop.loc.source)
  return withoutComments([...attributes, ...node.children.map(child => child.loc.source)].join(' '))
}

function violations(file: string): string[] {
  const names = sessionNames(sfcScript(file))
  if (names.length === 0) return []
  const found: string[] = []
  walkElements(sfcTemplate(file), (node) => {
    if (!/^Lazy/.test(node.tag)) return
    const text = drawnFrom(node)
    for (const name of names) {
      if (new RegExp(String.raw`(?<![\w.$])${name}(?![\w$])`).test(text)) found.push(`${relativeLabel(COMPONENTS, file)}:${node.loc.start.line} <${node.tag}> names \`${name}\``)
    }
  })
  return found
}

const USERS = vueFiles(COMPONENTS).filter(file => sessionNames(sfcScript(file)).length > 0)

describe('a Lazy child of a component that draws the session after hydration', () => {
  it('finds the components that use the accessor, directly or through a composable', () => {
    // The comments block (both designs) and the loyalty band: a rule that found none would pass for the wrong reason.
    expect(USERS.map(file => relativeLabel(COMPONENTS, file))).toEqual(expect.arrayContaining([
      'Blog/Post/Comments/index.vue',
      'variants/webside/Blog/Post/Comments/index.vue',
      'PageSection/LoyaltyHero.vue',
    ]))
  })

  it('names the session only in its own v-if, so it is created after mount and never hydrated', () => {
    expect(USERS.flatMap(violations)).toEqual([])
  })
})
