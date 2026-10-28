/**
 * `useI18n()` for a component with its own `<i18n lang="yaml">` block,
 * with the store's replacement texts for that component merged over the
 * block's (`mergeStoreTexts`). Returns the component's LOCAL composer, as
 * `useI18n()` does, so `t` and `$t` read the store's wording.
 *
 * `namespace` is the component's path under `app/`, without `.vue`: the id
 * the text catalogue and the store's editor give its texts
 * (`modules/text-catalogue`). `test/unit/source-rules/store-i18n.spec.ts`
 * holds every call to the file it is in.
 *
 * Merges for the composer's locale now, and again whenever that locale
 * changes or its texts arrive. With no overrides the only cost is the
 * watcher reading the state.
 */
export function useStoreI18n(namespace: string) {
  const i18n = useI18n()
  const overrides = useTextOverrides()

  watch(
    () => overrides.value?.[i18n.locale.value]?.[namespace],
    (texts) => {
      mergeStoreTexts(i18n, i18n.locale.value, namespace, texts)
    },
    { immediate: true },
  )

  return i18n
}
