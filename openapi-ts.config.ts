import { defineConfig } from '@hey-api/openapi-ts'

// Shorthand ``'eslint'`` runs without ``--fix``, so any auto-fixable
// rule (``no-useless-escape`` on generated regexes, etc.) fails the
// whole codegen. Switch to the object form to pass ``--fix`` so
// ESLint repairs the output instead of rejecting it.
const postProcess = [
  {
    command: 'eslint',
    args: ['--fix', '{{path}}'],
  },
]

const zodPlugin = {
  name: 'zod' as const,
  requests: true,
  responses: true,
  definitions: true,
  // metadata OFF on purpose. It emitted 1686
  // `.register(z.globalRegistry, …)` calls — side effects on a
  // shared registry, which means Rollup cannot drop a single
  // schema: importing one retained all of them. That put the
  // generated file in the CLIENT bundle at 561 KB, its largest
  // module, on every page, for descriptions nothing reads.
  metadata: false,
  dates: {
    offset: true,
  },
}

const COMPONENT_PREFIX: Record<string, string> = {
  requestBodies: 'AllAuthRequest',
  parameters: 'AllAuthParameter',
  responses: 'AllAuthReply',
}

// The names of the allauth document's own definitions, one prefix per kind of
// component (`components.schemas` are prefixed by the parser below); the
// generator's `ClientOptions` is exported by both documents.
function allAuthName({ name, meta }: { name: string, meta?: { path?: readonly string[] } }): string | undefined {
  if (name === 'ClientOptions') return 'AllAuthClientOptions'
  const prefix = COMPONENT_PREFIX[meta?.path?.[1] ?? '']
  return prefix ? `${prefix}${name}` : undefined
}

// Two documents, two outputs: Django's own API (`schema.json`, fetched from
// Django) and allauth's headless API (`allauth-schema.yml`, the file Django
// commits at its repo root). Both land in the auto-imported `shared/` name
// space, so the allauth one names everything it can for allauth.
export default defineConfig([
  {
    input: './openapi/schema.json',
    output: { indexFile: false, path: './shared/openapi', postProcess },
    plugins: ['@hey-api/typescript', zodPlugin],
  },
  {
    input: './openapi/allauth-schema.yml',
    output: { indexFile: false, path: './shared/openapi-allauth', postProcess },
    // Everything the document names is prefixed so nothing can collide with a
    // Django schema or another auto-imported name (both documents have an
    // `ErrorResponse`, and the document's request bodies are called `Login`,
    // `Email`, `Phone`, ...). Operation names already say `Allauth`.
    parser: { transforms: { schemaName: (name: string) => `AllAuth${name}` } },
    plugins: [
      { name: '@hey-api/typescript', $hooks: { symbols: { getName: allAuthName } } },
      { ...zodPlugin, $hooks: { symbols: { getName: allAuthName } } },
    ],
  },
])
