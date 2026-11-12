import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it } from 'vitest'
import { makeBlogAuthor, makeBlogCategory, makeBlogComment, makeBlogPost } from '../fixtures/blog'
import { validTenantConfig } from '../fixtures/tenantConfig'
import { BROWSER_ACCEPT, requestWithHost, sendJson, markupWithoutScriptsAndStyles } from '../helpers/e2e'

/**
 * Is an article's comment list in the server HTML?
 *
 * It was not: the section copied the fetched page into its list from a
 * watcher, and a server render never runs a watcher again once the request
 * resolves, so the HTML held the guest empty state and the browser replaced
 * it after hydration (a mismatch). A client-side test cannot show it, since
 * the browser does run that watcher. Only a real SSR render does, in both
 * designs: the default one and webside's own.
 *
 * Registered by test/e2e/storefront.spec.ts, on the dev server every e2e
 * suite shares; the harness is test/helpers/e2e.ts.
 */

const POST_ID = 31
const POST_SLUG = 'a-post-with-comments'
const EMPTY_POST_ID = 32
const EMPTY_POST_SLUG = 'a-post-without-comments'
const COMMENTS = [3, 2, 1].map(id => makeBlogComment({
  id,
  translations: { el: { content: `Σχόλιο του επισκέπτη ${id}` } },
  createdAt: `2026-01-0${id}T10:00:00Z`,
  updatedAt: `2026-01-0${id}T10:00:00Z`,
}))
/** The category as its detail serves it: the list's fields and the tree's. */
const CATEGORY = {
  ...makeBlogCategory(),
  children: [],
  ancestors: [],
  siblingsCount: 0,
  descendantsCount: 0,
  recursivePostCount: 1,
  categoryPath: 'news',
  treeId: 1,
  uuid: '00000000-0000-4000-8000-0000000000c1',
}
const DESIGNS = [
  ['the default design', 'blog-comments-default.localhost', 'test'],
  ['webside\'s design', 'blog-comments-webside.localhost', 'webside'],
] as const

/** A post as its detail serves it. */
function postDetail(id: number, slug: string, commentsCount: number) {
  return {
    ...makeBlogPost({ id, slug, commentsCount }),
    translations: { el: { title: 'Άρθρο', subtitle: '', body: '<p>Το κείμενο.</p>' } },
    author: makeBlogAuthor(),
    category: CATEGORY,
    likes: [],
    userHasLiked: false,
  }
}

/** The stores' upstream: a tenant with the blog and its comments on, one post with three comments; everything else falls through to the page-render stub. */
export function blogCommentsUpstream(req: IncomingMessage, res: ServerResponse, url: URL): boolean {
  const domain = url.searchParams.get('domain') ?? ''
  const host = req.headers['x-forwarded-host']
  const design = DESIGNS.find(([, designHost]) => designHost === (domain || host))
  if (!design) return false

  if (url.pathname.endsWith('/tenant/resolve')) {
    const config = validTenantConfig(domain)
    sendJson(res, validTenantConfig(domain, {
      blogEnabled: true,
      schemaName: design[2],
      features: { ...config.features, blog: true, blogComments: true },
    }))
    return true
  }
  if (url.pathname === `/api/v1/blog/post/${EMPTY_POST_ID}/comments`) {
    sendJson(res, { count: 0, links: { next: null, previous: null }, results: [] })
    return true
  }
  if (url.pathname === `/api/v1/blog/post/${EMPTY_POST_ID}`) {
    sendJson(res, postDetail(EMPTY_POST_ID, EMPTY_POST_SLUG, 0))
    return true
  }
  if (url.pathname === `/api/v1/blog/post/${POST_ID}/comments`) {
    const page = Number(url.searchParams.get('page') ?? 1)
    const size = Number(url.searchParams.get('pageSize') ?? COMMENTS.length)
    const results = COMMENTS.slice((page - 1) * size, page * size)
    sendJson(res, { count: COMMENTS.length, links: { next: page * size < COMMENTS.length ? 'https://api.example.test/api/v1/blog/post/31/comments?page=2' : null, previous: null }, results })
    return true
  }
  if (url.pathname === `/api/v1/blog/post/${POST_ID}`) {
    sendJson(res, postDetail(POST_ID, POST_SLUG, COMMENTS.length))
    return true
  }
  if (url.pathname === `/api/v1/blog/category/${CATEGORY.id}`) {
    sendJson(res, CATEGORY)
    return true
  }
  return false
}

export function describeBlogComments(): void {
  describe.each(DESIGNS)('an article\'s comments in %s', (_name, host) => {
    it('are in the HTML the server sends, under a heading that counts them', async () => {
      const page = await requestWithHost(`/blog/post/${POST_ID}/${POST_SLUG}`, host, BROWSER_ACCEPT)

      expect(page.statusCode, markupWithoutScriptsAndStyles(page.body).slice(0, 1500)).toBe(200)
      // The page payload (a script) holds the data whatever is drawn: only the markup counts.
      const html = markupWithoutScriptsAndStyles(page.body)
      for (const comment of COMMENTS) expect(html).toContain(`Σχόλιο του επισκέπτη ${comment.id}`)
      expect(html).toContain('3 σχόλια')
      expect(html).not.toContain('Συνδέσου για να γράψεις ένα σχόλιο')
    }, 120000)
  })

  describe.each(DESIGNS)('a post with no comments in %s', (_name, host) => {
    it('is sent with the guest empty state and no form: what a signed-in reader hydrates over', async () => {
      const page = await requestWithHost(`/blog/post/${EMPTY_POST_ID}/${EMPTY_POST_SLUG}`, host, BROWSER_ACCEPT)
      const html = markupWithoutScriptsAndStyles(page.body)

      expect(page.statusCode).toBe(200)
      expect(html).toContain('Συνδέσου για να γράψεις ένα σχόλιο')
      expect(html).not.toContain('add-comment-form')
    }, 120000)
  })

  describe('the comments read of a post', () => {
    const read = async (query: string) => {
      const response = await requestWithHost(`/api/blog/posts/${POST_ID}/comments?${query}`, DESIGNS[0][1], { Accept: 'application/json' })
      expect(response.statusCode, response.body.slice(0, 600)).toBe(200)
      return JSON.parse(response.body) as { results: Array<{ id: number }> }
    }

    it('answers page 2 with the older comments, not the cached page 1', async () => {
      const first = await read('page=1&pageSize=2&parent_Isnull=true')
      const second = await read('page=2&pageSize=2&parent_Isnull=true')

      expect(first.results.map(comment => comment.id)).toEqual([3, 2])
      expect(second.results.map(comment => comment.id)).toEqual([1])
    }, 120000)
  })
}
