/**
 * The cart drawer's state: whether it is open, and the line that was just
 * added when an add opened it (its "Added: …" banner). Kept apart from
 * the cart store, which the frozen webside tree shares and which holds
 * the cart itself, not how one page shows it.
 *
 * The cart button opens it plain; an add-to-cart opens it with the line
 * on a desktop, and on a phone shows a toast whose "View" does
 * (`Button/Product/AddToCart.vue`). `desktop` is that split — the drawer
 * itself is a slideover there and a bottom sheet below it.
 */
export function useCartDrawer() {
  const open = useState<boolean>('cart-drawer:open', () => false)
  const added = useState<string | null>('cart-drawer:added', () => null)
  const desktop = useMediaQuery('(min-width: 1024px)')

  function show(addedName: string | null = null) {
    added.value = addedName
    open.value = true
  }

  function close() {
    open.value = false
  }

  return { open, added, desktop, show, close }
}
