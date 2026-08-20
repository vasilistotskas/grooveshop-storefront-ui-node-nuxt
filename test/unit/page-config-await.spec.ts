import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Every `usePageConfig()` call must be awaited.
 *
 * Nuxt registers useFetch's promise with `onServerPrefetch` and lets
 * component setup continue synchronously — the promise is awaited
 * before RENDER, not before the next statement. So an un-awaited call
 * leaves `data`/`error` null for the rest of setup on the server.
 *
 * That is silent for pages which only read `sections` (they fall back
 * to FALLBACK_LAYOUTS and render an empty band), which is precisely why
 * it went unnoticed: /, /products, /blog and /contact looked fine. But
 * the pages that turn an unpublished layout into a 404 read `data`
 * directly, so they threw 404 on EVERY server render — /about, /vision,
 * /what-is-microlearning, /why-microlearning and every custom [slug]
 * page were hard-404 on a cold cache. Stale SWR entries served from
 * before the guard existed hid it until the cache was purged.
 *
 * Asserted against source text rather than by rendering: the failure is
 * a missing keyword, and a render test would need an SSR harness to
 * reproduce the server-only timing at all.
 */
function vueFilesIn(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...vueFilesIn(full))
    else if (entry.endsWith('.vue')) out.push(full)
  }
  return out
}

describe('usePageConfig call sites', () => {
  const pagesDir = resolve(process.cwd(), 'app/pages')
  const callers = vueFilesIn(pagesDir)
    .map(file => ({ file, source: readFileSync(file, 'utf8') }))
    .filter(({ source }) => source.includes('usePageConfig('))

  it('finds the call sites at all (guards against a silent rename)', () => {
    expect(callers.length).toBeGreaterThan(0)
  })

  it.each(callers.map(c => c.file))('%s awaits usePageConfig', (file) => {
    const source = readFileSync(file, 'utf8')
    // Strip comments so prose about the bug cannot satisfy the check.
    const code = source
      .split('\n')
      .filter(line => !line.trim().startsWith('//'))
      .join('\n')

    for (const match of code.matchAll(/\S+\s*usePageConfig\(/g)) {
      expect(match[0]).toContain('await')
    }
  })
})
