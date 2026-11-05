import type { BlogPostOrdering } from '../types/builderData'
import type { DataDescriptor } from './dataSources'

/** What each ordering of a band of blog posts sorts by: the fields `blog/views/post.py` declares in `ordering_fields`. */
export const BLOG_POST_ORDER_BY = {
  newest: '-publishedAt',
  mostViewed: '-viewCount',
} as const satisfies Record<BlogPostOrdering, string>

/** A rule that lists blog posts, as a document stores it. */
export type BlogPostFilterDescriptor = Extract<DataDescriptor<'blogPost'>, { mode: 'filter' }>

/**
 * A rule that lists blog posts as the question to put to Django's list
 * endpoint (`/blog/post`), its first page. The server's resolver reads that
 * page for the band, and a band that continues the same list reads the
 * following pages of it through `/api/blog/posts` with a `page`: one mapping,
 * so the pages are the pages of the same list in the same order.
 */
export function blogPostListQuery(descriptor: BlogPostFilterDescriptor) {
  return {
    pageSize: descriptor.limit,
    ordering: BLOG_POST_ORDER_BY[descriptor.ordering],
    ...(descriptor.category !== undefined && { category: descriptor.category }),
    ...(descriptor.featured !== undefined && { featured: descriptor.featured }),
  }
}
