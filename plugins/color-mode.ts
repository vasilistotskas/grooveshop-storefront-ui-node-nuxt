import { THEME_COLORS } from '~/constants'

export default defineNuxtPlugin(() => {
  const colorMode = useColorMode()
  const cookie = useCookie(
    'color-mode',
  )

  useHead({
    meta: [{
      id: 'theme-color',
      name: 'theme-color',
      content: () => colorMode.value === 'dark' ? THEME_COLORS.themeDark : THEME_COLORS.themeLight,
    },
    {
      id: 'color-scheme',
      name: 'color-scheme',
      content: () => colorMode.value === 'dark' ? 'dark light' : 'light dark',
    },
    {
      id: 'msapplication-TileColor',
      name: 'msapplication-TileColor',
      content: () => colorMode.value === 'dark' ? THEME_COLORS.themeDark : THEME_COLORS.themeLight,
    }],
  })

  watch(colorMode, () => {
    cookie.value = colorMode.value
  })
})
