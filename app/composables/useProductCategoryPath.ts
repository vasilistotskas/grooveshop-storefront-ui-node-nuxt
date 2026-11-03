/**
 * Where a product sits in the catalogue: its category's trail from the
 * root (Charging › Power banks), built from the header menu's category
 * list, and the crumbs above the product on its page. A product without
 * a category sits under the full listing.
 *
 * Every design draws its breadcrumb, the BreadcrumbList and the
 * Product's `category` from it, so the trail a shopper sees is the one
 * search engines read.
 *
 * The category request starts when this is called; call it before the
 * product's own awaits so the two run side by side, and await `ready`
 * where the trail must be known.
 */
export function useProductCategoryPath(
  categoryId: () => number | null | undefined,
  productsLabel: () => string,
) {
  const { locale } = useI18n({ useScope: 'global' })
  const ready = useAllCategories()

  const categoryPath = computed(() => {
    const id = categoryId()
    if (!id) return []
    return categoryTrail(buildCategoryForest(ready.data.value ?? [], translatorFor(locale.value), undefined), id)
  })

  const parentCrumbs = computed(() =>
    categoryPath.value.length
      ? categoryPath.value.map(node => ({ label: node.label, to: node.to }))
      : [{ label: productsLabel(), to: '/products' }],
  )

  return { categoryPath, parentCrumbs, ready }
}
