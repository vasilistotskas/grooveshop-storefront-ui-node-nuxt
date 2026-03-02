import type { TenantConfig } from '~~/server/utils/tenant'

export function useTenant() {
  return useState<TenantConfig | null>('tenant')
}
