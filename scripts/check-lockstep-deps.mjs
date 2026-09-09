/**
 * check-lockstep-deps.mjs
 *
 * Fails the install when a family of packages that upstream releases in
 * lockstep has drifted apart in pnpm-lock.yaml.
 *
 * Usage:
 *   node scripts/check-lockstep-deps.mjs
 *
 * Runs from `pnpm prepare`, so it fires on every install and in CI before
 * anything expensive happens.
 *
 * WHY THIS EXISTS
 * ---------------
 * `package.json` pins `vue-i18n` to an exact version, but `@nuxtjs/i18n`
 * declares `@intlify/shared`, `@intlify/core`, `@intlify/core-base` and
 * `@intlify/message-compiler` as `^` ranges of its own. `pnpm install`
 * honours the new exact pin and leaves the `^` ranges at whatever the
 * lockfile already resolved, so bumping vue-i18n alone splits the family
 * across two versions.
 *
 * That would normally be harmless — pnpm gives each consumer its own copy.
 * It is fatal here because `@nuxtjs/i18n`'s module sets
 * `nuxt.options.alias['@intlify/shared']` (and siblings) to ITS OWN resolved
 * copy, which drags the whole bundle — vue-i18n included — onto the older
 * package. The build then dies deep in Vite with a MISSING_EXPORT for a
 * symbol the newer vue-i18n expects, e.g.
 *
 *     [MISSING_EXPORT] "toDevtoolsGroupId" is not exported by
 *       @intlify/shared/dist/shared.mjs  <- vue-i18n/dist/vue-i18n.runtime.mjs
 *
 * `pnpm dedupe` does NOT fix this: both versions independently satisfy their
 * own edges, so there is nothing for it to collapse. A pnpm `overrides` entry
 * does not fix it either — an exact pin has to be hand-synced with the
 * vue-i18n pin forever (`ncu -u` never touches pnpm-workspace.yaml), and once
 * stale it actively forces the wrong version, at which point the `pnpm update`
 * remediation below silently stops working. Range and convergence overrides
 * are defeated by lockfile stickiness, since pnpm keeps any resolution that
 * still satisfies the range.
 *
 * So the invariant is asserted rather than pinned: no version numbers live in
 * this file, and it stays correct across every future bump.
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const LOCKFILE = 'pnpm-lock.yaml'

/**
 * Families whose members are published from a single monorepo under one
 * shared version number, and which therefore must resolve to one identical
 * version across the whole tree.
 *
 * Add a family here if you hit the same class of bug elsewhere. Only include
 * packages that genuinely share a release line — `@intlify/utils`,
 * `@intlify/h3`, `@intlify/bundle-utils`, `@intlify/unplugin-vue-i18n` and
 * `@intlify/vue-i18n-extensions` are versioned independently and must stay
 * out of this list.
 */
const LOCKSTEP_FAMILIES = [
  {
    name: 'vue-i18n / @intlify core',
    members: [
      'vue-i18n',
      '@intlify/shared',
      '@intlify/core',
      '@intlify/core-base',
      '@intlify/message-compiler',
      '@intlify/devtools-types',
    ],
    remediation: [
      'pnpm update @intlify/shared @intlify/core @intlify/core-base \\',
      '            @intlify/message-compiler @intlify/devtools-types --depth 10',
    ],
  },
]

/**
 * Collect every `name -> Set<version>` pair declared in the lockfile.
 *
 * Deliberately a text scan rather than a YAML parse: this runs during
 * `prepare`, i.e. *while* node_modules is being written, so it must not
 * depend on any package being linked yet. pnpm-lock.yaml is also a
 * multi-document file (pnpm 12 keeps its self-managed pnpm binary in a
 * leading document), and every document's `packages:` block uses the same
 * flat `name@version:` key shape, so one scan covers all of them.
 */
function readLockfileVersions(text) {
  const versions = new Map()
  let inPackages = false

  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\r$/, '')

    // Top-level key: opens `packages:`, or closes it by starting any
    // other block (`snapshots:`, `importers:`, `settings:`, `---`, ...).
    if (/^[A-Za-z-]+:/.test(line) || line === '---') {
      inPackages = line === 'packages:'
      continue
    }
    if (!inPackages) continue

    // `  '@intlify/shared@11.4.10':` or `  vue-i18n@11.4.10:`
    // Greedy name capture deliberately claims the LAST `@`, which is the
    // one separating a scoped package name from its version.
    const match = /^ {2}'?(.+)@([^@'\s]+?)'?:\s*$/.exec(line)
    if (!match) continue

    const name = match[1]
    const version = match[2].replace(/\(.*$/, '')
    if (!versions.has(name)) versions.set(name, new Set())
    versions.get(name).add(version)
  }

  return versions
}

function main() {
  let text
  try {
    text = readFileSync(join(root, LOCKFILE), 'utf8')
  }
  catch {
    // No lockfile (fresh clone mid-install, or a consumer without one) —
    // nothing to assert, and this check must never be the thing that fails.
    return 0
  }

  const versions = readLockfileVersions(text)
  const failures = []

  for (const family of LOCKSTEP_FAMILIES) {
    const present = family.members
      .map(name => ({ name, found: [...(versions.get(name) ?? [])].sort() }))
      .filter(entry => entry.found.length > 0)

    if (present.length === 0) continue

    const distinct = new Set(present.flatMap(entry => entry.found))
    if (distinct.size > 1) failures.push({ family, present })
  }

  if (failures.length === 0) return 0

  for (const { family, present } of failures) {
    const width = Math.max(...present.map(entry => entry.name.length))
    const expected = present.find(entry => entry.name === 'vue-i18n')?.found.join(', ')

    console.error(`\n✖ ${LOCKFILE}: "${family.name}" packages have drifted apart.\n`)
    for (const entry of present) {
      const shown = entry.found.join(', ')
      const ok = expected !== undefined && shown === expected
      console.error(`    ${entry.name.padEnd(width)}  ${shown}${ok ? '' : '   <- mismatch'}`)
    }
    console.error(
      '\n  These are published under one shared version number and are aliased'
      + '\n  globally by @nuxtjs/i18n, so a split silently downgrades the whole'
      + '\n  bundle and the production build fails with MISSING_EXPORT.'
      + '\n\n  Fix:\n',
    )
    for (const line of family.remediation) console.error(`    ${line}`)
    console.error('\n  See the header of scripts/check-lockstep-deps.mjs for why'
      + '\n  `pnpm dedupe` and pnpm `overrides` do not solve this.\n')
  }

  return 1
}

process.exit(main())
