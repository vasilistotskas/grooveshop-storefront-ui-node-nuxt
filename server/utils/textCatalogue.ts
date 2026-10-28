import catalogue from '#text-catalogue'

/**
 * The text catalogue of this build (`modules/text-catalogue`), as the one
 * JSON document `GET /api/texts/catalogue` serves, rendered once.
 */
export const textCatalogueJson = JSON.stringify(catalogue)

/** The catalogue's content hash: the ETag of its JSON. */
export const textCatalogueHash = catalogue.hash

const entries = new Map(catalogue.entries.map(entry => [`${entry.namespace}\0${entry.key}`, entry]))

/** The catalogue entry of `key` in `namespace`, if the build has one. */
export function findTextEntry(namespace: string, key: string) {
  return entries.get(`${namespace}\0${key}`)
}
