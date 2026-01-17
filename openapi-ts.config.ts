import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: './openapi/schema.json',
  output: {
    indexFile: false,
    path: './shared/openapi',
    postProcess: ['eslint'],
  },
  plugins: [
    '@hey-api/typescript',
    {
      name: 'zod',
      requests: true,
      responses: true,
      definitions: true,
      metadata: true,
      dates: {
        offset: true,
      },
    },
  ],
})
