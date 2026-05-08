/**
 * Agent Skills source-of-truth. The skill body strings are rendered at
 * ``/.well-known/agent-skills/<name>/SKILL.md`` and their sha256 digests
 * are emitted into ``index.json``. The leading underscore on the
 * filename keeps Nitro from picking this file up as a route.
 */
export interface AgentSkill {
  name: string
  type: 'imperative_api' | 'browser_navigation'
  description: string
  relativeUrl: string
  body: string
}

export const SKILLS: AgentSkill[] = [
  {
    name: 'webside-search',
    type: 'imperative_api',
    description: 'Search the Webside catalog (products, blog posts, categories) and open the matching results page. Available client-side via navigator.modelContext.',
    relativeUrl: '/.well-known/agent-skills/webside-search/SKILL.md',
    body: `# webside-search

Search the Webside catalog and navigate to the results page.

## How to invoke

When running inside a WebMCP-aware browser on https://webside.gr:

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
    name: 'webside-products',
    type: 'browser_navigation',
    description: 'List Webside products by category, or open a single product detail page by slug.',
    relativeUrl: '/.well-known/agent-skills/webside-products/SKILL.md',
    body: `# webside-products

Browse the Webside catalog.

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
