/**
 * The store's dispatch cutoff for the product page's "order before 15:00,
 * it ships the same business day" line, in every design: the `HH:MM` the
 * typed settings carry, or `null` when the store set none, wrote something
 * that is not a clock time, or the product has no stock to dispatch.
 *
 * The cutoff is one cached public setting, so the line renders on the
 * server like the rest of the page. No "today" or "tomorrow": that needs the
 * visitor's clock and Django's holiday calendar, and the page is cached.
 *
 * @param inStock whether there is stock to promise a dispatch for
 */
export function useDispatchCutoff(inStock: MaybeRefOrGetter<boolean>) {
  const { values } = useStoreSettings()

  return computed(() =>
    toValue(inStock) ? parseDispatchCutoff(values.value?.dispatchCutoff ?? '') : null,
  )
}
