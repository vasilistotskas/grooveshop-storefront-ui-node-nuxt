import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { REPO, parseScript, readSource, walkAst } from '../../helpers/sourceText'
import type { AstNode } from '../../helpers/sourceText'

/**
 * The browser logger prints a JSON line in production, never an object.
 *
 * evlog's client takes `pretty` from the public runtime config, and the
 * module writes an unset option there as `''`. The client reads only a
 * boolean as a choice and falls back to `true` otherwise, so production
 * ran its pretty console: the event as a live object after a `%c` format
 * string. A console capture prints that as `%c[client]%c error ...
 * [object Object]` (11 routes on the 2026-10-31 scan, 35 on 10-19), which
 * hides the error. `pretty: false` makes the console line the serialized
 * event, the one `serializeClientError` shapes for the transport.
 *
 * `pretty: false` must be written in `$production.evlog`, as a literal.
 */
function productionEvlog(): AstNode | undefined {
  let found: AstNode | undefined
  walkAst(parseScript(readSource(resolve(REPO, 'nuxt.config.ts'))), (node) => {
    if (node.type === 'ObjectProperty' && !node.computed && node.key.name === '$production' && node.value.type === 'ObjectExpression') {
      for (const property of node.value.properties) {
        if (property.type === 'ObjectProperty' && property.key.name === 'evlog') found = property.value
      }
    }
  })
  return found
}

describe('evlog in production', () => {
  it('sets pretty to the literal false', () => {
    const evlog = productionEvlog()
    expect(evlog, '$production.evlog must exist').toBeDefined()
    const pretty = evlog!.properties.find((property: AstNode) => property.type === 'ObjectProperty' && property.key.name === 'pretty')

    expect(pretty?.value.type).toBe('BooleanLiteral')
    expect(pretty?.value.value).toBe(false)
  })
})
