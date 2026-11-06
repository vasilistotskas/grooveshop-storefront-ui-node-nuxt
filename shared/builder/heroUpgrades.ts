import type { BlockUpgrade } from '../types/builder'

/**
 * Version 1 of a hero slide named its product `productId`, the id the
 * storefront looked up itself; version 2 states it as the record it is
 * (`product`, a data setting the page route resolves), so the setting no
 * longer says "id" about something the component receives as a product.
 */
export const upgradeHeroSlide: BlockUpgrade = ({ settings, ...body }) => {
  const { productId, ...kept } = settings
  return { ...body, settings: { ...kept, ...(productId !== undefined && { product: productId }) } }
}
