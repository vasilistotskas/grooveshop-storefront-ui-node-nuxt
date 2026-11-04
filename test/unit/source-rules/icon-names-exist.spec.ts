import { globSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import packageJson from '../../../package.json'
import { REPO, readSource, relativeLabel } from '../../helpers/sourceText'

/**
 * An icon named in the source exists in its collection.
 *
 * `@nuxt/icon`'s scan puts every name it can find in the client bundle, and
 * silently skips one its collection does not hold. That icon paints nothing,
 * in any design, and the only trace is an `[Icon] failed to load icon`
 * warning once the lookup gives up: `i-heroicons-mail-20-solid`, a name
 * Heroicons dropped for `envelope`, left webside's "resend verification" item
 * blank, and its late warning failed the suite at random by landing while a
 * test worker closed (2026-11-04).
 *
 * The collections are what `package.json` installs plus the local ones, so a
 * new collection is covered by installing it.
 */

const ICONIFY_PACKAGE = /^@iconify-json\/(.+)$/
const BRAND_ICONS = resolve(REPO, 'app/assets/icons/brand')
const SOURCES = ['app/**/*.{vue,ts}', 'shared/**/*.{vue,ts}', 'nuxt.config.ts']
const NOT_SOURCES = ['shared/openapi/**']

/** `i-<collection>-<name>` or `i-<collection>:<name>`, not a word that merely ends in `i-`. */
const ICON_NAME = /(?<![\w-])i-([a-z0-9]+(?:-[a-z0-9]+)*)(?::([a-z0-9-]+))?/g

function collections(): Map<string, Set<string>> {
  const found = new Map<string, Set<string>>()
  const packages = { ...packageJson.dependencies, ...packageJson.devDependencies }
  for (const name of Object.keys(packages)) {
    const prefix = ICONIFY_PACKAGE.exec(name)?.[1]
    if (!prefix) continue
    const { icons, aliases = {} } = JSON.parse(readFileSync(resolve(REPO, 'node_modules', name, 'icons.json'), 'utf8'))
    found.set(prefix, new Set([...Object.keys(icons), ...Object.keys(aliases)]))
  }
  found.set('brand', new Set(readdirSync(BRAND_ICONS).map(file => file.replace(/\.svg$/, ''))))
  return found
}

const COLLECTIONS = collections()
const LONGEST_PREFIX_FIRST = [...COLLECTIONS.keys()].sort((a, b) => b.length - a.length)

interface Site { label: string, icon: string, known: boolean }

function sitesIn(file: string): Site[] {
  const sites: Site[] = []
  for (const [icon, head, afterColon] of readSource(file).matchAll(ICON_NAME)) {
    // A collection alone: the name is built at runtime (`i-fa6-solid:${base}`).
    if (!afterColon && COLLECTIONS.has(head!)) continue
    // The longest match decides: `heroicons-solid-x` is not `heroicons`'s `solid-x`.
    const prefix = afterColon ? head : LONGEST_PREFIX_FIRST.find(candidate => head!.startsWith(`${candidate}-`))
    const name = afterColon ?? head!.slice((prefix?.length ?? -1) + 1)
    // No collection at all is a wrong name too: `i-herocons-envelope`.
    const known = prefix !== undefined && COLLECTIONS.get(prefix)?.has(name) === true
    sites.push({ label: relativeLabel(REPO, file), icon, known })
  }
  return sites
}

const sites = globSync(SOURCES, { cwd: REPO, exclude: NOT_SOURCES })
  .flatMap(file => sitesIn(resolve(REPO, file)))

describe('icon names', () => {
  it('still finds the icons the source names', () => {
    // A canary: a pattern that stopped matching would pass every name below.
    expect(new Set(sites.map(site => site.icon)).size).toBeGreaterThan(300)
    expect(sites.filter(site => site.icon.startsWith('i-brand-')).length).toBeGreaterThan(0)
  })

  it('names only icons their collection holds', () => {
    expect(sites.filter(site => !site.known).map(site => `${site.label}: ${site.icon}`)).toEqual([])
  })
})
