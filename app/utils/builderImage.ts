/**
 * The image a section component draws from a `media` ref setting
 * (`ResolvedImage`), or `undefined` when there is none to draw: the asset is
 * gone (`missing`), could not be read (`failed`) or was never chosen. The
 * component then draws what it draws with no image, so a deleted asset never
 * takes a section with it.
 */
export function readyImage(image: ResolvedImage | undefined): ResolvedImageValue | undefined {
  return image?.status === 'ok' ? image.value : undefined
}
