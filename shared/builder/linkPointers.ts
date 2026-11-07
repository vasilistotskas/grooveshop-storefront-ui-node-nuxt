import type { ZodObject } from 'zod'

import { LINK_SCHEMA_MARKER } from '../constants/builder'
import type { SettingsPointer } from '../types/builder'
import { markedPointers } from './markedPointers'

/** Every link setting of a block's schema (`builderField.link` marks them): `/ctaLink`, `/prompt/ctaLink`, `/slides/*` for a list of links. */
export function linkPointers(schema: ZodObject): SettingsPointer[] {
  return Object.keys(markedPointers(schema, LINK_SCHEMA_MARKER)) as SettingsPointer[]
}
