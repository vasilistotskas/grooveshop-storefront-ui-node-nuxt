/** A search field on the page, in the order the fields registered. */
interface SearchField {
  id: string
  /** The header's field: it owns the shortcut whenever it is on the page. */
  header: boolean
}

/**
 * The search shortcuts (Ctrl+K / Cmd+K and "/") for ONE search field of the
 * page at a time. Every field registers here; the owner is the header's field
 * when there is one, else the first other field, and only the owner answers
 * the keys and advertises them. Before, every field registered its own, so a
 * page with the header's field and a section's (the search band, a hero)
 * opened one palette per field, stacked; with a single owner it opens one,
 * and a page whose header has no search field (a design of a store's own)
 * still has the shortcut, on its section field.
 *
 * The fields register while they set up, on the server too, so the page is
 * rendered with the owner's hint and hydrates to the same; a field that goes
 * away takes itself out and the ownership moves to the next one. A header
 * field that hydrates late (`hydrate-on-idle`) owns the shortcut from the
 * server render on and answers it once it has hydrated.
 *
 * @param header whether the field is the header's
 * @param open what the shortcut does: open this field's palette
 */
export function useSearchShortcut(header: boolean, open: () => void) {
  const fields = useState<SearchField[]>('search-shortcut-fields', () => [])
  const id = useId()

  if (!fields.value.some(field => field.id === id)) {
    fields.value = [...fields.value, { id, header }]
  }
  onBeforeUnmount(() => {
    fields.value = fields.value.filter(field => field.id !== id)
  })

  const owner = computed(() => (fields.value.find(field => field.header) ?? fields.value[0])?.id === id)

  defineShortcuts(computed(() => owner.value
    ? {
        'meta_k': { handler: open },
        '/': { usingInput: false, handler: open },
      }
    : {}))

  return { owner }
}
