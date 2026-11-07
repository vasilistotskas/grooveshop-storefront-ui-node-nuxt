/**
 * The record picker's data: the records a link or a record setting may
 * point at, as Django's link search and labels name them
 * (`GET /api/builder/link-search`, `GET /api/builder/link-labels`).
 */

/** The kinds whose records are named by a key or slug; the others by a numeric id. */
const KEYED_KINDS: ReadonlySet<BuilderPickerKind> = new Set(['page', 'contentPage'])

/**
 * A record as a setting stores it, from a kind and an id as Django answers
 * them: a number for products, categories, posts, blog categories, offers and
 * newsletters, a key or slug for pages and content pages. `undefined` for an
 * id of the wrong type, which no setting may hold.
 */
export function builderLinkRefOf<Kind extends BuilderPickerKind>(kind: Kind, id: number | string): Extract<BuilderPickerRef, { kind: Kind }> | undefined {
  const keyed = KEYED_KINDS.has(kind)
  const valid = keyed ? typeof id === 'string' && id !== '' : typeof id === 'number' && Number.isInteger(id) && id > 0
  return valid ? { kind, id } as Extract<BuilderPickerRef, { kind: Kind }> : undefined
}

/** A record's key among the picker's choices: `<kind>:<id>`. */
export const builderRecordKey = (ref: BuilderPickerRef): string => `${ref.kind}:${ref.id}`

/** The search results, grouped by kind in the order the answer gives them. */
export function builderRecordGroups(results: readonly LinkSearchResult[]): Array<{ kind: BuilderPickerKind, results: LinkSearchResult[] }> {
  const groups = new Map<BuilderPickerKind, LinkSearchResult[]>()
  for (const result of results) {
    const group = groups.get(result.kind)
    if (group) group.push(result)
    else groups.set(result.kind, [result])
  }
  return [...groups].map(([kind, grouped]) => ({ kind, results: grouped }))
}

/** What a picker asks the labels route about one record: `{ <kind>: '<id>' }`. */
export const builderRecordLabelsQuery = (ref: BuilderPickerRef): Partial<Record<BuilderPickerKind, string>> => ({ [ref.kind]: String(ref.id) })

/** A record's label in the labels answer, or `undefined` when the answer does not name it. */
export function builderRecordLabel(labels: LinkLabelsResponse | undefined, ref: BuilderPickerRef): LinkLabel | undefined {
  return labels?.[ref.kind]?.[String(ref.id)]
}
