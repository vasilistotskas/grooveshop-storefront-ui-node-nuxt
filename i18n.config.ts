export default defineI18nConfig(() => ({
  legacy: false,
  availableLocales: ['el'],
  locale: 'el',
  fallbackLocale: 'el',
  numberFormats: {
    en: {
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
    de: {
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
