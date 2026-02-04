import type { H3Event } from 'h3'

interface CartSessionData {
  cartId?: number
}

async function getSession(event: H3Event) {
  const config = useRuntimeConfig(event)
  return await useSession<CartSessionData>(event, {
    name: 'nuxt-session',
    password: config.session.password,
    cookie: {
      httpOnly: true,
      secure: !import.meta.dev,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    },
  })
}

export async function getCartSession(event: H3Event): Promise<CartSessionData> {
  const session = await getSession(event)
  return session.data
}

export async function updateCartSession(event: H3Event, updates: Partial<CartSessionData>): Promise<void> {
  const session = await getSession(event)

  // If cartId is explicitly set to undefined, remove it from session
  if ('cartId' in updates && updates.cartId === undefined) {
    const { cartId, ...rest } = session.data
    await session.update(rest)
  }
  else {
    await session.update({
      ...session.data,
      ...updates,
    })
  }
}

export async function getCartHeaders(event: H3Event): Promise<Record<string, string>> {
  const session = await getSession(event)
  const accessToken = await getAllAuthAccessToken(event)
  const headers: Record<string, string> = {}

  if (session.data.cartId) {
    headers['X-Cart-Id'] = String(session.data.cartId)
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  return headers
}

export async function handleCartResponse(event: H3Event, response: any): Promise<void> {
  if (response.id) {
    await updateCartSession(event, { cartId: response.id })
  }
}

export async function clearCartSession(event: H3Event): Promise<void> {
  // Only clear cart-specific data, not the entire session
  await updateCartSession(event, { cartId: undefined })
}

export const useCartSession = (event: H3Event) => {
  return {
    getSession: () => getCartSession(event),
    updateSession: (updates: Partial<CartSessionData>) => updateCartSession(event, updates),
    getCartHeaders: () => getCartHeaders(event),
    handleCartResponse: (response: any) => handleCartResponse(event, response),
    clearSession: () => clearCartSession(event),
  }
}
