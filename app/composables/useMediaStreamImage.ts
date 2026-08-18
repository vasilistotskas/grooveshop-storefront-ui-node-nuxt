import { hasProtocol, joinURL } from 'ufo'

/**
 * Tenant-aware Media Stream base URL.
 *
 * ``image.providers.mediaStream.options.baseURL`` (``app/providers/media-stream.ts``)
 * is baked from ``NUXT_PUBLIC_MEDIA_STREAM_PATH`` at Nuxt build/init time —
 * @nuxt/image's provider layer has no per-request/per-tenant hook (verified
 * against @nuxt/image 2.1.0: ``resolveImage()`` only forwards ``{ provider,
 * preset }`` from component/composable call sites, never an origin
 * override; the provider's own ``defaults`` come from the STATIC
 * ``#build/image-options.mjs``). So per-tenant asset origins can't be
 * injected into the provider itself — instead this composable resolves the
 * effective base URL (tenant ``assetsDomain`` when present, else the
 * platform env origin — an infra endpoint, not a merchant credential, so
 * the env fallback is intentional) and callers absolutize ``src`` BEFORE
 * handing it to ``$img()``/``NuxtImg``. ``app/providers/media-stream.ts``
 * skips its own ``baseURL`` whenever ``src`` already carries a protocol, so
 * pre-absolutized URLs never get double-prefixed.
 */
export function useMediaStreamBaseUrl() {
  const config = useRuntimeConfig()
  const tenantStore = useTenantStore()

  return computed(() => {
    if (tenantStore.assetsDomain) {
      const pathSuffix = extractMediaStreamPath(config.public.mediaStreamPath as string | undefined)
      return `https://${tenantStore.assetsDomain}${pathSuffix}`
    }
    return (config.public.mediaStreamPath as string | undefined) || ''
  })
}

/**
 * Absolutize a relative Media Stream ``src`` (e.g.
 * ``media/{schema}/uploads/products/x.jpg``) against the tenant-aware base
 * URL. Already-absolute sources (``http://``/``https://``) pass through
 * unchanged.
 */
export function useMediaStreamSrc(src: string | undefined): string | undefined {
  const baseUrl = useMediaStreamBaseUrl()
  if (!src || hasProtocol(src)) return src
  return joinURL(baseUrl.value, src)
}

/**
 * Drop-in replacement for ``useImage()`` that absolutizes the input
 * against the tenant-aware Media Stream base URL whenever
 * ``{ provider: 'mediaStream' }`` is requested. Every other provider call
 * (``ipx``, ``none``, …) is forwarded untouched.
 */
export function useMediaStreamImage() {
  const img = useImage()
  const baseUrl = useMediaStreamBaseUrl()

  return ((input: string, modifiers?: any, options?: any) => {
    if (options?.provider === 'mediaStream' && input && !hasProtocol(input)) {
      return img(joinURL(baseUrl.value, input), modifiers, options)
    }
    return img(input, modifiers, options)
  }) as ReturnType<typeof useImage>
}
