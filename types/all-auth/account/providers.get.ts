import { z } from 'zod'

const ZodProviderAccount = z.object({
  uid: z.string().describe('The provider specific account ID.'),
  display: z.string().describe('A name derived from the third-party provider account data.'),
  provider: z.object({
    id: z.string().describe('The provider ID.'),
    name: z.string().describe('The name of the provider.'),
    client_id: z.string().optional().describe('The client ID (in case of OAuth2 or OpenID Connect based providers)'),
    flows: z.array(z.enum(['provider_redirect', 'provider_token'])).describe('Items Enum: "provider_redirect" "provider_token"\n'
    + 'The authentication flows the provider integration supports.'),
  }),
})

const ZodData = z.array(ZodProviderAccount)

export const ZodProvidersGetResponse = z.object({
  status: z.number(),
  data: ZodData,
})

export type ProvidersGetResponse = z.infer<typeof ZodProvidersGetResponse>
