import { z } from 'zod'

/** `POST /api/builder/session`: the single-use ticket Django's admin minted for "Edit storefront". */
export const ZodBuilderSessionBody = z.object({
  ticket: z.string().min(1).max(512),
})

/** Who the staff member is, as Django states it. */
export const ZodBuilderStaff = z.object({
  id: z.number().int(),
  name: z.string(),
  role: z.string(),
})

/** What Django answers a valid ticket with: `POST {apiBaseUrl}/builder/staff-session`. */
export const ZodBuilderStaffSession = z.object({
  token: z.string().min(1),
  expiresAt: z.iso.datetime({ offset: true }),
  staff: ZodBuilderStaff,
})

/**
 * What is sealed in the builder cookie: the Django answer, whole. Read
 * back through the same schema, so a cookie that is not this is no session.
 */
export const ZodBuilderSessionData = ZodBuilderStaffSession

/** What the browser is told about its session: never the token. */
export const ZodBuilderSessionInfo = ZodBuilderStaffSession.omit({ token: true })

export type BuilderStaff = z.infer<typeof ZodBuilderStaff>
export type BuilderSessionData = z.infer<typeof ZodBuilderSessionData>
export type BuilderSessionInfo = z.infer<typeof ZodBuilderSessionInfo>
