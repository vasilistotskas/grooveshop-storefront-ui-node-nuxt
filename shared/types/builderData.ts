import type { z } from 'zod'

import type { BlogCategory, BlogPost, ProductCard, ProductCategory, ResolvedAsset } from '../openapi/types.gen'
import type { zPublicPromotion } from '../openapi/zod.gen'
import type { BLOG_POST_ORDERINGS, PRODUCT_ORDERINGS } from '../constants/builder'
import type { DataDeclaration, DataRecordKind, DataSource } from './builder'

export type ProductOrdering = (typeof PRODUCT_ORDERINGS)[number]
export type BlogPostOrdering = (typeof BLOG_POST_ORDERINGS)[number]

/** The record each kind is read as: what a `ref` of that kind resolves to. */
export interface DataRecords {
  product: ProductCard
  blogPost: BlogPost
  category: ProductCategory
  blogCategory: BlogCategory
  /** An image of the media library: where it is served from, its size, its alt text in the page's language. */
  media: ResolvedAsset
}

/** What a list of each source holds. */
export interface DataItems extends DataRecords {
  /** As the schema parses it: the offers endpoint marks fields read-only, which the hand-shaped type does not. */
  promotion: z.output<typeof zPublicPromotion>
}

/**
 * What a section component receives for a `ref` setting: the record, or why
 * there is none. `missing` is a record the store no longer serves (deleted,
 * inactive, unpublished); `failed` is a read that did not work, which is
 * never taken for an absence.
 */
export type ResolvedRef<T> = { status: 'ok', value: T } | { status: 'missing' | 'failed' }

/**
 * What a section component receives for a `query` setting: what the descriptor
 * lists now, how many there are in all (`total`, which can be more than the
 * band shows: "see all 7 offers"), and the descriptor itself (a band names
 * itself and its "see all" link by the order it lists in). `empty` matched
 * nothing; `failed` is a read that did not work.
 */
export type ResolvedQuery<T, Descriptor = unknown> = { status: 'ok' | 'empty' | 'failed', items: readonly T[], total: number, descriptor: Descriptor }

/** Why a data setting has nothing to show. */
export type DataIssueStatus = 'missing' | 'empty' | 'failed'

/** One data setting of a document that has nothing to show, for the editor to explain. */
export interface DataIssue {
  /** The section id, then the block ids down to the node that holds the setting. */
  nodePath: readonly string[]
  /** Where in the node's settings, with list positions (`/slides/2/product`). */
  pointer: string
  declaration: DataDeclaration
  status: DataIssueStatus
}

/** A data setting of a document: where it is and what it declares. */
export interface DataSite {
  nodePath: readonly string[]
  pointer: string
  declaration: DataDeclaration
  value: unknown
}

/** A list to read, once however many settings ask for it. `key` is its canonical form. */
export interface QueryDemand {
  source: DataSource
  descriptor: unknown
  key: string
}

/** Everything a page reads: the ids of each kind (one read per kind) and each distinct list. */
export interface DataPlan {
  ids: Readonly<Record<DataRecordKind, readonly number[]>>
  queries: ReadonlyMap<string, QueryDemand>
}

/** What the reads answered. `failed` marks a read that threw: its settings resolve to `failed`, never to an absence. */
export interface DataResolution {
  records: Readonly<Record<DataRecordKind, ReadonlyMap<number, unknown> | 'failed'>>
  queries: ReadonlyMap<string, QueryAnswer<unknown> | 'failed'>
}

/**
 * How a document's data is read for the page that renders it. `keepHidden`
 * is the editor canvas, which keeps a node the page would leave out.
 * `staffHeaders` is the editor's preview alone: the staff member's
 * credentials, with which an image nobody has published is read too (the
 * published read serves only what a release uses). A published page and a
 * share link pass none, and never read an unpublished image.
 */
export interface BuilderReadOptions {
  keepHidden?: boolean
  staffHeaders?: Readonly<Record<string, string>>
  /** A share link's token: its images are read through it, since a draft can use one nobody has published. */
  shareToken?: string
}

/** What a list answers: the items it shows, and how many match in all. */
export interface QueryAnswer<Item> {
  items: readonly Item[]
  total: number
}
