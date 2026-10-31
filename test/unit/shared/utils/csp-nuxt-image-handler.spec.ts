import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildCspDirectives } from '~~/shared/utils/csp'

const pick = (directives: string[], name: string) =>
  (directives.find(d => d.startsWith(`${name} `)) ?? '').split(/\s+/).slice(1)

const imageRuntime = join(process.cwd(), 'node_modules/@nuxt/image/dist/runtime/components')

/** The inline handler a component renders on the server, read from the installed module. */
const handlerOf = (component: string): string => {
  const source = readFileSync(join(imageRuntime, component), 'utf8')
  const match = source.match(/onerror: "([^"]+)"/)
  if (!match?.[1]) throw new Error(`${component} no longer renders an inline onerror`)
  return match[1]
}

const hashOf = (handler: string) => `'sha256-${createHash('sha256').update(handler).digest('base64')}'`

describe('@nuxt/image\'s inline onerror under a nonce policy', () => {
  it.each(['NuxtImg.vue', 'NuxtPicture.vue'])('allows the handler %s renders, by hash', (component) => {
    const attr = pick(buildCspDirectives({ dev: false, nonce: 'abc' }), 'script-src-attr')

    expect(attr).toEqual(['\'unsafe-hashes\'', hashOf(handlerOf(component))])
  })

  it('leaves the nonce-free policy alone: a hash there would disable \'unsafe-inline\'', () => {
    const directives = buildCspDirectives({ dev: false })

    expect(pick(directives, 'script-src-attr')).toEqual([])
    expect(pick(directives, 'script-src')).toContain('\'unsafe-inline\'')
  })
})
