import { describe, expect, it } from 'vitest'
import { builderHistoryRows, groupBuilderHistoryByDay } from '~/utils/builderHistory'

const version = (number: number, kind: BuilderVersionKindEnum, createdAt: string, restoredFrom: number | null = null) => ({
  id: number,
  number,
  kind,
  note: '',
  createdAt,
  createdBy: { id: 7, name: 'Maria' },
  sizeBytes: 100,
  blockTypes: [],
  catalogueHash: 'h',
  restoredFrom,
})

const document = { updatedAt: '2026-11-03T12:00:00', updatedBy: { id: 9, name: 'Nikos' }, publishedVersion: 2, hasUnpublishedChanges: true }

describe('builderHistoryRows', () => {
  it('lists the draft first when it differs from what is live, then the versions', () => {
    const rows = builderHistoryRows(document, [version(3, 'checkpoint', '2026-11-03T10:00:00'), version(2, 'publish', '2026-11-02T10:00:00')])

    expect(rows.map(row => row.id)).toEqual(['draft', 'version-3', 'version-2'])
    expect(rows[0]).toMatchObject({ kind: 'draft', by: { name: 'Nikos' } })
  })

  it('marks only the version the store serves as live', () => {
    const rows = builderHistoryRows(document, [version(3, 'checkpoint', '2026-11-03T10:00:00'), version(2, 'publish', '2026-11-02T10:00:00')])

    expect(rows.filter(row => row.live).map(row => row.number)).toEqual([2])
  })

  it('says which version a restore put back, and nothing for any other row', () => {
    const rows = builderHistoryRows({ ...document, hasUnpublishedChanges: false }, [version(5, 'restore', '2026-11-03T11:00:00', 2), version(4, 'checkpoint', '2026-11-03T10:00:00')])

    expect(rows.map(row => [row.kind, row.restoredFrom])).toEqual([['restore', 2], ['checkpoint', null]])
  })

  it('has no draft row when nothing is unpublished', () => {
    const rows = builderHistoryRows({ ...document, hasUnpublishedChanges: false }, [version(2, 'publish', '2026-11-02T10:00:00')])

    expect(rows.map(row => row.kind)).toEqual(['publish'])
  })
})

describe('groupBuilderHistoryByDay', () => {
  it('groups consecutive rows of one calendar day and keeps the order', () => {
    const rows = builderHistoryRows({ ...document, hasUnpublishedChanges: false }, [
      version(4, 'checkpoint', '2026-11-03T15:00:00'),
      version(3, 'checkpoint', '2026-11-03T10:00:00'),
      version(2, 'publish', '2026-11-01T10:00:00'),
    ])

    const days = groupBuilderHistoryByDay(rows)

    expect(days.map(day => day.rows.map(row => row.number))).toEqual([[4, 3], [2]])
  })
})
