import type { SettingsPointer } from '../types/builder'

/** What `mapLinkSettings`' callback returns to take the link out of the settings. */
export const REMOVE_LINK: unique symbol = Symbol('remove link')

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function apply(
  value: unknown,
  segments: readonly string[],
  at: string,
  map: (link: unknown, pointer: string) => unknown,
): unknown {
  if (segments.length === 0) return map(value, at)
  const [head, ...rest] = segments as [string, ...string[]]
  if (head === '*' && Array.isArray(value)) {
    const items = value.map((item, index) => apply(item, rest, `${at}/${index}`, map))
    return items.filter(item => item !== REMOVE_LINK)
  }
  if (isObject(value) && head in value) {
    const next = apply(value[head], rest, `${at}/${head}`, map)
    if (next === value[head]) return value
    return Object.fromEntries(Object.entries(value).flatMap(([key, child]) =>
      key !== head ? [[key, child]] : next === REMOVE_LINK ? [] : [[key, next]]))
  }
  return value
}

/**
 * `settings` with every link setting (`pointers`, from `linkPointers`)
 * replaced by what `map` answers for it, or taken out when it answers
 * `REMOVE_LINK`. A setting the node does not have is not visited. Nothing is
 * mutated: a setting `map` leaves alone keeps its identity.
 *
 * `map` also gets the concrete pointer of each link (`/prompt/ctaLink`).
 */
export function mapLinkSettings<Settings>(
  settings: Settings,
  pointers: readonly SettingsPointer[],
  map: (link: unknown, pointer: string) => unknown,
): Settings {
  let result: unknown = settings
  for (const pointer of pointers) {
    result = apply(result, pointer.split('/').slice(1), '', map)
  }
  return result as Settings
}
