/**
 * Unit tests for the tenant-aware `siteUrl` resolution shared by the
 * `.well-known/**` discovery routes (OAuth/OIDC metadata, api-catalog,
 * MCP server-card, agent-skills index). These routes are NOT bypassed in
 * 0.tenant.ts, so event.context.tenant is populated for real requests;
 * each route still falls back to getRequestHost() (prerender/edge cases)
 * and finally to the platform's runtime-config baseUrl — never to a
 * hardcoded brand literal.
 *
 * These modules import defineEventHandler/getRequestHost/setHeader/etc.
 * explicitly from 'h3' (not Nitro auto-imports), so they must be mocked
 * via vi.mock('h3') rather than vi.stubGlobal.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const hostMock = vi.fn().mockReturnValue('')
const routerParamMock = vi.fn()

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    setHeader: vi.fn(),
    getRequestHost: hostMock,
    getRouterParam: routerParamMock,
    createError: (opts: Record<string, unknown>) => new Error(String(opts.statusMessage)),
  }
})

vi.stubGlobal('useRuntimeConfig', () => ({
  public: {
    baseUrl: 'https://platform-default.example',
    djangoUrl: 'https://api.platform-default.example',
    version: '1.2.3',
    appTitle: 'Platform Default Store',
  },
}))

function makeEvent(tenant?: Record<string, unknown>) {
  return { context: tenant ? { tenant } : {} }
}

beforeEach(() => {
  hostMock.mockReturnValue('')
})

describe('.well-known/oauth-protected-resource.get.ts', () => {
  it('uses the tenant primaryDomain for resource/authorization_servers', async () => {
    const { default: handler } = await import('../../../../server/routes/.well-known/oauth-protected-resource.get')
    const result = handler(makeEvent({ primaryDomain: 'acme.example' })) as Record<string, unknown>
    expect(result.resource).toBe('https://acme.example')
    expect(result.authorization_servers).toEqual(['https://acme.example'])
  })

  it('falls back to the platform baseUrl (not a hardcoded literal) with no tenant and no host', async () => {
    const { default: handler } = await import('../../../../server/routes/.well-known/oauth-protected-resource.get')
    const result = handler(makeEvent(undefined)) as Record<string, unknown>
    expect(result.resource).toBe('https://platform-default.example')
  })
})

describe('.well-known/openid-configuration.get.ts', () => {
  it('uses the tenant primaryDomain for issuer', async () => {
    const { default: handler } = await import('../../../../server/routes/.well-known/openid-configuration.get')
    const result = handler(makeEvent({ primaryDomain: 'acme.example' })) as Record<string, unknown>
    expect(result.issuer).toBe('https://acme.example')
    expect(result.authorization_endpoint).toBe('https://api.platform-default.example/_allauth/app/v1/auth/login')
  })
})

describe('.well-known/oauth-authorization-server.get.ts', () => {
  it('uses the tenant primaryDomain for issuer', async () => {
    const { default: handler } = await import('../../../../server/routes/.well-known/oauth-authorization-server.get')
    const result = handler(makeEvent({ primaryDomain: 'acme.example' })) as Record<string, unknown>
    expect(result.issuer).toBe('https://acme.example')
  })
})

describe('.well-known/api-catalog.get.ts', () => {
  it('uses the tenant primaryDomain for the linkset anchor', async () => {
    const { default: handler } = await import('../../../../server/routes/.well-known/api-catalog.get')
    const result = handler(makeEvent({ primaryDomain: 'acme.example' })) as { linkset: Array<{ anchor: string }> }
    expect(result.linkset[0]!.anchor).toBe('https://acme.example/openapi/schema.yml')
  })
})

describe('.well-known/mcp/server-card.json.get.ts', () => {
  it('uses the tenant storeName and primaryDomain, with no hardcoded brand string', async () => {
    const { default: handler } = await import('../../../../server/routes/.well-known/mcp/server-card.json.get')
    const result = handler(makeEvent({ primaryDomain: 'acme.example', storeName: 'Acme Store' })) as {
      serverInfo: { name: string, title: string, description: string }
      documentation: string
    }
    expect(result.serverInfo.name).toBe('Acme Store')
    expect(result.serverInfo.title).toBe('Acme Store MCP')
    expect(result.serverInfo.description).not.toContain('Webside')
    expect(result.serverInfo.description).not.toContain('webside')
    expect(result.documentation).toBe('https://acme.example/llms.txt')
  })

  it('falls back to the platform appTitle when no tenant storeName is set', async () => {
    const { default: handler } = await import('../../../../server/routes/.well-known/mcp/server-card.json.get')
    const result = handler(makeEvent(undefined)) as { serverInfo: { name: string } }
    expect(result.serverInfo.name).toBe('Platform Default Store')
  })
})

describe('.well-known/agent-skills/index.json.get.ts + [name]/skill.get.ts', () => {
  it('index.json interpolates the tenant storeName into skill descriptions and URLs', async () => {
    const { default: handler } = await import('../../../../server/routes/.well-known/agent-skills/index.json.get')
    const result = handler(makeEvent({ primaryDomain: 'acme.example', storeName: 'Acme Store' })) as {
      skills: Array<{ name: string, description: string, url: string }>
    }

    expect(result.skills.map(s => s.name)).toEqual(['catalog-search', 'catalog-products'])
    for (const skill of result.skills) {
      expect(skill.description).toContain('Acme Store')
      expect(skill.description.toLowerCase()).not.toContain('webside')
      expect(skill.url.startsWith('https://acme.example/.well-known/agent-skills/')).toBe(true)
    }
  })

  it('[name]/skill.get.ts renders the skill body with the tenant storeName and siteUrl interpolated', async () => {
    const { default: handler } = await import('../../../../server/routes/.well-known/agent-skills/[name]/skill.get')
    routerParamMock.mockReturnValue('catalog-search')

    const event = makeEvent({ primaryDomain: 'acme.example', storeName: 'Acme Store' })
    const body = handler(event) as string

    expect(body).toContain('# catalog-search')
    expect(body).toContain('Search the Acme Store catalog')
    expect(body).toContain('https://acme.example')
    expect(body.toLowerCase()).not.toContain('webside')
  })
})
