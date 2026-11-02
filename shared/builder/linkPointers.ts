import * as z from 'zod'

import { LINK_SCHEMA_MARKER } from '../constants/builder'
import type { SettingsPointer } from '../types/builder'

/**
 * The JSON pointers, within a block's settings, of every link setting its
 * schema holds (`builderField.link()` marks them): `/ctaLink`,
 * `/prompt/ctaLink`, `/slides/*` for a list of links. `*` stands for every
 * list entry, as in the catalogue's other pointers.
 *
 * Read from the schema itself, never written out beside it, so a block
 * cannot gain a link setting that Django does not check. A setting JSON
 * Schema cannot state is not this function's to refuse (it holds no link);
 * the catalogue refuses it.
 */
export function linkPointers(schema: z.ZodObject): SettingsPointer[] {
  const pointers: SettingsPointer[] = []
  const walk = (node: unknown, pointer: string): void => {
    if (typeof node !== 'object' || node === null) return
    const schemaNode = node as Record<string, unknown>
    if (schemaNode[LINK_SCHEMA_MARKER] === true) {
      pointers.push(pointer as SettingsPointer)
      return
    }
    const { properties, items } = schemaNode
    if (typeof properties === 'object' && properties !== null) {
      for (const [key, child] of Object.entries(properties)) walk(child, `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`)
    }
    if (items !== undefined) walk(items, `${pointer}/*`)
  }
  walk(z.toJSONSchema(schema, { target: 'draft-2020-12', io: 'input', unrepresentable: 'any' }), '')
  return pointers
}
