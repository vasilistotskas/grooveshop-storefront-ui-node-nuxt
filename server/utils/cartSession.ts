import type { Storage } from 'unstorage'
import type { SessionConfig } from 'h3'
import process from 'node:process'

interface CartSessionData {
  cartId?: number
  sessionKey?: string
  userId?: number
  lastActivity: string
}

const sessionConfig: SessionConfig = {
  name: 'nuxt-session',
  password: process.env.NUXT_SESSION_PASSWORD || 'your-secure-password-here',
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
}

function getStorage(): Storage {
  const config = useRuntimeConfig()
  return useStorage(config.cacheBase)
}

export async function getCartSession(): Promise<CartSessionData> {
  const storage = getStorage()
  const session = await useSession<{ sessionId: string }>(useEvent(), sessionConfig)

  if (!session.data.sessionId) {
    console.info('Session Id not set, updating...')
    await session.update({ sessionId: process.env.NUXT_SESSION_PASSWORD || 'your-secure-password-here' })
  }

  const sessionId = session.data.sessionId!

  const cartKey = `cart:${sessionId}`
  let cartData = await storage.getItem<CartSessionData>(cartKey)

  if (!cartData) {
    console.info('Sets cart data in storage')
    cartData = {
      sessionKey: process.env.NUXT_SESSION_PASSWORD || 'your-secure-password-here',
      lastActivity: new Date().toISOString(),
    }
    await storage.setItem(cartKey, cartData, {
      ttl: 60 * 60 * 24 * 30, // 30 days
    })
  }

  return cartData
}

export async function updateCartSession(updates: Partial<CartSessionData>): Promise<void> {
  console.info('Updating cart session')
  const storage = getStorage()
  const session = await useSession<{ sessionId: string }>(useEvent(), sessionConfig)
  const sessionId = session.data.sessionId

  if (!sessionId) {
    throw new Error('No session found')
  }

  const cartKey = `cart:${sessionId}`
  const existingData = await storage.getItem<CartSessionData>(cartKey) || {}

  const updatedData = {
    ...existingData,
    ...updates,
    lastActivity: new Date().toISOString(),
  }

  await storage.setItem(cartKey, updatedData, {
    ttl: 60 * 60 * 24 * 30,
  })
}

export async function getCartHeaders(): Promise<Record<string, string>> {
  const accessToken = await getAllAuthAccessToken(useEvent())
  const sessionData = await getCartSession()
  const headers: Record<string, string> = {}

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  if (sessionData.cartId) {
    headers['X-Cart-Id'] = String(sessionData.cartId)
  }

  if (sessionData.sessionKey) {
    headers['X-Session-Key'] = sessionData.sessionKey
  }

  return headers
}

export async function handleCartResponse(response: any): Promise<void> {
  const updates: Partial<CartSessionData> = {}

  if (response.id) {
    updates.cartId = response.id
  }

  if (response.session_key) {
    updates.sessionKey = response.session_key
  }

  if (Object.keys(updates).length > 0) {
    await updateCartSession(updates)
  }
}

export async function clearCartSession(): Promise<void> {
  const storage = getStorage()
  const session = await useSession<{ sessionId: string }>(useEvent(), sessionConfig)
  const sessionId = session.data.sessionId

  if (sessionId) {
    const cartKey = `cart:${sessionId}`
    await storage.removeItem(cartKey)
  }

  await session.clear()
}

export async function associateUser(userId: number): Promise<void> {
  const updates = { userId }
  await updateCartSession(updates)
}

export const useCartSession = () => {
  return {
    getSession: () => getCartSession(),
    updateSession: (updates: Partial<CartSessionData>) => updateCartSession(updates),
    getCartHeaders: () => getCartHeaders(),
    handleCartResponse: (response: any) => handleCartResponse(response),
    clearSession: () => clearCartSession(),
    associateUser: (userId: number) => associateUser(userId),
  }
}
