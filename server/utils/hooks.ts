import { createHooks } from 'hookable'

export interface AllAuthHooks {
  authChange: ({ detail }: { detail: AllAuthResponse | AllAuthResponseError }) => void | Promise<void>
}

export const allAuthHooks = createHooks<AllAuthHooks>()
