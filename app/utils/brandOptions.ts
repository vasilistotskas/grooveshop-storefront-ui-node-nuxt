import type { Brand } from '~~/shared/openapi/types.gen'

/** One choice of the brand filter: a brand and how many products carry it. */
export interface BrandOption {
  /** The brand's id, as the URL's `brand` holds it. */
  id: string
  label: string
  count: number
  selected: boolean
}

/**
 * The brand filter's choices in the list's own order (by name). A brand
 * no product in the listing carries is left out — unless it is selected,
 * so it can be cleared.
 *
 * A selected id the list does not know (a link to a brand that has since
 * lost its last active product) is listed last under its id, as its chip
 * is labelled: the listing is empty because of it, and an option that can
 * be unticked is the way out.
 */
export function buildBrandOptions(
  brands: readonly Brand[],
  counts: Readonly<Record<string, number>>,
  selected: readonly string[],
): BrandOption[] {
  const known = new Set(brands.map(brand => String(brand.id)))
  const unknown = selected
    .filter(id => !known.has(id))
    .map(id => ({ id, label: id, count: counts[id] ?? 0, selected: true }))

  return [
    ...brands
      .map(brand => ({
        id: String(brand.id),
        label: brand.name,
        count: counts[brand.id] ?? 0,
        selected: selected.includes(String(brand.id)),
      }))
      .filter(option => option.count > 0 || option.selected),
    ...unknown,
  ]
}
