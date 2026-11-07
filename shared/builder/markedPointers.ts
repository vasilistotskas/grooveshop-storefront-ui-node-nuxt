import * as z from 'zod'

import type { SettingsPointer } from '../types/builder'

/**
 * The settings of a block's schema that carry `marker`, by JSON pointer, each
 * with what the marker holds: `/products`, `/prompt/ctaLink`, and for a list a
 * `*` segment that stands for every entry, as in the catalogue's other
 * pointers. Follows `properties` and `items` and stops at a marked setting. A
 * setting JSON Schema cannot state holds no marker; the catalogue refuses it.
 *
 * Read from the schema itself, never written out beside it, so a block cannot
 * gain such a setting that Django does not check, or name one that is not.
 */
export function markedPointers(schema: z.ZodObject, marker: string): Record<SettingsPointer, unknown> {
  const found: Record<string, unknown> = {}
  const walk = (node: unknown, pointer: string): void => {
    if (typeof node !== 'object' || node === null) return
    const schemaNode = node as Record<string, unknown>
    if (schemaNode[marker] !== undefined) {
      found[pointer] = schemaNode[marker]
      return
    }
    const { properties, items } = schemaNode
    if (typeof properties === 'object' && properties !== null) {
      for (const [key, child] of Object.entries(properties)) walk(child, `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`)
    }
    if (items !== undefined) walk(items, `${pointer}/*`)
  }
  walk(z.toJSONSchema(schema, { target: 'draft-2020-12', io: 'input', unrepresentable: 'any' }), '')
  return found
}
