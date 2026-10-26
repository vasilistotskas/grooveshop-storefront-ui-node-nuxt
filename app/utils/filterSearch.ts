/**
 * The filter column's quick search (`Products/Sidebar`).
 *
 * The search is offered only from this many sections up. The demo store's
 * store-wide listing draws 37 (category, price, brand, 33 attributes,
 * availability), where scrolling to one attribute is the chore the search
 * removes; a category page with a handful of attributes draws 5 to 8 and
 * fits on one screen, where an input is only noise.
 */
export const FILTER_SEARCH_MIN_SECTIONS = 8

/** Whether `label` contains the query; both sides folded (`foldText`), `foldedQuery` already so. */
export function labelMatches(label: string, foldedQuery: string): boolean {
  return foldText(label).includes(foldedQuery)
}

/**
 * The options a query leaves in a brand or attribute section: those whose
 * label matches, plus every selected one, so a shopper can untick a choice
 * the query no longer names. `null` when no option's label matches — the
 * section has nothing to show for the query (a selected option alone does
 * not keep it).
 */
export function narrowOptions<T extends { label: string, selected: boolean }>(
  options: readonly T[],
  foldedQuery: string,
): T[] | null {
  if (!options.some(option => labelMatches(option.label, foldedQuery))) return null
  return options.filter(option => option.selected || labelMatches(option.label, foldedQuery))
}
