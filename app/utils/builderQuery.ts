/**
 * The editor's side of a `query` data setting: the ways a source's list can
 * be written (`mode`) and the descriptor a new one starts as. What a
 * descriptor may hold is `shared/builder/dataSources.ts`; Django refuses the
 * rest on save, so a half-written one (an empty hand-picked list, children of
 * no parent yet) shows as a problem under its field instead of reaching a page.
 */
export type BuilderQueryDescriptor = Record<string, unknown>

/** The modes a source's descriptor is written in; a source with none is just a limit. */
export const BUILDER_QUERY_MODES = {
  product: ['filter', 'picked'],
  blogPost: ['filter', 'picked'],
  category: ['roots', 'children'],
  blogCategory: [],
  promotion: [],
} as const satisfies Record<DataSource, readonly string[]>

/** A new descriptor in `mode` of `source` (the first mode when none is named), listing as many as the setting allows, up to the editor's default. */
export function builderQueryDefault(source: DataSource, mode: string | undefined, maxLimit: number): BuilderQueryDescriptor {
  const limit = Math.min(BUILDER_QUERY_DEFAULT_LIMIT, maxLimit)
  const chosen = mode ?? BUILDER_QUERY_MODES[source][0]
  if (chosen === undefined) return { limit }
  if (chosen === 'picked') return { mode: 'picked', ids: [] }
  if (chosen === 'filter') return { mode: 'filter', ordering: 'newest', limit }
  return { mode: chosen, limit }
}

/** `descriptor` with `patch` applied; a key the patch sets to `undefined` is taken out, since a descriptor is closed and an absent filter is not a null one. */
export function builderQueryPatch(descriptor: BuilderQueryDescriptor | undefined, patch: BuilderQueryDescriptor): BuilderQueryDescriptor {
  return Object.fromEntries(Object.entries({ ...descriptor, ...patch }).filter(([, value]) => value !== undefined))
}

/** The ids of a descriptor's list key, or none when it holds anything else. */
export function builderQueryIds(descriptor: BuilderQueryDescriptor | undefined, key: string): number[] {
  const value = descriptor?.[key]
  return Array.isArray(value) ? value.filter((id): id is number => typeof id === 'number') : []
}
