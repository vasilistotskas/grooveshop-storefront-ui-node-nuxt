import * as z from 'zod'

import { DATA_SCHEMA_MARKER } from '../constants/builder'
import type { DataDeclaration, SettingsPointer } from '../types/builder'

/**
 * The data settings of a block's schema, by JSON pointer: every setting
 * `builderField.ref` or `builderField.query` marked, with its declaration
 * (`/products`; for a list, a `*` segment stands for every entry, as in the
 * catalogue's other pointers).
 *
 * Read from the schema itself, never written out beside it, so a block cannot
 * gain a data setting that Django does not check, or name one that is not.
 */
export function dataPointers(schema: z.ZodObject): Record<SettingsPointer, DataDeclaration> {
  const found: Record<string, DataDeclaration> = {}
  const walk = (node: unknown, pointer: string): void => {
    if (typeof node !== 'object' || node === null) return
    const schemaNode = node as Record<string, unknown>
    const declaration = schemaNode[DATA_SCHEMA_MARKER]
    if (typeof declaration === 'object' && declaration !== null) {
      found[pointer] = declaration as DataDeclaration
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
