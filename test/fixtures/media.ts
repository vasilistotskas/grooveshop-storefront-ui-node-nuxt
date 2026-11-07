import type { ResolvedImage } from '~~/shared/types/builderData'
import type { Asset, ResolvedAsset } from '~~/shared/openapi/types.gen'

/**
 * An asset as the public resolve answers it (`ResolvedAsset`), valid against
 * the generated `zResolvedAsset` (proved by `test/unit/fixtures/media.spec.ts`).
 */
export function makeResolvedAsset(overrides: Partial<ResolvedAsset> = {}): ResolvedAsset {
  return {
    id: 1,
    path: 'media/shop_a/uploads/builder/hero.jpg',
    width: 1600,
    height: 900,
    mime: 'image/jpeg',
    focalX: 0.5,
    focalY: 0.5,
    alt: 'Μια βιτρίνα',
    ...overrides,
  }
}

/**
 * An asset of the library as the staff list serves it (`Asset`), valid against
 * the generated `zAsset`: the alt text in every language of the store, and the
 * documents of the current release that use it.
 */
export function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 1,
    path: 'media/shop_a/uploads/builder/hero.jpg',
    width: 1600,
    height: 900,
    mime: 'image/jpeg',
    sizeBytes: 245_000,
    focalX: 0.5,
    focalY: 0.5,
    alt: { el: 'Μια βιτρίνα', en: 'A shop window' },
    uploadedBy: null,
    usedBy: [],
    createdAt: '2026-11-01T09:00:00+02:00',
    updatedAt: '2026-11-01T09:00:00+02:00',
    ...overrides,
  }
}

/**
 * An image a section component receives for a media setting: what the read
 * adapter makes of an old URL (`legacyImageRefs`), and all a component reads of
 * a resolved asset. TRANSITIONAL with `ResolvedImageValue`: stage 4 uses
 * `{ status: 'ok', value: makeResolvedAsset(...) }`.
 */
export function makeResolvedImage(path: string, alt = ''): ResolvedImage {
  return { status: 'ok', value: { path, alt } }
}
