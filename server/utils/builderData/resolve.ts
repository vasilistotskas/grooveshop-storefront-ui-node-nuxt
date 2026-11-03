import type { RequestEvent } from 'nuxt/server'

import { QUERY_LOADERS, RECORD_LOADERS } from './loaders'
import type { LoaderContext } from './loaders'

/**
 * Runs the reads of a plan: every kind's ids in one call (a few, past
 * Django's page size) and each distinct list once, all at the same time. A
 * read that fails is logged and answered `failed`, which `applyData` keeps
 * apart from an absence: one rail's outage never hides the rest of the page,
 * and is never taken for "nothing to show".
 */
export async function readData(context: LoaderContext, plan: DataPlan): Promise<DataResolution> {
  const records = await Promise.all(DATA_RECORD_KINDS.map(async (kind): Promise<[DataRecordKind, ReadonlyMap<number, unknown> | 'failed']> => {
    const ids = plan.ids[kind]
    if (ids.length === 0) return [kind, new Map()]
    try {
      const found = await RECORD_LOADERS[kind](context, ids)
      return [kind, new Map(found.map(record => [record.id, record]))]
    }
    catch (error) {
      logFailedRead({ kind, ids: ids.length }, error)
      return [kind, 'failed']
    }
  }))
  const queries = await Promise.all([...plan.queries.values()].map(async ({ key, source, descriptor }): Promise<[string, QueryAnswer<unknown> | 'failed']> => {
    try {
      return [key, await QUERY_LOADERS[source](context, descriptor)]
    }
    catch (error) {
      logFailedRead({ source }, error)
      return [key, 'failed']
    }
  }))
  return {
    records: Object.fromEntries(records) as DataResolution['records'],
    queries: new Map(queries),
  }
}

function logFailedRead(what: Record<string, unknown>, error: unknown): void {
  log.warn({
    tag: 'builder-data',
    message: 'read failed',
    ...what,
    status: (error as { statusCode?: number })?.statusCode,
  })
}

/**
 * A document with its data settings read and applied: what a page's
 * components receive. The published page, the editor's preview and a share
 * link all go through this one function, so a preview draws what a release
 * will. `keepHidden` is the editor canvas, which keeps a node the page would
 * leave out so the merchant sees why it is empty.
 *
 * A document without data settings costs a walk and nothing else.
 */
export async function resolveBuilderData(
  event: RequestEvent,
  document: BuilderDocument,
  { keepHidden = false }: { keepHidden?: boolean } = {},
): Promise<{ document: BuilderDocument, issues: DataIssue[] }> {
  const sites = dataSites(document, builderBlocks)
  if (sites.length === 0) return { document, issues: [] }
  const resolution = await readData({ tenantHost: requestTenantHost(event), locale: requestLocale(event) }, planData(sites))
  return applyData(document, builderBlocks, resolution, { keepHidden })
}
