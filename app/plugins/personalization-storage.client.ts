/**
 * Removes what the browser keeps for personalisation whenever the visitor has
 * not agreed to it: on a withdrawal, and on load for what an earlier visit left.
 * One plugin, because the designs' banners each keep their own copy of the
 * decision and this watches the state they all write.
 */
export default defineNuxtPlugin({
  name: 'personalization-storage',
  setup() {
    const allowed = usePersonalizationConsent()
    const recentlyViewed = useRecentlyViewed()

    watch(allowed, (on) => {
      if (on) return
      recentlyViewed.clear()
      forgetSearchHistory()
    }, { immediate: true })
  },
})
