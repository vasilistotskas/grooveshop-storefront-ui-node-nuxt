import { asSitemapUrl, defineSitemapEventHandler } from '#imports'
import type { BlogPost } from '~/types/blog/post'
import type { Pagination } from '~/types'
import type { BlogCategory } from '~/types/blog/category'

const cachedBlogPosts = defineCachedFunction(async (url: string): Promise<BlogPost[]> => {
  const fetchAllBlogPosts = async (url: string, allPosts: BlogPost[] = []): Promise<BlogPost[]> => {
    const response = await $fetch<Pagination<BlogPost>>(url, { method: 'GET' })
    const { results, links } = response

    if (results) {
      allPosts.push(...results)
    }

    if (links?.next) {
      return await fetchAllBlogPosts(links.next, allPosts)
    }

    return allPosts
  }

  return await fetchAllBlogPosts(url)
}, {
  maxAge: 60 * 60,
  name: 'cachedBlogPosts',
  getKey: (url: string) => url,
})

const cachedBlogCategories = defineCachedFunction(async (url: string): Promise<BlogCategory[]> => {
  const fetchAllBlogCategories = async (url: string, allCategories: BlogCategory[] = []): Promise<BlogCategory[]> => {
    const response = await $fetch<Pagination<BlogCategory>>(url, { method: 'GET' })
    const { results, links } = response

    if (results) {
      allCategories.push(...results)
    }

    if (links?.next) {
      return await fetchAllBlogCategories(links.next, allCategories)
    }

    return allCategories
  }

  return await fetchAllBlogCategories(url)
}, {
  maxAge: 60 * 60,
  name: 'cachedBlogCategories',
  getKey: (url: string) => url,
})

export default defineSitemapEventHandler(async () => {
  const config = useRuntimeConfig()

  const allPosts = await cachedBlogPosts(`${config.public.apiBaseUrl}/blog/post`)
  const allCategories = await cachedBlogCategories(`${config.public.apiBaseUrl}/blog/category`)

  return [
    ...allCategories.map(category => asSitemapUrl({
      loc: category.absoluteUrl,
      changefreq: 'weekly',
      priority: 0.5,
      lastmod: new Date(category.updatedAt),
    })),
    ...allPosts.map(post => asSitemapUrl({
      loc: post.absoluteUrl,
      changefreq: 'daily',
      priority: 0.8,
      lastmod: new Date(post.updatedAt),
    })),
  ]
})
