/**
 * The share-card image tags of a page: the store's logo and, naming it,
 * the store. A store without a logo has no share image, so both tags are
 * removed (`null` is unhead's way to drop a meta tag), never printed
 * empty: an empty `og:image` is a broken card on every share.
 */
export function shareImageMeta(logoUrl: string, storeName: string): { ogImage: string | null, ogImageAlt: string | null } {
  return logoUrl
    ? { ogImage: logoUrl, ogImageAlt: storeName }
    : { ogImage: null, ogImageAlt: null }
}
