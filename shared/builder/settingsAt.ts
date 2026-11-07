import type { SettingsPointer } from '../types/builder'

/** What `mapSettingsAt`'s callback returns to take the setting out. */
export const REMOVE_SETTING: unique symbol = Symbol('remove setting')

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function apply(
  value: unknown,
  segments: readonly string[],
  at: string,
  map: (setting: unknown, pointer: string) => unknown,
): unknown {
  if (segments.length === 0) return map(value, at)
  const [head, ...rest] = segments as [string, ...string[]]
  if (head === '*' && Array.isArray(value)) {
    const items = value.map((item, index) => apply(item, rest, `${at}/${index}`, map))
    return items.filter(item => item !== REMOVE_SETTING)
  }
  if (isObject(value) && head in value) {
    const next = apply(value[head], rest, `${at}/${head}`, map)
    if (next === value[head]) return value
    return Object.fromEntries(Object.entries(value).flatMap(([key, child]) =>
      key !== head ? [[key, child]] : next === REMOVE_SETTING ? [] : [[key, next]]))
  }
  return value
}

/**
 * `settings` with every setting at `pointers` (from `linkPointers`, say)
 * replaced by what `map` answers for it, or taken out when it answers
 * `REMOVE_SETTING`. A setting the node does not have is not visited. Nothing is
 * mutated: a setting `map` leaves alone keeps its identity.
 *
 * `map` also gets the concrete pointer of each setting (`/prompt/ctaLink`).
 */
export function mapSettingsAt<Settings>(
  settings: Settings,
  pointers: readonly SettingsPointer[],
  map: (setting: unknown, pointer: string) => unknown,
): Settings {
  let result: unknown = settings
  for (const pointer of pointers) {
    result = apply(result, pointer.split('/').slice(1), '', map)
  }
  return result as Settings
}
