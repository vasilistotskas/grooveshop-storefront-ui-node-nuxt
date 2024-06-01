import { createHooks } from 'hookable'
import type { AllAuthResponse, AllAuthResponseError } from '~/types/all-auth'

export interface AllAuthHooks {
  authChange: ({ detail }: { detail: AllAuthResponse | AllAuthResponseError }) => void | Promise<void>
}

export const allAuthHooks = createHooks<AllAuthHooks>()
