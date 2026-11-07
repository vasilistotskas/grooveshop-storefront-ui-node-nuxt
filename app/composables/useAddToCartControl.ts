/**
 * An add-to-cart control apart from its drawing: whether the product can be
 * added, the click, and how a line that went in is announced. `Button/Product/AddToCart`
 * and a section's action (`useSectionAction`) both draw this one.
 *
 * `t` is the drawing's, with `toast.adding_title`, `toast.added_title`,
 * `toast.added_many`, `toast.view`, `toast.failed_title`, `toast.failed_description`.
 * With no `product`, there is nothing to add: it is disabled and the click does nothing.
 */
export function useAddToCartControl(options: {
  t: ReturnType<typeof useI18n>['t']
  product: Ref<Product | ProductCard | undefined>
  quantity: Ref<number>
}) {
  const { t, product, quantity } = options
  const { locale } = useI18n({ useScope: 'global' })
  const { getCartItemByProductId } = useCartStore()
  const toast = useToast()
  const drawer = useCartDrawer()
  const img = useMediaStreamImage()

  const productName = computed(() => {
    const current = product.value
    if (!current) return undefined
    if ('name' in current && typeof current.name === 'string') {
      return current.name
    }
    return extractTranslated(current, 'name', locale.value)
  })

  // Get the correct product ID for URLs and API calls
  // For search results (ProductMeiliSearchResult), use 'master' field
  // For regular Product objects, use 'id' field
  const productId = computed(() => {
    const current = product.value
    if (!current) return 0
    if ('master' in current && typeof current.master === 'number') {
      return current.master
    }
    return current.id
  })

  const disabled = computed(() => {
    const current = product.value
    if (!current || current.active === false) {
      return true
    }
    if (current.stock === 0 || (current.stock && quantity.value > current.stock)) {
      return true
    }
    const cartItem = getCartItemByProductId(productId.value)
    if (cartItem && cartItem.quantity && current.stock && cartItem.quantity + quantity.value > current.stock) {
      return true
    }
    return false
  })

  const { addToCart: add } = useAddToCart({
    t,
    productId,
    quantity,
    name: productName,
    onAdded: () => announceAdded(),
  })

  async function addToCart() {
    if (product.value) await add()
  }

  // Adds since the toast last opened, across every add-to-cart button.
  const addedWhileOpen = useState('cart-added-toast-count', () => 0)

  /**
   * How an added line is announced, as the boards draw it: on a desktop
   * the cart drawer opens with it; on a phone a toast shows the product's
   * photograph and "View", which opens the drawer.
   *
   * One toast, updated in place: a new toast per tap stacked up to five
   * over half a phone screen (owner review, 2026-10-16). Updating it
   * restarts its timer, so it closes a few seconds after the LAST add, and
   * counts the adds while it is open.
   */
  function announceAdded() {
    const name = productName.value ?? ''
    if (drawer.desktop.value) {
      // The drawer is the confirmation: the "Adding…" toast has done its part.
      toast.remove(CART_ADD_TOAST_ID)
      drawer.show(name)
      return
    }
    addedWhileOpen.value += 1
    const imagePath = product.value && 'mainImagePath' in product.value ? product.value.mainImagePath : undefined
    const content = {
      'title': addedWhileOpen.value > 1
        ? t('toast.added_many', { count: addedWhileOpen.value })
        : t('toast.added_title'),
      'description': name,
      'icon': imagePath ? undefined : 'i-lucide-circle-check',
      'avatar': imagePath
        ? { src: img(imagePath, { width: 96, height: 96, fit: 'cover' }, { provider: 'mediaStream' }), alt: name }
        : undefined,
      'color': 'success' as const,
      'actions': [{
        label: t('toast.view'),
        color: 'neutral' as const,
        variant: 'solid' as const,
        onClick: () => drawer.show(name),
      }],
      'onUpdate:open': (open: boolean) => {
        if (!open) addedWhileOpen.value = 0
      },
    }
    showOrUpdateToast(toast, CART_ADD_TOAST_ID, content)
  }

  return { disabled, addToCart }
}
