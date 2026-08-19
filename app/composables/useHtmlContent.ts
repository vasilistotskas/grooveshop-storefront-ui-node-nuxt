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
    const djangoUrl = config.public.djangoUrl as string | undefined

    // Extract just the path from mediaStreamPath if it contains a full URL
    // (mediaStreamPath might be set to full URL like 'http://localhost:3003/media_stream-image')
    const mediaStreamPath = extractMediaStreamPath(config.public.mediaStreamPath as string | undefined)

    // Build allowed domains list - include static, media stream, and Django origins
    // TinyMCE uploads are served from Django, so we need to include it.
    //
    // The TENANT's own API origin has to be here too, not just the
    // platform one: a tenant's CMS images are served from its own API
    // host, so with only config.public.djangoUrl (api.webside.gr) in the
    // list they failed shouldTransformImage, skipped the media-stream
    // rewrite entirely, and shipped as unoptimised full-size originals
    // inside blog and product bodies. Same tenant-first-then-platform
    // shape as staticOrigin/mediaStreamOrigin above.
    const tenantApiOrigin = tenantStore.apiDomain
      ? `https://${tenantStore.apiDomain}`
      : undefined

    const allowedDomains: string[] = []
    if (staticOrigin) allowedDomains.push(staticOrigin)
    if (mediaStreamOrigin) allowedDomains.push(mediaStreamOrigin)
    if (tenantApiOrigin) allowedDomains.push(tenantApiOrigin)
    if (djangoUrl && djangoUrl !== tenantApiOrigin) {
      allowedDomains.push(djangoUrl)
    }

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
