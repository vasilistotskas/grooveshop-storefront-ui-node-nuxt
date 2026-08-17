import { defineEventHandler, getRequestHost, setHeader } from 'h3'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const tenant = event.context.tenant as TenantConfig | undefined
  const host = getRequestHost(event, { xForwardedHost: false })
  const tenantDomain = tenant?.primaryDomain || host
  const siteUrl = tenantDomain ? `https://${tenantDomain}` : (config.public.baseUrl as string)
  const storeName = tenant?.storeName || (config.public.appTitle as string)

  setHeader(event, 'content-type', 'application/json')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return {
    $schema: 'https://modelcontextprotocol.io/schemas/server-card.json',
    serverInfo: {
      name: storeName,
      version: (config.public.version as string) || '1.0.0',
      title: `${storeName} MCP`,
      description: `Shopping tools for ${storeName} (e-commerce storefront): catalog search, cart, checkout handoff, and order tracking.`,
    },
    transport: {
      type: 'http',
      url: `${siteUrl}/mcp`,
    },
    capabilities: {
      tools: {
        search_products: {
          description: 'Search the catalog by free text with category/price filters.',
        },
        get_product: {
          description: 'Product details, VAT-inclusive price, live stock, variants.',
        },
        list_categories: {
          description: 'Product category tree.',
        },
        get_trending_searches: {
          description: 'Popular search queries (last 24h).',
        },
        get_product_reviews: {
          description: 'Rating summary and recent review comments.',
        },
        get_shipping_options: {
          description: 'Delivery methods, prices, free-shipping thresholds.',
        },
        find_pickup_points: {
          description: 'ACS Smartpoint and BOX NOW lockers near a postal code.',
        },
        get_payment_methods: {
          description: 'Accepted payment methods and fees.',
        },
        create_cart: {
          description: 'Guest cart management.',
        },
        get_cart: {
          description: 'Guest cart management.',
        },
        add_to_cart: {
          description: 'Guest cart management.',
        },
        update_cart_item: {
          description: 'Guest cart management.',
        },
        remove_cart_item: {
          description: 'Guest cart management.',
        },
        get_checkout_link: {
          description: 'Hand the shopper to the store\'s checkout.',
        },
        track_order: {
          description: 'Order status by UUID.',
        },
        subscribe_product_alert: {
          description: 'Restock and price-drop email alerts.',
        },
        create_checkout: {
          description: 'UCP checkout sessions (agentic checkout).',
        },
        update_checkout: {
          description: 'UCP checkout sessions (agentic checkout).',
        },
        complete_checkout: {
          description: 'UCP checkout sessions (agentic checkout).',
        },
        my_orders: {
          description: 'Linked account\'s recent orders (OAuth, orders:read scope).',
        },
        my_loyalty_points: {
          description: 'Linked account\'s loyalty points and tier (OAuth, loyalty:read scope).',
        },
        my_favourites: {
          description: 'Linked account\'s favourite products (OAuth, favourites:read scope).',
        },
      },
    },
    // Account linking: OAuth 2.1 authorization-code + PKCE. Discovery via
    // RFC 9728 metadata at /.well-known/oauth-protected-resource/mcp.
    authentication: {
      required: false,
      schemes: ['oauth2'],
      resourceMetadata: `${siteUrl}/.well-known/oauth-protected-resource/mcp`,
    },
    documentation: `${siteUrl}/llms.txt`,
  }
})
