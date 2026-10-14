import type { MaybeElementRef } from '@vueuse/core'

/**
 * Whether an in-page copy of the EU co-funding banner (the strip above
 * the header, a footer's framed box) is on screen. The floating copy
 * shows exactly when none is, so the operation's logos are always in
 * view, and never twice.
 *
 * Each in-page copy reports itself through `track`. Until the first one
 * has been measured, `floating` stays false, so the floating copy cannot
 * flash in over a strip that is on screen but not yet observed — and on
 * the server, where nothing is observed, it never renders.
 */
export function useFundingBannerVisibility() {
  const state = useState('funding-banner-visibility', () => ({ measured: 0, onScreen: 0 }))

  const floating = computed(() => state.value.measured > 0 && state.value.onScreen === 0)

  function track(target: MaybeElementRef) {
    let measured = false
    let onScreen = false

    useIntersectionObserver(target, ([entry]) => {
      if (!entry) return
      if (!measured) {
        measured = true
        state.value.measured += 1
      }
      if (entry.isIntersecting !== onScreen) {
        onScreen = entry.isIntersecting
        state.value.onScreen += onScreen ? 1 : -1
      }
    })

    onBeforeUnmount(() => {
      if (onScreen) state.value.onScreen -= 1
      if (measured) state.value.measured -= 1
    })
  }

  return { floating, track }
}
