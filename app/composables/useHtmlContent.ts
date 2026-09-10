/**
 * Composable for transforming HTML content with optimized images
 *
 * Provides reactive HTML transformation using the media stream provider
 * for images embedded in CMS content (TinyMCE, etc.)
 *
 * @example
 * ```vue
 * <script setup>
 * const { transformImages, optimizedHtml } = useHtmlContent()
 *
 * // Option 1: Transform on-demand
 * const blogBody = computed(() => transformImages(rawHtml.value))
 *
 * // Option 2: Use reactive wrapper
 * const { html: optimizedBody } = optimizedHtml(rawHtml)
 * </script>
 *
 * <template>
 *   <div v-html="optimizedBody" />
 * </template>
 * ```
 */
export function useHtmlContent() {
  const config = useRuntimeConfig()
  const tenantStore = useTenantStore()

  /**
   * Get the default configuration for image optimization
   * Uses runtime config values for environment-specific settings, preferring
   * the tenant's own assets/static origins when present (platform env
   * values remain the infra fallback).
   */
  const getDefaultConfig = (): Partial<HtmlImageOptimizationConfig> => {
    const staticOrigin = tenantStore.staticDomain
      ? `https://${tenantStore.staticDomain}`
      : config.public.static?.origin as string | undefined
    const mediaStreamOrigin = tenantStore.assetsDomain
      ? `https://${tenantStore.assetsDomain}`
      : config.public.mediaStreamOrigin as string | undefined
    // TinyMCE uploads are served from Django, so the API origin is an
    // image source too. The TENANT's own API host is the one that
    // matters (a tenant's CMS images live on its own API host, so
    // without it they failed shouldTransformImage and shipped as
    // unoptimised originals inside blog and product bodies); the
    // platform env value only covers a request with no resolved
    // tenant, and is never listed beside a tenant's — another store's
    // origin has no place in this tenant's image allowlist.
    const apiOrigin = tenantStore.apiDomain
      ? `https://${tenantStore.apiDomain}`
      : config.public.djangoUrl as string | undefined

    // Extract just the path from mediaStreamPath if it contains a full URL
    // (mediaStreamPath might be set to full URL like 'http://localhost:3003/media_stream-image')
    const mediaStreamPath = extractMediaStreamPath(config.public.mediaStreamPath as string | undefined)

    const allowedDomains: string[] = []
    if (staticOrigin) allowedDomains.push(staticOrigin)
    if (mediaStreamOrigin) allowedDomains.push(mediaStreamOrigin)
    if (apiOrigin) allowedDomains.push(apiOrigin)

    return {
      mediaStreamOrigin: mediaStreamOrigin || '',
      mediaStreamPath,
      allowedDomains,
      format: 'avif',
      quality: 80,
      addLazyLoading: true,
      addAsyncDecoding: true,
    }
  }

  /**
   * Transform images in HTML content to use optimized URLs
   *
   * @param html - Raw HTML content
   * @param overrides - Optional config overrides
   * @returns Transformed HTML with optimized image URLs
   */
  const transformImages = (
    html: string,
    overrides?: Partial<HtmlImageOptimizationConfig>,
  ): string => {
    const mergedConfig = {
      ...getDefaultConfig(),
      ...overrides,
    }
    return transformHtmlImages(html, mergedConfig)
  }

  /**
   * Create a reactive computed that transforms HTML images
   *
   * @param source - Reactive source (ref, computed, or getter function)
   * @param overrides - Optional config overrides
   * @returns Object with reactive `html` property
   */
  const optimizedHtml = (
    source: Ref<string> | ComputedRef<string> | (() => string),
    overrides?: Partial<HtmlImageOptimizationConfig>,
  ) => {
    const html = computed(() => {
      const rawHtml = typeof source === 'function' ? source() : source.value
      return transformImages(rawHtml, overrides)
    })

    return { html }
  }

  /**
   * Transform images with custom domain allowlist
   * Useful when content may come from multiple sources
   */
  const transformImagesFromDomains = (
    html: string,
    domains: string[],
    overrides?: Partial<Omit<HtmlImageOptimizationConfig, 'allowedDomains'>>,
  ): string => {
    return transformImages(html, {
      ...overrides,
      allowedDomains: domains,
    })
  }

  /**
   * Extract image sources from HTML for preloading
   */
  const getImageSources = (html: string): string[] => {
    return extractImageSources(html)
  }

  /**
   * Preload images from HTML content
   * Useful for above-the-fold content
   */
  const preloadImages = (html: string, limit = 3): void => {
    if (!import.meta.client) return

    const sources = getImageSources(html).slice(0, limit)
    const config = getDefaultConfig()

    const links = sources
      .filter(src => shouldTransformImage(src, { ...defaultHtmlImageConfig, ...config }))
      .map(src => ({
        rel: 'preload' as const,
        as: 'image' as const,
        href: buildMediaStreamUrl(src, { ...defaultHtmlImageConfig, ...config }),
      }))

    if (links.length) {
      useHead({ link: links })
    }
  }

  return {
    transformImages,
    optimizedHtml,
    transformImagesFromDomains,
    getImageSources,
    preloadImages,
    getDefaultConfig,
  }
}
