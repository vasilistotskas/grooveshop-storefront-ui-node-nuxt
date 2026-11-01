import type { Map as MapLibreMap, MapOptions } from 'maplibre-gl'

type MapLibre = typeof import('maplibre-gl')

export type MapLibreState = 'loading' | 'ready' | 'unavailable'

/**
 * One MapLibre map on the platform basemap (`app/utils/basemap.ts`), for
 * the checkout locker map and the store-location section.
 *
 * MapLibre is imported on demand, together with its stylesheet and its
 * worker, when the container first appears: a page without a map
 * downloads none of it. The worker is emitted by Vite as a same-origin
 * `/_nuxt/` file (`?worker&url`), which is what the policy's
 * `worker-src 'self'` allows (`shared/utils/csp.ts`).
 *
 * Place names follow the page's locale, and the flavour follows the
 * colour mode: a colour-mode switch swaps the style in place and carries
 * the sources and layers `carry` names across, so a map's own data and
 * its markers survive it. A locale switch is a navigation to the other
 * locale's route, which mounts the map afresh.
 *
 * `unavailable` covers every way the map cannot draw: no maps host
 * configured (`NUXT_PUBLIC_MAPS_TILE_JSON_URL`, logged), no WebGL2
 * (`GPUInitializationError` from the constructor), or the style, tiles
 * or glyphs failing before the first frame. A tile that fails after that
 * is logged and the map stays up.
 */
export function useMapLibre(
  container: Readonly<Ref<HTMLElement | null>>,
  options: {
    /** Camera and interaction options for the constructor. */
    mapOptions: () => Partial<MapOptions>
    /** Runs once per map, after the first style load. */
    onLoad?: (map: MapLibreMap, maplibre: MapLibre) => void
    /** Sources (and the layers reading them) a style swap keeps. */
    carry?: ReadonlyArray<string>
  },
) {
  const { t, locale } = useI18n({ useScope: 'global' })
  const colorMode = useColorMode()
  const tileJsonUrl = useRuntimeConfig().public.mapsTileJsonUrl

  const map = shallowRef<MapLibreMap | null>(null)
  const state = ref<MapLibreState>(tileJsonUrl ? 'loading' : 'unavailable')
  let disposed = false

  if (!tileJsonUrl) {
    log.error({ tag: 'maps', message: 'NUXT_PUBLIC_MAPS_TILE_JSON_URL is empty: no map can render' })
  }

  const mode = computed<BasemapMode>(() => (colorMode.value === 'dark' ? 'dark' : 'light'))

  function style() {
    return buildBasemapStyle({
      tileJsonUrl,
      glyphsUrl: `${window.location.origin}/maps/fonts/{fontstack}/{range}.pbf`,
      mode: mode.value,
      lang: locale.value,
    })
  }

  // MapLibre's own control and gesture strings, in the page's language.
  function uiStrings(): Record<string, string> {
    return {
      'AttributionControl.ToggleAttribution': t('maps.attribution_toggle'),
      'GeolocateControl.FindMyLocation': t('maps.find_my_location'),
      'GeolocateControl.LocationNotAvailable': t('maps.location_not_available'),
      'Map.Title': t('maps.title'),
      'Marker.Title': t('maps.marker'),
      'NavigationControl.ZoomIn': t('maps.zoom_in'),
      'NavigationControl.ZoomOut': t('maps.zoom_out'),
      'NavigationControl.ResetBearing': t('maps.reset_bearing'),
      'Popup.Close': t('maps.popup_close'),
      'CooperativeGesturesHandler.WindowsHelpText': t('maps.gestures_windows'),
      'CooperativeGesturesHandler.MacHelpText': t('maps.gestures_mac'),
      'CooperativeGesturesHandler.MobileHelpText': t('maps.gestures_mobile'),
    }
  }

  async function create(element: HTMLElement): Promise<void> {
    const [maplibre, worker] = await Promise.all([
      import('maplibre-gl'),
      import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
      import('maplibre-gl/dist/maplibre-gl.css'),
    ])
    if (disposed || map.value) return
    maplibre.setWorkerUrl(worker.default)

    let instance: MapLibreMap
    try {
      instance = new maplibre.Map({
        ...options.mapOptions(),
        container: element,
        style: style(),
        locale: uiStrings(),
        attributionControl: { compact: false },
      })
    }
    catch (error) {
      log.warn({ tag: 'maps', message: 'map could not start', error })
      state.value = 'unavailable'
      return
    }
    map.value = instance

    instance.on('error', (event) => {
      log.warn({ tag: 'maps', message: 'map error', error: event.error })
      if (state.value === 'loading') state.value = 'unavailable'
    })
    instance.once('load', () => {
      if (state.value !== 'loading') return
      state.value = 'ready'
      options.onLoad?.(instance, maplibre)
    })
  }

  watch(container, (element) => {
    if (!element || !tileJsonUrl || map.value) return
    create(element).catch((error: unknown) => {
      log.warn({ tag: 'maps', message: 'maplibre failed to load', error })
      state.value = 'unavailable'
    })
  }, { immediate: true, flush: 'post' })

  watch(mode, () => {
    const instance = map.value
    if (!instance) return
    const carried = new Set(options.carry ?? [])
    instance.setStyle(style(), {
      transformStyle: (previous, next) => {
        if (!previous || carried.size === 0) return next
        const sources = { ...next.sources }
        for (const id of carried) {
          const source = previous.sources[id]
          if (source) sources[id] = source
        }
        const layers = previous.layers.filter(layer => 'source' in layer && carried.has(layer.source))
        return { ...next, sources, layers: [...next.layers, ...layers] }
      },
    })
  })

  onBeforeUnmount(() => {
    disposed = true
    map.value?.remove()
    map.value = null
  })

  return { map, state }
}
