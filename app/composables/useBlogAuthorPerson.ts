/** The size of the author's photo in the Person entity: square, like the avatar it is. */
const PERSON_IMAGE_SIZE = { width: 512, height: 512 } as const

/**
 * A blog author as ONE schema.org Person, the same entity on the author's
 * page and on every post they wrote, so a search engine attributes the
 * articles to the person.
 *
 * - `@id` is `<store>/blog/author/<id>#person`, without a language prefix:
 *   the entity is the person, not a page in one language. It used to be a
 *   bare `#author` on every post (every author of a store one entity) and
 *   `<author page>#author` on the author page (the same author two).
 * - `url` is the author's page on the store, in the page's language.
 * - `image` is absolute, on the store's media origin: the raw upload path
 *   it held resolved against the page, not the media host.
 * - `sameAs` is the author's public profiles (`BlogAuthor.sameAs`), and
 *   their website when one is set.
 *
 * Call it before the caller's first await, with the author still loading:
 * it reads the i18n and tenant state through the component's injection
 * context, which an await inside a composable loses (error 26 from
 * vue-i18n). The entity is read when the page renders, and both callers
 * render only once the author has loaded (each answers 404 otherwise).
 * Returns the `@id`, for the Article's `author`.
 */
export function useBlogAuthorPerson(
  author: MaybeRefOrGetter<BlogAuthorDetail | null | undefined>,
  options: { description?: MaybeRefOrGetter<string | undefined> } = {},
): ComputedRef<string | undefined> {
  const siteConfig = useSiteConfig()
  const { locale } = useI18n({ useScope: 'global' })
  const img = useMediaStreamImage()
  const { blogAuthorUrl } = useUrls()

  const id = computed(() => {
    const value = toValue(author)
    return value ? `${siteConfig.url}${blogAuthorUrl(value.id)}#person` : undefined
  })

  const person = computed(() => {
    const value = toValue(author)
    if (!value) return {}
    const name = `${value.user.firstName || ''} ${value.user.lastName || ''}`.trim()
    const profiles = [...new Set([...value.sameAs, value.website].filter((url): url is string => !!url))]
    const photo = value.user.mainImagePath
    return {
      '@id': id.value,
      'name': name || undefined,
      'description': toValue(options.description) || undefined,
      'url': `${siteConfig.url}${localizedPath(locale.value, blogAuthorUrl(value.id))}`,
      'image': photo
        ? img(photo, { ...PERSON_IMAGE_SIZE, fit: 'cover', format: 'png' }, { provider: 'mediaStream' })
        : undefined,
      'sameAs': profiles.length ? profiles : undefined,
    }
  })

  useSchemaOrg([definePerson(person)])

  return id
}
