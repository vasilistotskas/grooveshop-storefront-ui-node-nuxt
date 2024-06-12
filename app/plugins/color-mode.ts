import { THEME_COLORS } from '~/constants'

export default defineNuxtPlugin(() => {
  const colorMode = useColorMode()
  const cookie = useCookie('color-mode')

  const themeColor = computed(() => colorMode.value === 'dark' ? THEME_COLORS.themeDark : THEME_COLORS.themeLight)
  const colorScheme = computed(() => colorMode.value === 'dark' ? 'dark light' : 'light dark')

  useHead({
    meta: [
      {
        id: 'theme-color',
        name: 'theme-color',
        content: themeColor.value,
      },
      {
        id: 'color-scheme',
        name: 'color-scheme',
        content: colorScheme.value,
      },
      {
        id: 'msapplication-TileColor',
        name: 'msapplication-TileColor',
        content: themeColor.value,
      },
    ],
  })

  watch(colorMode, () => {
    cookie.value = colorMode.value
  })
})
