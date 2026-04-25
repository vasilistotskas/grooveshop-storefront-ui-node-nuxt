import { createHash, createDecipheriv } from 'node:crypto'
import { Buffer } from 'buffer'
import type { H3Event } from 'h3'

function decryptToken(event: H3Event, encryptedToken: string): string {
  const config = useRuntimeConfig(event)
  const secret_key = String(config.secretKey)
  const key = createHash('sha256').update(secret_key).digest()
  const tokenBuffer = Buffer.from(encryptedToken, 'base64')

  const nonce = tokenBuffer.subarray(0, 16)
  const tag = tokenBuffer.subarray(16, 32)
  const ciphertext = tokenBuffer.subarray(32)

  const decipher = createDecipheriv('aes-256-gcm', key, nonce)
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])

  return decrypted.toString()
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const wideLog = useLogger(event)
  wideLog.set({ auth: { method: 'session' } })
  try {
    let decodedToken: string | undefined
    const signedToken = getRequestHeader(event, 'X-Encrypted-Token')
    if (signedToken) {
      try {
        decodedToken = decryptToken(event, signedToken)
      }
      catch (error) {
        log.error({ action: 'auth:tokenDecrypt', error })
        throw createError({ statusCode: 400, statusMessage: 'Invalid token' })
      }
    }

    const headers = await getAllAuthHeaders()

    if (decodedToken) {
      // Use the decrypted Knox token as the Bearer access token.
      // Also forward the stored allauth session token (if any) so allauth
      // can correlate the session — do NOT send the Django sessionid cookie
      // as the allauth X-Session-Token; they are completely different things.
      const storedSessionToken = await getAllAuthSessionToken()
      headers['Authorization'] = `Bearer ${decodedToken}`
      if (storedSessionToken) {
        headers['X-Session-Token'] = storedSessionToken
      }
      else {
        delete headers['X-Session-Token']
      }
    }

    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/session`, {
      method: 'GET',
      headers,
    })
    const sessionResponse = await parseDataAs(response, ZodSessionResponse)
    await processAllAuthSession(sessionResponse, decodedToken)
    if (sessionResponse.meta?.is_authenticated === false) {
      await clearUserSession(event)
    }
    return sessionResponse
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
