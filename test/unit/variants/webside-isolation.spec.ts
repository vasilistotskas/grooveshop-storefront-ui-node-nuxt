import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The frozen `webside` tree must stay self-contained.
 *
 * `app/components/variants/webside/**` is today's platform storefront,
 * kept byte-for-byte so webside.gr keeps rendering what it renders now
 * while the default components under `app/components/` are rewritten.
 * It is registered with the auto-import prefix `Webside`, so a frozen
 * component that renders `<ProductCard>` instead of `<WebsideProductCard>`
 * would silently pick up the NEW default card — and webside's page would
 * change without any test naming the file that changed it.
 *
 * Two rules, both asserted against source:
 *
 *  1. Inside the frozen tree, a tag or `resolveComponent()` name that has
 *     a frozen twin must use the `Webside` prefix.
 *  2. Nothing under `app/components/` may carry a page macro
 *     (`definePageMeta`, `defineRouteRules`): Nuxt only extracts them
 *     from `app/pages/`, so in a body they are inert and the route
 *     silently loses its middleware or robots rule.
 */

const ROOT = path.resolve(import.meta.dirname, '../../..')
const COMPONENTS = path.join(ROOT, 'app/components')
const FROZEN = path.join(COMPONENTS, 'variants/webside')
const PREFIX = 'Webside'

function vueFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) vueFiles(full, found)
    else if (entry.name.endsWith('.vue')) found.push(full)
  }
  return found
}

/**
 * Nuxt's component name for a path relative to a components directory:
 * PascalCase path segments, `index` dropped, and the overlap removed
 * when a filename repeats the tail of its directory
 * (`Footer/FooterMobile.vue` → `FooterMobile`).
 */
function componentName(rel: string): string {
  const parts = rel.replace(/\.vue$/, '').split('/')
  const file = parts.pop() ?? ''
  const fileSegments = file === 'index'
    ? []
    : splitCase(file.replace(/\.(client|server)$/, ''))
  const prefixSegments = parts.flatMap(splitCase)
  let overlap = 0
  for (let n = Math.min(prefixSegments.length, fileSegments.length); n > 0; n--) {
    if (prefixSegments.slice(-n).join() === fileSegments.slice(0, n).join()) {
      overlap = n
      break
    }
  }
  return [...prefixSegments, ...fileSegments.slice(overlap)]
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
}

function splitCase(value: string): string[] {
  return value
    .split(/[-_ ]+|(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/)
    .filter(Boolean)
}

const frozenFiles = vueFiles(FROZEN)
const frozenNames = new Set(
  frozenFiles.map(file =>
    componentName(path.relative(FROZEN, file).replace(/\\/g, '/')),
  ),
)

function templateOf(source: string): string {
  const start = source.search(/^<template[\s>]/m)
  const end = source.lastIndexOf('</template>')
  return start < 0 || end < 0 ? '' : source.slice(start, end)
}

describe('the frozen webside tree', () => {
  it('exists and is registered with the Webside prefix', () => {
    expect(frozenFiles.length).toBeGreaterThan(100)
    const config = readFileSync(path.join(ROOT, 'nuxt.config.ts'), 'utf8')
    expect(config).toMatch(/path: '~\/components\/variants\/webside',\s*prefix: 'Webside'/)
  })

  it.each(frozenFiles.map(f => [path.relative(ROOT, f).replace(/\\/g, '/'), f]))(
    '%s references frozen components only through the Webside prefix',
    (_rel, file) => {
      const source = readFileSync(file, 'utf8')
      const offenders: string[] = []

      for (const match of templateOf(source).matchAll(/<(Lazy)?([A-Z][A-Za-z0-9]*)(?=[\s>/])/g)) {
        const name = match[2]!
        if (frozenNames.has(name) && !name.startsWith(PREFIX)) offenders.push(`<${match[1] ?? ''}${name}`)
      }
      for (const match of source.matchAll(/resolveComponent\('(Lazy)?([A-Z][A-Za-z0-9]*)'\)/g)) {
        const name = match[2]!
        if (frozenNames.has(name) && !name.startsWith(PREFIX)) offenders.push(`resolveComponent('${name}')`)
      }

      expect(offenders, 'these resolve to the NEW default component').toEqual([])
    },
  )
})

describe('page macros stay in app/pages', () => {
  it.each(vueFiles(COMPONENTS).map(f => [path.relative(ROOT, f).replace(/\\/g, '/'), f]))(
    '%s carries no definePageMeta / defineRouteRules',
    (_rel, file) => {
      const code = readFileSync(file, 'utf8')
        .split('\n')
        .filter(line => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
        .join('\n')
      expect(code).not.toMatch(/\bdefinePageMeta\(/)
      expect(code).not.toMatch(/\bdefineRouteRules\(/)
    },
  )
})
