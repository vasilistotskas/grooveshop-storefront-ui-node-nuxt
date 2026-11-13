/** What a `hero_showcase` section is given: its settings, resolved. */
export interface HeroShowcaseInput {
  eyebrow?: string
  heading?: string
  headingAccent?: string
  subheading?: string
  image?: ResolvedImage
  mobileImage?: ResolvedImage
  imageDecorative?: boolean
  imageLink?: string
  showSearch?: boolean
  ctaText?: string
  ctaLink?: string
  secondaryCtaText?: string
  secondaryCtaLink?: string
  product?: ResolvedRef<ProductCard>
}

/**
 * The parts a `hero_showcase` draws, whatever its look (`PageSection/HeroShowcase`
 * and its bold look, `PageSection/HeroShowcaseBold`): the picture shown on this
 * device and what names it, the product it sells, the search, the buttons, and
 * whether there is anything to draw at all. One reading of the settings, so the
 * two looks never disagree on what a hero holds.
 *
 * A store without a catalogue gets no search and no product.
 */
export function useHeroShowcase(props: HeroShowcaseInput) {
  const linkTo = useLinkTo()
  const { isMobileOrTablet } = useDevice()
  const catalogueEnabled = useStoreFeature('catalogue')

  /** The picture a hero shows on this device, with the size a media asset carries, so its box is reserved before it loads. */
  const shown = computed(() => {
    const image = heroImage(props, isMobileOrTablet.value)
    return image?.width && image.height ? { ...image, width: image.width, height: image.height } : undefined
  })

  const headingText = computed(() => [props.heading, props.headingAccent].filter(Boolean).join(' '))

  const alt = computed(() => heroImageAlt(props, shown.value, headingText.value))

  /**
   * What the picture's link is called: the picture's description, else the
   * heading, decorative or not. A decorative picture keeps `alt=""` and names
   * its link with `aria-label` instead. With neither a description nor a
   * heading the link would have no name (WCAG 2.4.4, 4.1.2), so the picture is
   * then not a link.
   */
  const linkName = computed(() => heroImageAlt({ ...props, imageDecorative: false }, shown.value, headingText.value))
  const pictureLink = computed(() => (props.imageLink && linkName.value ? props.imageLink : undefined))

  const spotlight = computed(() =>
    catalogueEnabled.value && props.product?.status === 'ok' ? props.product.value : undefined,
  )

  const search = computed(() => !!props.showSearch && catalogueEnabled.value)

  const buttons = computed(() => [
    props.ctaText && props.ctaLink
      ? { label: props.ctaText, to: linkTo(props.ctaLink), variant: 'solid' as const }
      : null,
    props.secondaryCtaText && props.secondaryCtaLink
      ? { label: props.secondaryCtaText, to: linkTo(props.secondaryCtaLink), variant: 'outline' as const }
      : null,
  ].filter(button => button !== null))

  const hasHeading = computed(() => !!(props.heading || props.headingAccent))
  const hasCopy = computed(() => hasHeading.value || !!props.eyebrow || !!props.subheading)

  /** The right-hand column exists only when it holds something. */
  const twoColumns = computed(() => !!shown.value || !!spotlight.value)

  /** A hero with nothing to show is not a band. */
  const hasContent = computed(() => hasCopy.value || twoColumns.value || search.value || buttons.value.length > 0)

  return { shown, alt, linkName, pictureLink, spotlight, search, buttons, hasHeading, hasCopy, twoColumns, hasContent }
}
