import type { ZodObject } from 'zod'

import { ACTION_SCHEMA_MARKER } from '../constants/builder'
import type { SettingsPointer } from '../types/builder'
import { markedPointers } from './markedPointers'

/** Every action of a block's schema (`builderField.action` marks them): `/ctaAction`. */
export function actionPointers(schema: ZodObject): SettingsPointer[] {
  return Object.keys(markedPointers(schema, ACTION_SCHEMA_MARKER)) as SettingsPointer[]
}
