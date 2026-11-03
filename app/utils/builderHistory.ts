/**
 * One line of a document's history as the panel lists it: the draft being
 * edited (`draft`, when it differs from what is live), or a stored version
 * of Django's kinds (a named save `checkpoint`, a `publish`, a `restore`).
 * `live` marks the version the store serves now.
 */
export interface BuilderHistoryRow {
  id: string
  kind: 'draft' | BuilderVersionKindEnum
  /** The version's number; absent for the draft. */
  number?: number
  /** The number of the version a `restore` put back; `null` for any other row. */
  restoredFrom: number | null
  at: string
  by: Staff | null
  note: string
  live: boolean
}

/** The rows of a day of the history: `day` is a calendar day in the reader's time zone. */
export interface BuilderHistoryDay {
  day: string
  at: string
  rows: BuilderHistoryRow[]
}

/** The history of a document, newest first: its draft when it has unpublished changes, then its versions. */
export function builderHistoryRows(
  document: Pick<DocumentDetail, 'updatedAt' | 'updatedBy' | 'publishedVersion' | 'hasUnpublishedChanges'> | undefined,
  versions: readonly VersionList[],
): BuilderHistoryRow[] {
  const draft: BuilderHistoryRow[] = document?.hasUnpublishedChanges
    ? [{ id: 'draft', kind: 'draft', restoredFrom: null, at: document.updatedAt, by: document.updatedBy, note: '', live: false }]
    : []
  return [
    ...draft,
    ...versions.map<BuilderHistoryRow>(version => ({
      id: `version-${version.number}`,
      kind: version.kind,
      number: version.number,
      restoredFrom: version.restoredFrom ?? null,
      at: version.createdAt,
      by: version.createdBy,
      note: version.note,
      live: version.number === document?.publishedVersion,
    })),
  ]
}

function dayOf(iso: string): string {
  const date = new Date(iso)
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-')
}

/** Groups rows (newest first) by the calendar day they happened on, keeping their order. */
export function groupBuilderHistoryByDay(rows: readonly BuilderHistoryRow[]): BuilderHistoryDay[] {
  const days: BuilderHistoryDay[] = []
  for (const row of rows) {
    const day = dayOf(row.at)
    const last = days.at(-1)
    if (last?.day === day) last.rows.push(row)
    else days.push({ day, at: row.at, rows: [row] })
  }
  return days
}
