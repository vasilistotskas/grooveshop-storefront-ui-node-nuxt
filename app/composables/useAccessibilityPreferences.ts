/**
 * The visitor's accessibility preferences, set from the toolbar
 * (`Chrome/AccessibilityToolbar.vue`): kept in this browser's
 * localStorage and applied as classes on <html>, which
 * `app/assets/css/accessibility.css` turns into styles.
 *
 * The page is cached and identical for every visitor, so the server
 * cannot know them. `accessibilityHeadScript()` applies the stored classes
 * from the document's <head>, before the first paint; this composable
 * reads the same storage after mount and keeps both in step.
 */
export function useAccessibilityPreferences() {
  const preferences = useState<AccessibilityPreferences>('a11y-preferences', () => ({ ...ACCESSIBILITY_DEFAULTS }))

  function apply(next: AccessibilityPreferences) {
    if (!import.meta.client) return
    const root = document.documentElement
    for (const name of [...root.classList].filter(name => name.startsWith('a11y-'))) {
      root.classList.remove(name)
    }
    root.classList.add(...accessibilityClasses(next))
    try {
      localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(next))
    }
    catch {
      // Storage refused (private mode, quota): the choice holds for this page.
    }
  }

  function update(change: Partial<AccessibilityPreferences>) {
    preferences.value = { ...preferences.value, ...change }
    apply(preferences.value)
  }

  onMounted(() => {
    let raw: string | null = null
    try {
      raw = localStorage.getItem(ACCESSIBILITY_STORAGE_KEY)
    }
    catch {
      // Storage unavailable: the defaults stand.
    }
    preferences.value = parseAccessibilityPreferences(raw)
  })

  const textPercent = computed(() => ACCESSIBILITY_TEXT_SCALES[preferences.value.textScale] ?? 100)
  const canEnlarge = computed(() => preferences.value.textScale < ACCESSIBILITY_TEXT_SCALES.length - 1)
  const canShrink = computed(() => preferences.value.textScale > 0)
  const isDefault = computed(() => accessibilityClasses(preferences.value).length === 0)

  return {
    preferences: readonly(preferences),
    textPercent,
    canEnlarge,
    canShrink,
    isDefault,
    toggle: (key: AccessibilityToggle) => update({ [key]: !preferences.value[key] }),
    enlarge: () => canEnlarge.value && update({ textScale: preferences.value.textScale + 1 }),
    shrink: () => canShrink.value && update({ textScale: preferences.value.textScale - 1 }),
    reset: () => update({ ...ACCESSIBILITY_DEFAULTS }),
  }
}
