import type { BlockUpgrade, SettingsPointer } from '../types/builder'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** `settings` without the key at `path` when it holds one of `values`; the same object when nothing goes. */
function without(settings: Record<string, unknown>, [key, ...rest]: string[], values: readonly string[]): Record<string, unknown> {
  if (key === undefined || !(key in settings)) return settings
  const held = settings[key]
  if (rest.length > 0) {
    return isRecord(held) ? { ...settings, [key]: without(held, rest, values) } : settings
  }
  if (typeof held !== 'string' || !values.includes(held)) return settings
  const { [key]: _, ...kept } = settings
  return kept
}

/**
 * An optional choice no longer holds the value its component draws when the
 * key is left out (storefront issue 469, held by
 * `test/unit/server/utils/builderOptionalChoices.spec.ts`): the editor's
 * "Default" is that look. This upgrade takes a stored setting that holds
 * that value out, so the node draws what it drew and validates against the
 * narrower choice. `defaults` names each setting by pointer (`/surface`, or
 * `/products/stock` inside a data setting) and the value its component
 * draws without it; any other value stays.
 */
export function upgradeLeavingOutDefaults(defaults: Readonly<Partial<Record<SettingsPointer, string | readonly string[]>>>): BlockUpgrade {
  return ({ settings, ...body }) => ({
    ...body,
    settings: Object.entries(defaults).reduce(
      (kept, [pointer, value]) => (value === undefined ? kept : without(kept, pointer.slice(1).split('/'), typeof value === 'string' ? [value] : value)),
      settings,
    ),
  })
}
