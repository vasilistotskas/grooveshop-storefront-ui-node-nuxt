/**
 * Resets the per-identity wholesale-price state on EVERY auth
 * transition (login, logout, user switch) — without this, useState
 * survives client-side navigation and a shared device keeps showing
 * the previous customer's price tier after logout, or serves user A's
 * tier to user B in the same tab.
 *
 * Watching the derived identity (rather than the auth:change hook)
 * also catches the async session restore on SWR-cached pages, which
 * flips `loggedIn` without any auth action.
 */
export default defineNuxtPlugin(() => {
  const { loggedIn, user } = useUserSession()

  const identity = computed(() =>
    loggedIn.value ? String(user.value?.id ?? 'user') : 'anon',
  )

  watch(identity, (next, previous) => {
    if (next !== previous) {
      resetB2BPricing()
    }
  })
})
