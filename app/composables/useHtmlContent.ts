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

  /**
   * Get the default configuration for image optimization
   * Uses runtime config values for environment-specific settings
   */
  const getDefaultConfig = (): Partial<HtmlImageOptimizationConfig> => {
    const staticOrigin = config.public.static?.origin as string | undefined
    const mediaStreamOrigin = config.public.mediaStreamOrigin as string | undefined
    const mediaStreamPathConfig = config.public.mediaStreamPath as string | undefined
    const djangoUrl = config.public.djangoUrl as string | undefined

    // Extract just the path from mediaStreamPath if it contains a full URL
    // (mediaStreamPath might be set to full URL like 'http://localhost:3003/media_stream-image')
    let mediaStreamPath = '/media_stream-image'
    if (mediaStreamPathConfig) {
      if (mediaStreamPathConfig.startsWith('http://') || mediaStreamPathConfig.startsWith('https://')) {
        // Extract path from full URL
        try {
          const url = new URL(mediaStreamPathConfig)
          mediaStreamPath = url.pathname
        }
        catch {
          // Fallback: try to extract path manually
          const match = mediaStreamPathConfig.match(/https?:\/\/[^/]+(\/.*)/)
          mediaStreamPath = match?.[1] || '/media_stream-image'
        }
      }
      else {
        mediaStreamPath = mediaStreamPathConfig
      }
    }

    // Build allowed domains list - include static, media stream, and Django origins
    // TinyMCE uploads are served from Django, so we need to include it
    const allowedDomains: string[] = []
    if (staticOrigin) allowedDomains.push(staticOrigin)
    if (mediaStreamOrigin) allowedDomains.push(mediaStreamOrigin)
    if (djangoUrl) allowedDomains.push(djangoUrl)

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

    sources.forEach((src) => {
      if (shouldTransformImage(src, { ...defaultHtmlImageConfig, ...config })) {
        const optimizedSrc = buildMediaStreamUrl(
          src,
          { ...defaultHtmlImageConfig, ...config },
        )
        const link = document.createElement('link')
        link.rel = 'preload'
        link.as = 'image'
        link.href = optimizedSrc
        document.head.appendChild(link)
      }
    })
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
