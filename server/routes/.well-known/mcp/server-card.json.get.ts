import { defineEventHandler, setHeader } from 'h3'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = (config.public.baseUrl as string) || 'https://webside.gr'

  setHeader(event, 'content-type', 'application/json')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return {
    $schema: 'https://modelcontextprotocol.io/schemas/server-card.json',
    serverInfo: {
      name: 'Webside',
      version: (config.public.version as string) || '1.0.0',
      title: 'Webside MCP',
      description: 'Shopping tools for webside.gr (Greek e-commerce storefront): catalog search, cart, checkout handoff, and order tracking.',
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
      },
    },
    documentation: `${siteUrl}/llms.txt`,
  }
})
