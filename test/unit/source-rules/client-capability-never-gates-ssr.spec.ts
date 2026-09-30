import { describe, it, expect, beforeAll } from 'vitest'
import {
  APP,
  COMPONENTS,
  appLabel,
  componentsByName,
  parseExpression,
  sfcScriptAsts,
  sfcTemplate,
  vueFiles,
  walkAst,
  walkElements,
} from '../../helpers/sourceText'

/**
 * A capability the server cannot detect must not decide SSR markup.
 *
 * `useClipboard().isSupported` is `false` while rendering — there is no
 * `navigator` — and `true` the instant the client evaluates it. A
 * `v-if` on it therefore renders nothing on the server and a button
 * during hydration, which is a mismatch: measured on staging
 * 2026-09-21, `/offers` gained five "Αντιγραφή κωδικού" buttons
 * between the server's DOM and the hydrated one, and the product page
 * did the same for its offer rows. Both logged "Hydration completed
 * but contains mismatches" at every width.
 *
 * `<ClientOnly>` is the answer: it renders nothing on the server AND
 * nothing on the client's hydration pass, then mounts. The `v-if`
 * stays inside it, so a browser without the capability still gets no
 * dead button.
 *
 * The capability usually travels: the offers pages bind it and hand it
 * to `OffersCard` / `ProductOfferRow` as a prop, and the `v-if` lives in
 * the child. So a bound capability is followed through every prop it is
 * passed as, into the child component's template. Every `v-if`,
 * `v-else-if` and `v-show` whose expression READS it is checked, not
 * only one spelled exactly `v-if="name"`.
 *
 * `navigator.share` (`useShare`) has the same server/client split and is
 * checked the same way. `matchMedia` and storage are the next ones; this
 * list is the place to add them.
 */
const CAPABILITIES: Record<string, string> = {
  useClipboard: 'isSupported',
  useShare: 'isSupported',
}

const DECIDING_DIRECTIVES = new Set(['if', 'else-if', 'show'])

const camelize = (name: string) => name.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())

/** Local names bound to a capability flag: `const { isSupported: x } = useClipboard()`. */
function capabilityBindings(file: string): string[] {
  const names: string[] = []
  for (const { program } of sfcScriptAsts(file)) {
    walkAst(program, (node) => {
      if (node.type !== 'VariableDeclarator' || node.id.type !== 'ObjectPattern') return
      const init = node.init?.type === 'AwaitExpression' ? node.init.argument : node.init
      if (init?.type !== 'CallExpression' || init.callee.type !== 'Identifier') return
      const field = CAPABILITIES[init.callee.name]
      if (!field) return
      for (const property of node.id.properties) {
        if (property.type === 'ObjectProperty' && property.key.name === field && property.value.type === 'Identifier') {
          names.push(property.value.name)
        }
      }
    })
  }
  return names
}

/** Does this template expression read any of `names` (bare, or as `props.name`)? */
function reads(expression: string, names: ReadonlySet<string>): boolean {
  let found = false
  walkAst(parseExpression(expression), (node, parents) => {
    const parent = parents.at(-1)
    if (node.type === 'Identifier' && names.has(node.name)) {
      const isPropertyName = (parent?.type === 'MemberExpression' || parent?.type === 'OptionalMemberExpression')
        && parent.property === node && !parent.computed
      const isKey = parent?.type === 'ObjectProperty' && parent.key === node && !parent.computed
      if (!isPropertyName && !isKey) found = true
    }
    if ((node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression')
      && node.object.type === 'Identifier' && node.object.name === 'props'
      && node.property.type === 'Identifier' && names.has(node.property.name)) {
      found = true
    }
  })
  return found
}

interface Guard { site: string, insideClientOnly: boolean }

let guards: Guard[]

beforeAll(() => {
  // Frozen components resolve under their `Webside` prefix, as Nuxt
  // registers them, so a prop hop inside the frozen tree is followed too.
  const byName = componentsByName(vueFiles(COMPONENTS))
  const found = new Map<string, Guard>()
  const visited = new Set<string>()

  const check = (file: string, names: ReadonlySet<string>) => {
    const key = `${file}|${[...names].sort().join(',')}`
    if (visited.has(key)) return
    visited.add(key)

    walkElements(sfcTemplate(file), (node, ancestors) => {
      const insideClientOnly = ancestors.some(a => a.tag === 'ClientOnly')
      for (const prop of node.props) {
        // Only a deciding directive or a prop binding can carry the flag
        // on; `v-for`/`v-on` bodies are not plain expressions.
        if (prop.type !== 7 || !prop.exp || !('content' in prop.exp)) continue
        if (!DECIDING_DIRECTIVES.has(prop.name) && prop.name !== 'bind') continue
        const expression = String(prop.exp.content)
        if (!reads(expression, names)) continue

        if (DECIDING_DIRECTIVES.has(prop.name)) {
          const site = `${appLabel(file)}:${prop.loc.start.line}`
          found.set(site, { site, insideClientOnly })
        }
        // Passed down as a prop: the child's template decides now.
        const target = byName.get(node.tag.replace(/^Lazy/, ''))
        if (prop.name === 'bind' && prop.arg && 'content' in prop.arg && target) {
          check(target, new Set([camelize(prop.arg.content)]))
        }
      }
    })
  }

  for (const file of vueFiles(APP)) {
    const names = capabilityBindings(file)
    if (names.length) check(file, new Set(names))
  }
  guards = [...found.values()]
})

describe('a client-only capability', () => {
  it('never decides what the server renders', () => {
    expect(
      guards.filter(guard => !guard.insideClientOnly).map(guard => guard.site),
      'these gate SSR markup on a client-only capability — wrap in <ClientOnly>',
    ).toEqual([])
  })

  it('still finds the guards it is meant to be watching', () => {
    // A rule that silently matches nothing passes forever: the offer
    // card and offer row (reached through the prop), and the share
    // buttons on the cards, the post and the product page.
    const sites = guards.map(guard => guard.site)
    expect(sites).toEqual(expect.arrayContaining([
      expect.stringMatching(/^components\/Offers\/Card\.vue:/),
      expect.stringMatching(/^components\/Product\/OfferRow\.vue:/),
      expect.stringMatching(/^components\/Storefront\/ProductDetail\.vue:/),
      // Reached through `<WebsideOffersCard :clipboard-supported>` inside
      // the frozen tree, which only resolves under the Webside prefix.
      expect.stringMatching(/^components\/variants\/webside\/Offers\/Card\.vue:/),
      expect.stringMatching(/^components\/variants\/webside\/Product\/OfferRow\.vue:/),
    ]))
    expect(sites.length).toBeGreaterThanOrEqual(8)
  })
})
