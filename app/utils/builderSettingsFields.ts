/**
 * The controls of a block's settings form, read off the same JSON Schema
 * the catalogue serves and Django validates against
 * (`blockSettingsJsonSchema`), in the schema's order. Each field names its
 * setting by path (`prompt.title`) and pointer (`/prompt/title`), and says
 * which control it needs:
 * - `text` / `textarea`: a string, a textarea once it may hold more than
 *   `BUILDER_TEXTAREA_MIN_LENGTH` characters;
 * - `choice`: one of an enum's values; `route` when every value is one of
 *   the fixed routes a link may name (`LINK_ROUTES`);
 * - `number`, `boolean`;
 * - `color`, `icon`, `url`: the shared formats (`BUILDER_FIELD_PATTERNS`);
 * - `link`: a link setting (`linkRefs`), `{ href } | { route } | { ref }`;
 * - `record`: an id of another record (`refs`, or a `builderField.ref` data setting);
 * - `media`: an id of an image of the media library, a `record` of kind `media`;
 * - `query`: a descriptor of a list to read (`builderField.query`), which the
 *   storefront resolves when the page is read;
 * - `mediaList`: a list of media ids, each entry an image of the media library
 *   (`builderField.ref('media', ...)` as the items of an array: the `*` data pointer);
 * - `list`: a list of strings;
 * - `group`: an object, with fields of its own;
 * - `richText`: HTML (`contentMediaType: text/html`).
 */
export type BuilderSettingField
  = | BuilderTextField
    | { kind: 'choice' | 'route', path: string, pointer: SettingsPointer, required: boolean, options: readonly string[] }
    | { kind: 'number', path: string, pointer: SettingsPointer, required: boolean, integer: boolean, min?: number, max?: number }
    | { kind: 'boolean' | 'color' | 'icon' | 'url' | 'link' | 'richText' | 'media', path: string, pointer: SettingsPointer, required: boolean }
    | { kind: 'record', path: string, pointer: SettingsPointer, required: boolean, refKind: BlockRefKind }
    | { kind: 'query', path: string, pointer: SettingsPointer, required: boolean, source: DataSource, maxLimit: number }
    | { kind: 'list' | 'mediaList', path: string, pointer: SettingsPointer, required: boolean, maxItems?: number }
    | { kind: 'group', path: string, pointer: SettingsPointer, required: boolean, fields: BuilderSettingField[] }

export interface BuilderTextField {
  kind: 'text' | 'textarea'
  path: string
  pointer: SettingsPointer
  required: boolean
  minLength?: number
  maxLength?: number
}

type JsonSchema = Record<string, unknown>

const isSchema = (value: unknown): value is JsonSchema => typeof value === 'object' && value !== null && !Array.isArray(value)

const numberOf = (value: unknown): number | undefined => typeof value === 'number' ? value : undefined

const FORMAT_OF_PATTERN = new Map<string, 'color' | 'icon' | 'url'>([
  [BUILDER_FIELD_PATTERNS.hexColor.source, 'color'],
  [BUILDER_FIELD_PATTERNS.icon.source, 'icon'],
  [BUILDER_FIELD_PATTERNS.httpsUrl.source, 'url'],
])

function fieldOf(
  schema: JsonSchema,
  path: string[],
  required: boolean,
  definition: Pick<BlockDefinition, 'refs' | 'linkRefs' | 'data'>,
): BuilderSettingField {
  const pointer = `/${path.join('/')}` as SettingsPointer
  const base = { path: path.join('.'), pointer, required }
  const data = definition.data[pointer]
  const refKind = data?.field === 'ref' ? data.kind : definition.refs[pointer]
  if (definition.linkRefs.includes(pointer)) return { ...base, kind: 'link' }
  if (data?.field === 'query') return { ...base, kind: 'query', source: data.source, maxLimit: data.maxLimit }
  if (refKind === 'media') return { ...base, kind: 'media' }
  if (refKind) return { ...base, kind: 'record', refKind }
  if (schema.contentMediaType === 'text/html') return { ...base, kind: 'richText' }
  if (Array.isArray(schema.enum)) {
    const options = schema.enum.map(String)
    const routes: readonly string[] = LINK_ROUTES
    return { ...base, kind: options.every(option => routes.includes(option)) ? 'route' : 'choice', options }
  }
  if (Array.isArray(schema.anyOf) && schema.anyOf.every(option => isSchema(option) && (option.type === 'number' || option.type === 'integer'))) {
    return { ...base, kind: 'number', integer: schema.anyOf.every(option => isSchema(option) && (option.type === 'integer' || Number.isInteger(option.const))) }
  }
  switch (schema.type) {
    case 'boolean':
      return { ...base, kind: 'boolean' }
    case 'number':
    case 'integer':
      return {
        ...base,
        kind: 'number',
        integer: schema.type === 'integer',
        ...(numberOf(schema.minimum) !== undefined && { min: numberOf(schema.minimum) }),
        ...(numberOf(schema.maximum) !== undefined && { max: numberOf(schema.maximum) }),
      }
    case 'array': {
      // A list whose entries are media references (the `*` data pointer): a list of images, not of strings.
      const entries = definition.data[`${pointer}/*` as SettingsPointer]
      const kind = entries?.field === 'ref' && entries.kind === 'media' ? 'mediaList' : 'list'
      return { ...base, kind, ...(numberOf(schema.maxItems) !== undefined && { maxItems: numberOf(schema.maxItems) }) }
    }
    case 'object': {
      const properties = isSchema(schema.properties) ? schema.properties : {}
      const requiredKeys = new Set(Array.isArray(schema.required) ? schema.required : [])
      return {
        ...base,
        kind: 'group',
        fields: Object.entries(properties).flatMap(([key, child]) =>
          isSchema(child) ? [fieldOf(child, [...path, key], requiredKeys.has(key), definition)] : []),
      }
    }
    default: {
      const format = typeof schema.pattern === 'string' ? FORMAT_OF_PATTERN.get(schema.pattern) : undefined
      if (format) return { ...base, kind: format }
      const maxLength = numberOf(schema.maxLength)
      const minLength = numberOf(schema.minLength)
      return {
        ...base,
        kind: maxLength !== undefined && maxLength >= BUILDER_TEXTAREA_MIN_LENGTH ? 'textarea' : 'text',
        ...(minLength !== undefined && { minLength }),
        ...(maxLength !== undefined && { maxLength }),
      }
    }
  }
}

/**
 * The fields of a block's settings form, in the order its schema declares them.
 * TRANSITIONAL (P15 stage 2): the old image settings a block still accepts
 * (`legacyImages`: the URL and its alt text) are not in the form, since their
 * media-reference successors are.
 */
export function builderSettingsFields(definition: BlockDefinition): BuilderSettingField[] {
  const root = fieldOf(blockSettingsJsonSchema(definition.schema), [], true, definition)
  const legacy = new Set((definition.legacyImages ?? []).flatMap(({ from, alt }) => [from, alt].flatMap(pointer => pointer === undefined ? [] : [`/${pointer.split('/')[1]}`])))
  return root.kind === 'group' ? root.fields.filter(field => !legacy.has(field.pointer)) : []
}

/**
 * TRANSITIONAL (P15 stage 2, with `legacyImages`): the old settings (the URL
 * or list of URLs, and its alt text) that a change to the setting at `path`
 * replaces. A node that still holds only a URL shows an empty image field,
 * and a URL left behind would come back the moment the image is cleared, so
 * choosing, changing or clearing an image takes the old settings out with it.
 */
export function builderLegacySettingsReplacedBy(definition: Pick<BlockDefinition, 'legacyImages'>, path: string): string[] {
  const name = path.split('.')[0]
  return (definition.legacyImages ?? [])
    .filter(({ to }) => to.split('/')[1] === name)
    .flatMap(({ from, alt }) => [from, alt].flatMap(pointer => pointer === undefined ? [] : [pointer.split('/')[1]!]))
}

/** Every field of a form, the fields of its groups included, depth first. */
export function flattenSettingsFields(fields: readonly BuilderSettingField[]): BuilderSettingField[] {
  return fields.flatMap(field => field.kind === 'group' ? [field, ...flattenSettingsFields(field.fields)] : [field])
}

/** The key of a fixed route's name in the editor's labels: `/` is `home`, `/account/login` is `account-login`. */
export function builderRouteLabelKey(route: string): string {
  return route === '/' ? 'home' : route.slice(1).replaceAll('/', '-')
}

/**
 * The setting of `nodeId` a problem of a refused save is about, as a path
 * (`prompt.title`), from the problem's JSON pointer into what was sent:
 * the draft's (`/sections/<id>/.../settings/prompt/title`), or, with
 * `locale`, that language's translation (`/i18n/<locale>/<id>/prompt/title`).
 * `undefined` for a problem about another node, another language, or not
 * about a setting.
 */
export function builderProblemSettingPath(pointer: string, nodeId: string, locale?: string): string | undefined {
  const segments = pointer.split('/').slice(1)
  if (segments[0] === 'i18n') {
    if (locale === undefined || segments[1] !== locale || segments[2] !== nodeId) return undefined
    // The overlay's key is itself a pointer: Django names it whole (`/title`, escaped as `~1title`) or by its segments.
    const setting = segments.slice(3).map(segment => segment.replaceAll('~1', '/').replaceAll('~0', '~')).join('/').split('/').filter(Boolean)
    return setting.length > 0 ? setting.join('.') : undefined
  }
  const at = segments.findIndex((segment, index) => segment === nodeId && segments[index + 1] === 'settings'
    && (segments[index - 1] === 'sections' || segments[index - 1] === 'blocks'))
  const rest = at < 0 ? [] : segments.slice(at + 2)
  return rest.length ? rest.join('.') : undefined
}

/** The field of a form a setting path falls under: the deepest field whose path it is, or starts with. */
export function fieldForSettingPath(fields: readonly BuilderSettingField[], path: string): BuilderSettingField | undefined {
  return flattenSettingsFields(fields)
    .filter(field => path === field.path || path.startsWith(`${field.path}.`))
    .sort((a, b) => b.path.length - a.path.length)[0]
}
