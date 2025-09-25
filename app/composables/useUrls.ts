export const useUrls = () => {
  const blogPostUrl = (id: number, slug: string): string => {
    return `/blog/post/${id}/${slug}`
  }

  const blogCategoryUrl = (category: BlogCategory): string => {
    return `/blog/category/${category.id}/${category.slug}`
  }

  const blogCategoryUrlFromParts = (
    id: number,
    slug: string,
    ancestors: BlogCategory[] = [],
  ): string => {
    const pathSegments = [
      ...ancestors.map(ancestor => ancestor.slug),
      slug,
    ]

    const hierarchicalPath = pathSegments.join('/')

    return `/blog/category/${id}/${hierarchicalPath}`
  }

  const blogCategoryAncestorUrl = (category: BlogCategory): string => {
    return `/blog/category/${category.id}/${category.slug}`
  }

  const productUrl = (id: number, slug: string): string => {
    return `/products/${id}/${slug}`
  }

  return {
    blogPostUrl,
    blogCategoryUrl,
    blogCategoryUrlFromParts,
    blogCategoryAncestorUrl,
    productUrl,
  }
}
