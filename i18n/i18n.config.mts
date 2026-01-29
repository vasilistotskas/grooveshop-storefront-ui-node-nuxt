import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from './locales'

export default defineI18nConfig(() => ({
  availableLocales: [...SUPPORTED_LOCALES] as any,
  locale: DEFAULT_LOCALE as any,
  fallbackLocale: DEFAULT_LOCALE as any,
  silentFallbackWarn: true,
  numberFormats: {
    el: {
      currency: {
        style: 'currency',
        currency: 'EUR',
        notation: 'standard',
      },
      decimal: {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
      percent: {
        style: 'percent',
        useGrouping: false,
      },
    },
  },
}))
