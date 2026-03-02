const FALLBACK_LAYOUTS: Record<string, PageSection[]> = {
  home: [
    { id: 0, uuid: 'fallback-hero-carousel', componentType: 'hero_carousel', title: '', isVisible: true, props: {}, sortOrder: 0 },
    { id: 0, uuid: 'fallback-featured-products', componentType: 'featured_products', title: '', isVisible: true, props: { pageSize: 8 }, sortOrder: 1 },
    { id: 0, uuid: 'fallback-product-categories', componentType: 'product_categories', title: '', isVisible: true, props: {}, sortOrder: 2 },
  ],
}

export function usePageConfig(pageType: string) {
  const { data, status, error } = useFetch<PageLayoutResponse>(
    `/api/page-config/${pageType}`,
    { key: `page-config-${pageType}` },
  )

  const sections = computed<PageSection[]>(() => {
    if (data.value?.isPublished && data.value.sections) {
      return data.value.sections
        .filter(s => s.isVisible)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    }
    return FALLBACK_LAYOUTS[pageType] ?? []
  })

  return { data, sections, status, error }
}
