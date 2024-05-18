import { z } from 'zod'

const ZodUser = z.object({
  id: z.union([z.string(), z.number()]).describe('The user ID.'),
  display: z.string().optional().describe('The display name for the user.'),
  has_usable_password: z.boolean().optional().describe('Whether or not the account has a password set.'),
  email: z.string().email().optional().describe('The email address.'),
  username: z.string().optional().describe('The username.'),
})

const ZodMethods = z.array(
  z.object({
    method: z.enum(['password', 'socialaccount', 'mfa']),
    at: z.number().describe('An epoch based timestamp (trivial to parse using: new Date(value)*1000)'),
    email: z.string().email().optional().describe('The email address.'),
    username: z.string().optional().describe('The username.'),
    reauthenticated: z.boolean().optional(),
    provider: z.string().optional().describe('The provider ID.'),
    uid: z.string().optional().describe('The provider specific account ID.'),
    type: z.string().optional().describe('Enum: "recovery_codes" "totp"\n'
      + 'The type of authenticator.'),
  }),
).describe('A list of methods used to authenticate.')

const ZodAuthenticated = z.object({
  user: ZodUser,
  methods: ZodMethods,
})

const ZodAuthenticationMeta = z.object({
  session_token: z.string().optional().describe('The session token (app clients only).'),
  access_token: z.string().optional().describe('The access token (app clients only).'),
  is_authenticated: z.boolean(),
}).describe('Metadata available in an authentication related response.')

export const ZodSessionResponse = z.object({
  status: z.number(),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export type SessionResponse = z.infer<typeof ZodSessionResponse>
