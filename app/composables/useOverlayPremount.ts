/**
 * Mount an overlay's content once the page is idle, hidden, and keep it
 * mounted: bind `:unmount-on-hide="!premount"` on a `USlideover` / `UModal`.
 * Opening it is then a matter of showing it.
 *
 * An overlay mounts its content when it opens, by default, inside the tap
 * that opens it. For the phone menu that was most of the tap: ~360-410 ms
 * with the CPU slowed 4x, on webside and on the demo store alike, of which
 * ~280 ms was Vue mounting the panel's components. Premounted, webside's
 * tap cost ~170 ms (2026-10-19). webside fails INP in the field, and on a
 * phone the menu is a control every visitor taps. `onNuxtReady` runs the
 * mount in an idle callback after hydration, when the visitor is reading.
 *
 * Content that must not run before the overlay is open (a request it
 * makes on mount) keeps its own `v-if` on the open state.
 */
export function useOverlayPremount(): Readonly<Ref<boolean>> {
  const premount = ref(false)
  onNuxtReady(() => {
    premount.value = true
  })
  return readonly(premount)
}
