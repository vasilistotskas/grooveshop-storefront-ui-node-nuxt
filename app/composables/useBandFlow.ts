import type { InjectionKey } from 'vue'

/**
 * How the bands of a page meet, handed from the shell that lays them out to
 * each band (`PageSection/Band.vue`). `ruled`, the default: each band its own
 * ground with a rule against its neighbour and padding above and below.
 * `open`: one ground with no rule between the bands, each spaced from the one
 * above by its own top padding, the way the base design's home board draws
 * them; a shell that lays bands edge to edge in that design provides it.
 */
export type BandFlow = 'ruled' | 'open'

const BAND_FLOW: InjectionKey<BandFlow> = Symbol('band-flow')

export function provideBandFlow(flow: BandFlow) {
  provide(BAND_FLOW, flow)
}

export function useBandFlow(): BandFlow {
  return inject(BAND_FLOW, 'ruled')
}
