import { createHash, createDecipheriv } from 'node:crypto'
import { Buffer } from 'buffer'
import { ZodSessionResponse } from '~/types/all-auth'

function decryptToken(encryptedToken: string): string {
  const config = useRuntimeConfig()
  const secret_key = config.secretKey
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
  try {
    let decodedToken: string | undefined
    const signedToken = getRequestHeader(event, 'X-Encrypted-Token')
    if (signedToken) {
      try {
        decodedToken = decryptToken(signedToken)
        console.log('Decoded token:', decodedToken)
      }
      catch (error) {
        console.error('Error verifying signed token:', error)
      }
    }

    const headers = await getAllAuthHeaders()

    if (decodedToken) {
      const cookieHeader = getRequestHeader(event, 'cookie')
      const sessionId = cookieHeader?.match(/sessionid=([^;]*)/)?.[1]
      console.log('Session ID:', sessionId)
      Object.assign(headers, {
        'Authorization': `Bearer ${decodedToken}`,
        'X-Session-Token': sessionId,
      })
    }
    console.log('Headers:', headers)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/session`, {
      method: 'GET',
      headers,
    })
    const sessionResponse = await parseDataAs(response, ZodSessionResponse)
    await processAllAuthSession(sessionResponse)
    return sessionResponse
  }
  catch (error) {
    await handleAllAuthError(error)
    await clearUserSession(event)
  }
})
