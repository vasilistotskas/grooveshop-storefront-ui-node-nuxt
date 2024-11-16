export const useScreen = () => {
  const screenSize = reactive({
    width: 0,
    height: 0,
  })

  const current = ref<ScreenSize>(ScreenSizeEnum.SMALL)

  const getSize = (width?: number) => {
    if (width === undefined) width = screenSize.width
    const {
      [ScreenSizeEnum.SMALL]: sm,
      [ScreenSizeEnum.MEDIUM]: md,
      [ScreenSizeEnum.LARGE]: lg,
      [ScreenSizeEnum.EXTRA_LARGE]: xl,
    } = defaultScreenConfig
    if (width < Number(sm)) return ScreenSizeEnum.SMALL
    if (width < Number(md)) return ScreenSizeEnum.MEDIUM
    if (width < Number(lg)) return ScreenSizeEnum.LARGE
    if (width < Number(xl)) return ScreenSizeEnum.EXTRA_LARGE
    return ScreenSizeEnum.EXTRA_LARGE
  }

  const onWindowResize = () => {
    const { innerWidth, innerHeight } = window
    screenSize.width = innerWidth
    screenSize.height = innerHeight
    current.value = getSize()
  }

  const higherThan = (size: ScreenSize) => {
    const {
      [ScreenSizeEnum.SMALL]: sm,
      [ScreenSizeEnum.MEDIUM]: md,
      [ScreenSizeEnum.LARGE]: lg,
      [ScreenSizeEnum.EXTRA_LARGE]: xl,
    } = defaultScreenConfig
    const width = screenSize.width
    if (size === ScreenSizeEnum.SMALL) return width >= Number(sm)
    if (size === ScreenSizeEnum.MEDIUM) return width >= Number(md)
    if (size === ScreenSizeEnum.LARGE) return width >= Number(lg)
    if (size === ScreenSizeEnum.EXTRA_LARGE) return width >= Number(xl)
    return false
  }

  onMounted(() => {
    if (typeof window === 'undefined') return
    window.addEventListener('resize', onWindowResize)
    getSize(window.innerWidth)
  })

  onUnmounted(() => {
    if (typeof window === 'undefined') return
    window.removeEventListener('resize', onWindowResize)
  })

  return {
    getSize,
    screenSize,
    current,
    higherThan,
  }
}
