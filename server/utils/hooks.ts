import { createHooks } from 'hookable'

export interface AllAuthHooks {
  authChange: (data: any) => void | Promise<void>
}

export const allAuthHooks = createHooks<AllAuthHooks>()
