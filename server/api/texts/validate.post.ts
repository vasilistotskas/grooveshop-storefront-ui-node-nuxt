import { defineEventHandler, readValidatedBody, setResponseStatus } from 'nuxt/server'

/**
 * Whether a store-written text may replace a catalogue default: the key
 * exists and is not locked, the text compiles with the app's message
 * compiler, and it uses the default's placeholders (`validateText`).
 * Django's text editor asks before it stores an override, so the message
 * syntax lives in one place and cannot drift from the storefront's.
 *
 * 200 `{ ok: true }`, or 422 `{ ok: false, code, detail }`. Public like
 * the catalogue it checks against, and side-effect free.
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readValidatedBody(event, ZodTextValidateBody)
    const result = validateText(body)
    if (!result.ok) {
      setResponseStatus(event, 422)
    }
    return result
  }
  catch (error) {
    return handleError(event, error)
  }
})
