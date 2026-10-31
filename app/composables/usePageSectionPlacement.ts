import type { InjectionKey } from 'vue'

/**
 * Where a page's layout is drawn, handed from the host page to the
 * sections inside it. `top` leads the page: its first image is the LCP,
 * so a hero loads it eagerly, preloaded, at high priority. `below-content`
 * is a layout under the page's own content (the bands under a blog post):
 * the same hints would pull a below-the-fold image ahead of the page's
 * real LCP, so its sections load normally and lazily.
 */
export type PageSectionPlacement = 'top' | 'below-content'

const PAGE_SECTION_PLACEMENT: InjectionKey<PageSectionPlacement> = Symbol('page-section-placement')

export function providePageSectionPlacement(placement: PageSectionPlacement) {
  provide(PAGE_SECTION_PLACEMENT, placement)
}

/** Whether the enclosing layout leads its page: a layout drawn outside a host leads. */
export function useLeadsPage(): boolean {
  return inject(PAGE_SECTION_PLACEMENT, 'top') === 'top'
}
