import catalogue from '#text-catalogue'

/** What `GET /api/texts/catalogue` serves for one store: its entries and the hash of them. */
export interface TextCatalogueDocument {
  hash: string
  json: string
}

const entries = new Map(catalogue.entries.map(entry => [`${entry.namespace}\0${entry.key}`, entry]))

/**
 * The view of `schema`: its own when the build has one (a store with a
 * variant tree), the default one for any other name. Schemas are tenant
 * data the storefront does not know, so an unknown one is a store like
 * the rest, never an error.
 */
function viewNameOf(schema: string): string {
  return Object.hasOwn(catalogue.views, schema) ? schema : DEFAULT_TEXT_VIEW
}

const rendered = new Map(Object.entries(catalogue.views).map(([name, view]) => [name, new Set(view.namespaces)]))

const documents = new Map<string | undefined, TextCatalogueDocument>()

/**
 * The catalogue of this build (`modules/text-catalogue`) as the JSON
 * `GET /api/texts/catalogue` serves, rendered once per view. Without
 * `schema` it is every text of the build (for tooling); with it, only what
 * that store's storefront renders, plus `global`.
 */
export function textCatalogueDocument(schema?: string): TextCatalogueDocument {
  const name = schema === undefined ? undefined : viewNameOf(schema)
  let document = documents.get(name)
  if (!document) {
    const shown = name === undefined
      ? catalogue.entries
      : catalogue.entries.filter(({ namespace }) => namespace === GLOBAL_TEXT_NAMESPACE || rendered.get(name)!.has(namespace))
    const hash = name === undefined ? catalogue.hash : catalogue.views[name]!.hash
    document = { hash, json: JSON.stringify({ hash, locales: catalogue.locales, entries: shown }) }
    documents.set(name, document)
  }
  return document
}

/**
 * The catalogue entry of `key` in `namespace`, if the build has one and,
 * given a `schema`, that store renders the namespace.
 */
export function findTextEntry(namespace: string, key: string, schema?: string) {
  if (schema !== undefined && namespace !== GLOBAL_TEXT_NAMESPACE && !rendered.get(viewNameOf(schema))!.has(namespace)) {
    return undefined
  }
  return entries.get(`${namespace}\0${key}`)
}
