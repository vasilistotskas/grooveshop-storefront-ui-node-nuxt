/**
 * WebMCP — exposes a small set of site tools via ``navigator.modelContext``
 * so AI agents running in a Chrome tab (or other WebMCP-aware client) can
 * search the catalog, list categories, and open product/blog pages without
 * scraping HTML. The API is an emerging draft (W3C WebMachineLearning) and
 * is feature-detected; if the browser doesn't expose ``modelContext`` we
 * silently no-op.
 */
declare global {
  interface ToolDefinition {
    name: string
    description: string
    inputSchema: Record<string, unknown>
    execute: (input: any) => unknown | Promise<unknown>
  }
  interface ModelContext {
    provideContext: (context: { tools: ToolDefinition[] }) => void
  }
  interface Navigator {
    modelContext?: ModelContext
  }
}

export default defineNuxtPlugin(() => {
  if (import.meta.server)
    return
  if (typeof navigator === 'undefined' || !navigator.modelContext)
    return

  const router = useRouter()
  const localePath = useLocalePath()

  const tools: ToolDefinition[] = [
    {
      name: 'search',
      description: 'Search the Webside catalog for products, blog posts, or categories matching a query.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Free-text search query. Greek and English are both supported.',
          },
        },
        required: ['query'],
      },
      execute: async (input: { query: string }) => {
        const query = String(input?.query || '').trim()
        if (!query)
          return { error: 'query is required' }
        await router.push({ path: localePath('/search'), query: { query } })
        return { ok: true, navigatedTo: `/search?query=${encodeURIComponent(query)}` }
      },
    },
    {
      name: 'open_product',
      description: 'Open a product detail page by its slug or numeric id.',
      inputSchema: {
        type: 'object',
        properties: {
          slug: {
            type: 'string',
            description: 'The product slug (preferred) or numeric id, taken from a search result or category listing.',
          },
        },
        required: ['slug'],
      },
      execute: async (input: { slug: string }) => {
        const slug = String(input?.slug || '').trim()
        if (!slug)
          return { error: 'slug is required' }
        await router.push(localePath(`/products/${encodeURIComponent(slug)}`))
        return { ok: true, navigatedTo: `/products/${slug}` }
      },
    },
    {
      name: 'list_categories',
      description: 'Open the products page filtered by a category slug (or the all-products listing when called with no arguments).',
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Optional category slug to filter by. Omit for the full catalog.',
          },
        },
      },
      execute: async (input: { category?: string }) => {
        const category = input?.category ? String(input.category).trim() : ''
        const target = category
          ? `/products?category=${encodeURIComponent(category)}`
          : '/products'
        await router.push(localePath(target))
        return { ok: true, navigatedTo: target }
      },
    },
    {
      name: 'open_cart',
      description: 'Open the shopping cart page.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        await router.push(localePath('/cart'))
        return { ok: true, navigatedTo: '/cart' }
      },
    },
  ]

  try {
    navigator.modelContext.provideContext({ tools })
  }
  catch {
    // WebMCP is still a draft; tolerate runtime divergence between drafts
  }
})
