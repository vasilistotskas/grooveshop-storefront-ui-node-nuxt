import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: './openapi/schema.json',
  output: {
    indexFile: false,
    path: './shared/openapi',
    // Shorthand ``'eslint'`` runs without ``--fix``, so any auto-fixable
    // rule (``no-useless-escape`` on generated regexes, etc.) fails the
    // whole codegen. Switch to the object form to pass ``--fix`` so
    // ESLint repairs the output instead of rejecting it.
    postProcess: [
      {
        command: 'eslint',
        args: ['--fix', '{{path}}'],
      },
    ],
  },
  plugins: [
    '@hey-api/typescript',
    {
      name: 'zod',
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
    },
  ],
})
