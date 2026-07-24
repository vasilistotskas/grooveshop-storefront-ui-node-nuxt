/**
 * Agent Skills source-of-truth. The skill body strings are rendered at
 * ``/.well-known/agent-skills/<name>/skill`` (no ``.md`` extension —
 * nuxt-ai-ready's middleware intercepts every ``*.md`` URL globally and
 * would 404 our skill markdown before it reaches the route handler).
 * The body is sent as ``text/markdown`` regardless of URL extension.
 * The leading underscore on this filename keeps Nitro from picking it
 * up as a route.
 *
 * ``description``/``body`` are functions of the requesting tenant (store
 * name, site URL) rather than plain strings, since this route serves every
 * tenant on the platform — the consuming route handlers resolve
 * ``SkillContext`` per-request and call these before responding.
 */
export interface SkillContext {
  storeName: string
  siteUrl: string
}

export interface AgentSkill {
  name: string
  type: 'imperative_api' | 'browser_navigation'
  description: (ctx: SkillContext) => string
  relativeUrl: string
  body: (ctx: SkillContext) => string
}

export const SKILLS: AgentSkill[] = [
  {
    name: 'catalog-search',
    type: 'imperative_api',
    description: ({ storeName }) =>
      `Search the ${storeName} catalog (products, blog posts, categories) and open the matching results page. Available client-side via navigator.modelContext.`,
    relativeUrl: '/.well-known/agent-skills/catalog-search/skill',
    body: ({ storeName, siteUrl }) => `# catalog-search

Search the ${storeName} catalog and navigate to the results page.

## How to invoke

When running inside a WebMCP-aware browser on ${siteUrl}:

\`\`\`js
await navigator.modelContext.tools.search.execute({ query: 'Greek search term' })
\`\`\`

The tool navigates the active tab to \`/search?query=<term>\`. Greek and
English search terms are both supported (Meilisearch with Greeklish
expansion runs on the backend).

## Inputs

- \`query\` (string, required) — free-text search query.

## Output

Triggers client-side router navigation to the search results page.
`,
  },
  {
    name: 'catalog-products',
    type: 'browser_navigation',
    description: ({ storeName }) =>
      `List ${storeName} products by category, or open a single product detail page by slug.`,
    relativeUrl: '/.well-known/agent-skills/catalog-products/skill',
    body: ({ storeName }) => `# catalog-products

Browse the ${storeName} catalog.

## How to invoke

Use the WebMCP \`list_categories\` tool to filter the storefront by
category slug:

\`\`\`js
await navigator.modelContext.tools.list_categories.execute({ category: 'sneakers' })
\`\`\`

Or \`open_product\` to navigate directly to a product detail page:

\`\`\`js
await navigator.modelContext.tools.open_product.execute({ slug: 'product-slug' })
\`\`\`

## Inputs

- \`category\` (string, optional) — category slug taken from the catalog.
- \`slug\` (string, required for \`open_product\`) — product slug or numeric id.

## Output

Triggers client-side router navigation.
`,
  },
]

export function findSkillByName(name: string): AgentSkill | undefined {
  return SKILLS.find(s => s.name === name)
}
