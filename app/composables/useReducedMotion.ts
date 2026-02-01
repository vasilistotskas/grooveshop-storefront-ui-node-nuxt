/**
 * Composable for detecting and responding to user's reduced motion preference
 *
 * This composable provides a reactive way to detect if the user has enabled
 * the "prefers-reduced-motion" setting in their operating system or browser.
 * Components can use this to disable or reduce animations accordingly.
 *
 * @example
 * ```vue
 * <script setup>
 * const { prefersReducedMotion } = useReducedMotion()
 * </script>
 *
 * <template>
 *   <div :class="{ 'no-animation': prefersReducedMotion }">
 *     Content
 *   </div>
 * </template>
 * ```
 *
 * @returns {Object} Object containing:
 *   - prefersReducedMotion: Reactive boolean indicating if reduced motion is preferred
 */
export function useReducedMotion() {
  const prefersReducedMotion = ref(false)

  // Only run on client-side
  if (import.meta.client) {
    // Check initial preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.value = mediaQuery.matches

    // Listen for changes to the preference
    const updatePreference = (event: MediaQueryListEvent) => {
      prefersReducedMotion.value = event.matches
    }

    mediaQuery.addEventListener('change', updatePreference)

    // Cleanup listener on component unmount
    onUnmounted(() => {
      mediaQuery.removeEventListener('change', updatePreference)
    })
  }

  return {
    prefersReducedMotion: readonly(prefersReducedMotion),
  }
}
