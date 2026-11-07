import type { ZodObject } from 'zod'

import { DATA_SCHEMA_MARKER } from '../constants/builder'
import type { DataDeclaration, SettingsPointer } from '../types/builder'
import { markedPointers } from './markedPointers'

/** Every data setting of a block's schema (`builderField.ref` and `builderField.query` mark them), with its declaration. */
export function dataPointers(schema: ZodObject): Record<SettingsPointer, DataDeclaration> {
  return markedPointers(schema, DATA_SCHEMA_MARKER) as Record<SettingsPointer, DataDeclaration>
}
