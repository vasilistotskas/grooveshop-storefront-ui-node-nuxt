import * as z from 'zod'

const ZodCookieConsentDecision = z.enum([
  'accept_all',
  'accept_partial',
  'decline_all',
])

export const ZodCookieConsentEventBody = z.discriminatedUnion('event', [
  z.object({
    event: z.literal('banner_shown'),
  }),
  z.object({
    event: z.literal('consent_decision'),
    decision: ZodCookieConsentDecision,
    enabledIds: z.array(z.string().min(1).max(64)).max(32),
  }),
])
