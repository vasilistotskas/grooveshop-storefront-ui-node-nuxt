export function useDevice() {
  const isMobileOrTablet = useMediaQuery('(max-width: 1023px)')
  const isMobile = useMediaQuery('(max-width: 639px)')
  const isDesktop = computed(() => !isMobileOrTablet.value)

  return { isMobileOrTablet, isMobile, isDesktop }
}
