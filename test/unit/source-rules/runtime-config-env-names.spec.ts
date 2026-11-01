import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { REPO, parseScript, readSource, walkAst } from '../../helpers/sourceText'
import type { AstNode } from '../../helpers/sourceText'

/**
 * A `runtimeConfig` value read from `process.env` is read under the name
 * Nuxt itself overrides it from at runtime.
 *
 * `process.env.X` in `nuxt.config.ts` runs at BUILD time, where the
 * variable is usually unset. In the pod the value arrives only through
 * Nuxt's runtime override, which reads `NUXT_` plus the key's path, each
 * segment snake-cased and upper-cased: `public.mapsTileJsonUrl` is
 * `NUXT_PUBLIC_MAPS_TILE_JSON_URL`. A config read under any other name
 * looks right in the ConfigMap and in local dev, and is empty in
 * production: `NUXT_PUBLIC_MAPS_TILEJSON_URL` shipped the maps (v3.279.0)
 * with no tile host on every store, so no map rendered.
 */
const snake = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()

interface EnvRead { path: string, expected: string, actual: string }

function runtimeConfigEnvReads(): EnvRead[] {
  let runtimeConfig: AstNode | undefined
  walkAst(parseScript(readSource(resolve(REPO, 'nuxt.config.ts'))), (node) => {
    if (node.type === 'ObjectProperty' && !node.computed && node.key.name === 'runtimeConfig' && node.value.type === 'ObjectExpression') {
      runtimeConfig = node.value
    }
  })
  if (!runtimeConfig) return []
  const reads: EnvRead[] = []
  const visit = (object: AstNode, path: string[]) => {
    for (const property of object.properties) {
      if (property.type !== 'ObjectProperty' || property.computed) continue
      const key = property.key.type === 'Identifier' ? property.key.name : property.key.value
      const keyPath = [...path, key]
      if (property.value.type === 'ObjectExpression') {
        visit(property.value, keyPath)
        continue
      }
      walkAst(property.value, (node) => {
        if (
          node.type === 'MemberExpression'
          && node.object.type === 'MemberExpression'
          && node.object.object.name === 'process'
          && node.object.property.name === 'env'
          && typeof node.property.name === 'string'
          && node.property.name.startsWith('NUXT_')
        ) {
          reads.push({
            path: keyPath.join('.'),
            expected: `NUXT_${keyPath.map(snake).join('_')}`,
            actual: node.property.name,
          })
        }
      })
    }
  }
  visit(runtimeConfig, [])
  return reads
}

describe('runtimeConfig env names', () => {
  const reads = runtimeConfigEnvReads()

  it('reads the runtime config from nuxt.config.ts', () => {
    expect(reads.length).toBeGreaterThan(10)
  })

  it('reads every NUXT_ variable under the name Nuxt overrides its key from', () => {
    expect(reads.filter(({ expected, actual }) => expected !== actual)).toEqual([])
  })
})
