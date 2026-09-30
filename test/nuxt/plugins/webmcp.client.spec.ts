import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import webmcpPlugin from '~/plugins/webmcp.client'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * WebMCP: a browser that exposes `navigator.modelContext` gets four
 * tools an in-tab agent can call instead of scraping the page. Each
 * tool only NAVIGATES, through the router, to a locale-aware storefront
 * path — and refuses the call when a required argument is blank.
 */
interface Tool {
  name: string
  description: string
  execute: (input: any) => Promise<unknown>
}

const run = () => (webmcpPlugin as unknown as () => void)()

describe('webmcp plugin', () => {
  let provideContext: ReturnType<typeof vi.fn>
  let push: ReturnType<typeof vi.spyOn>

  function tool(name: string): Tool {
    const { tools } = provideContext.mock.calls[0]![0] as { tools: Tool[] }
    return tools.find(t => t.name === name)!
  }

  beforeEach(() => {
    setTenant({ storeName: 'Κατάστημα Δοκιμής' })
    provideContext = vi.fn()
    Object.defineProperty(navigator, 'modelContext', { value: { provideContext }, configurable: true })
    push = vi.spyOn(useRouter(), 'push').mockResolvedValue(undefined)
  })

  afterEach(() => {
    delete (navigator as { modelContext?: unknown }).modelContext
  })

  it('offers the four storefront tools, named for the store', () => {
    run()

    const { tools } = provideContext.mock.calls[0]![0] as { tools: Tool[] }
    expect(tools.map(t => t.name)).toEqual(['search', 'open_product', 'list_categories', 'open_cart'])
    expect(tool('search').description).toContain('Κατάστημα Δοκιμής')
  })

  it('searches through the search page', async () => {
    run()

    expect(await tool('search').execute({ query: '  ηχεία  ' })).toEqual({ ok: true, navigatedTo: `/search?query=${encodeURIComponent('ηχεία')}` })
    expect(push).toHaveBeenCalledWith({ path: '/search', query: { query: 'ηχεία' } })
  })

  it.each([
    ['search', { query: '   ' }],
    ['open_product', { slug: '' }],
    ['open_product', {}],
  ])('%s refuses a blank argument without navigating', async (name, input) => {
    run()

    expect(await tool(name).execute(input)).toEqual({ error: expect.stringContaining('required') })
    expect(push).not.toHaveBeenCalled()
  })

  it('opens a product with its slug encoded into one path segment', async () => {
    run()

    await tool('open_product').execute({ slug: 'a/b c' })

    expect(push).toHaveBeenCalledWith('/products/a%2Fb%20c')
  })

  it.each([
    [{ category: 'audio' }, '/products?category=audio'],
    [{}, '/products'],
  ])('lists categories with %j → %s', async (input, target) => {
    run()

    expect(await tool('list_categories').execute(input)).toEqual({ ok: true, navigatedTo: target })
  })

  it('opens the cart', async () => {
    run()

    await tool('open_cart').execute({})

    expect(push).toHaveBeenCalledWith('/cart')
  })

  it('tolerates a draft of the API that rejects the tools', () => {
    provideContext.mockImplementation(() => { throw new TypeError('unknown member') })

    expect(run).not.toThrow()
  })
})
