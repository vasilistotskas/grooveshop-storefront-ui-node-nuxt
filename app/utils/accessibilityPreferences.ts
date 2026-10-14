/**
 * The accessibility toolbar's preferences as data: the steps, the toggles,
 * the <html> classes they map to (`app/assets/css/accessibility.css`),
 * reading them back from storage, and the inline <head> script that
 * applies them before the first paint. The state lives in
 * `useAccessibilityPreferences`.
 */
export const ACCESSIBILITY_STORAGE_KEY = 'a11y-preferences'

/** Text size steps, in percent; the index is what is stored. */
export const ACCESSIBILITY_TEXT_SCALES = [100, 115, 130] as const

export const ACCESSIBILITY_TOGGLES = [
  'contrast',
  'grayscale',
  'links',
  'font',
  'spacing',
  'motion',
] as const

export type AccessibilityToggle = typeof ACCESSIBILITY_TOGGLES[number]

export type AccessibilityPreferences = { textScale: number } & Record<AccessibilityToggle, boolean>

export const ACCESSIBILITY_DEFAULTS: AccessibilityPreferences = {
  textScale: 0,
  ...Object.fromEntries(ACCESSIBILITY_TOGGLES.map(key => [key, false])) as Record<AccessibilityToggle, boolean>,
}

/** The <html> classes for a set of preferences. */
export function accessibilityClasses(preferences: AccessibilityPreferences): string[] {
  return [
    ...(preferences.textScale > 0 ? [`a11y-text-${preferences.textScale}`] : []),
    ...ACCESSIBILITY_TOGGLES.filter(key => preferences[key]).map(key => `a11y-${key}`),
  ]
}

/** Stored JSON, read defensively: anything unknown or malformed is the default. */
export function parseAccessibilityPreferences(raw: string | null): AccessibilityPreferences {
  let stored: unknown
  try {
    stored = raw ? JSON.parse(raw) : null
  }
  catch {
    return { ...ACCESSIBILITY_DEFAULTS }
  }
  if (!stored || typeof stored !== 'object') return { ...ACCESSIBILITY_DEFAULTS }
  const value = stored as Record<string, unknown>
  const scale = value.textScale
  return {
    textScale: typeof scale === 'number' && Number.isInteger(scale) && scale >= 0 && scale < ACCESSIBILITY_TEXT_SCALES.length ? scale : 0,
    ...Object.fromEntries(ACCESSIBILITY_TOGGLES.map(key => [key, value[key] === true])) as Record<AccessibilityToggle, boolean>,
  }
}

/**
 * The inline <head> script: the stored classes on <html> before the first
 * paint, so a visitor who chose high contrast never sees a flash of the
 * default colours. Built from the constants above, so it cannot drift
 * from them.
 */
export function accessibilityHeadScript(): string {
  return `(()=>{try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(ACCESSIBILITY_STORAGE_KEY)})||"{}"),c=document.documentElement.classList,s=p.textScale;`
    + `if(Number.isInteger(s)&&s>0&&s<${ACCESSIBILITY_TEXT_SCALES.length})c.add("a11y-text-"+s);`
    + `${JSON.stringify(ACCESSIBILITY_TOGGLES)}.forEach(function(k){if(p[k]===true)c.add("a11y-"+k)})}catch(e){}})()`
}
