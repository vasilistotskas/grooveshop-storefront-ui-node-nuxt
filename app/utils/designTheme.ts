import type { AppConfigInput } from 'nuxt/schema'

/** A component theme in the shape of `app.config.ts`'s `ui` key. */
export type UiTheme = NonNullable<AppConfigInput['ui']>

type ThemeNode = Record<string, unknown>

const isThemeNode = (value: unknown): value is ThemeNode =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isClassValue = (value: unknown): value is string | unknown[] =>
  typeof value === 'string' || Array.isArray(value)

/**
 * One class string, base first. Never an array: in a component with
 * slots, tailwind-variants reads an object-typed VARIANT value as a
 * per-slot map, so `size: { '3xl': [base, overlay] }` resolved to no
 * classes at all — the chip lost its size, the base theme's included.
 */
const joinClasses = (...values: unknown[]): string =>
  values.flat(Infinity).filter((value): value is string => typeof value === 'string' && value !== '').join(' ')

/**
 * Keys whose values are settings rather than classes: an overlay
 * replaces them instead of joining them.
 *
 * `colors` maps a semantic colour to a palette name and `icons` maps an
 * icon slot to an icon name — joining two of either would produce a
 * name that does not exist.
 */
const SETTING_KEYS = new Set(['colors', 'icons'])

function mergeNode(base: unknown, overlay: unknown, key: string): unknown {
  if (overlay === undefined) return base
  // Appended, so an overlay's compound variant is applied after — and
  // therefore wins over — the base's for the same conditions.
  if (key === 'compoundVariants') {
    return [...(Array.isArray(base) ? base : []), ...(overlay as unknown[])]
  }
  // Variant names, not classes: the overlay's choice replaces the base's.
  if (key === 'defaultVariants') {
    return { ...(isThemeNode(base) ? base : {}), ...(overlay as ThemeNode) }
  }
  // Two class lists are kept together; tailwind-merge resolves the
  // conflicts when the component renders, the overlay's classes last.
  if (isClassValue(base) && isClassValue(overlay)) {
    return joinClasses(base, overlay)
  }
  if (isThemeNode(base) && isThemeNode(overlay)) {
    const merged: ThemeNode = { ...base }
    for (const [childKey, childValue] of Object.entries(overlay)) {
      merged[childKey] = mergeNode(base[childKey], childValue, childKey)
    }
    return merged
  }
  // A slot written as a function replaces its classes outright (Nuxt
  // UI's "replace" form), and a value the base never had is new.
  return overlay
}

/**
 * Lay a design's component theme over the app config's `ui`, IN PLACE,
 * the way a second `app.config.ts` layer would stack on the first:
 *
 * - class strings and lists are joined into one string, the overlay's
 *   last, so tailwind-merge lets them win a conflict without dropping
 *   the base's other classes (the `tap-press` pressed state, the
 *   contrast fixes);
 * - `compoundVariants` are appended after the base's;
 * - `defaultVariants`, `colors` and `icons` entries are replaced.
 *
 * In place because the app config is reactive on the client and Nuxt
 * UI's components read `appConfig.ui.<component>` inside a `computed`:
 * replacing a component's entry re-themes every instance, while
 * replacing `ui` itself would drop what another plugin set on it.
 */
export function applyUiTheme(ui: object, overlay: UiTheme): void {
  const target = ui as ThemeNode
  for (const [component, theme] of Object.entries(overlay as ThemeNode)) {
    target[component] = SETTING_KEYS.has(component)
      ? { ...(isThemeNode(target[component]) ? target[component] : {}), ...(theme as ThemeNode) }
      : mergeNode(target[component], theme, component)
  }
}
