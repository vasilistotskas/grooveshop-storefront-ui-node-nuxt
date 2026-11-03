import type { MaybeRefOrGetter } from 'vue'

/**
 * The alt text of each photograph in a product's gallery: the store's own
 * (`altText`: the alt text the merchant wrote, else the image's title),
 * else "{product name} – photo {number}", numbered by the photograph's place
 * in the gallery as the store ordered it (`useProductImages`). A generic
 * "Product image" told a screen reader and a search engine nothing.
 *
 * Every design's gallery, zoom viewer and buy bar read it, so a
 * photograph has one alt text wherever it is drawn.
 */
export function useProductImageAlt(
  images: MaybeRefOrGetter<readonly ProductImage[] | null | undefined>,
  productName: MaybeRefOrGetter<string>,
) {
  const { t } = useI18n({ useScope: 'global' })

  return (image: ProductImage | null | undefined): string => {
    if (!image) return toValue(productName)
    if (image.altText) return image.altText
    const position = (toValue(images) ?? []).findIndex(other => other.id === image.id)
    return t('product_image.alt', { name: toValue(productName), number: position + 1 || 1 })
  }
}
