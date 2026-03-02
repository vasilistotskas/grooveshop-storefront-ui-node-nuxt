export function useTenant() {
  return useState<TenantConfig | null>('tenant')
}
