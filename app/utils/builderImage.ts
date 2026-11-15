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

/**
 * The picture a hero shows on this device, by the rule every hero follows
 * (`hero_banner`, `hero_showcase`, each slide of `hero_carousel`): a phone or
 * tablet shows `mobileImage` when it is ready, since a phone frames a hero
 * differently from a desk; anything else, and a phone with no phone version,
 * shows `image`.
 */
export function heroImage(
  hero: { image?: ResolvedImage, mobileImage?: ResolvedImage },
  phone: boolean,
): ResolvedImageValue | undefined {
  const mobile = phone ? readyImage(hero.mobileImage) : undefined
  return (mobile?.path ? mobile : undefined) ?? readyImage(hero.image)
}

/**
 * The description of a hero's picture: `''` when the operator marked it
 * decorative (an explicit choice: an empty description alone never means
 * it), else the shown picture's, else the desk picture's, else `fallback`
 * (the hero's heading).
 */
export function heroImageAlt(
  hero: { image?: ResolvedImage, imageDecorative?: boolean },
  shown: ResolvedImageValue | undefined,
  fallback: string,
): string {
  return hero.imageDecorative ? '' : shown?.alt || readyImage(hero.image)?.alt || fallback
}
