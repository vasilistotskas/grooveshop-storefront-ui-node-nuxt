/**
 * Whether an overlay has been opened at least once: bind it as the
 * overlay's `v-if`, on a `LazyU…` component, so its code (the Reka
 * dialog, the drawer runtime) is fetched on the first open instead of on
 * every page, and the overlay stays mounted after that.
 *
 * Unlike `useOverlayPremount`, which mounts an overlay the visitor is
 * sure to tap at idle, this is for the ones most visitors never open (the
 * shopping assistant): nothing loads until they do.
 */
export function useMountOnFirstOpen(open: Readonly<Ref<boolean>>): Readonly<Ref<boolean>> {
  const mounted = ref(open.value)
  watch(open, (isOpen) => {
    if (isOpen) mounted.value = true
  })
  return readonly(mounted)
}
