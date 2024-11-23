import { defineRule } from 'vee-validate'
import type { Composer } from 'vue-i18n'

export default defineNuxtPlugin((nuxtApp) => {
  const $t = (nuxtApp.$i18n as Composer).t

  defineRule('minMax', (value: string, [min, max]: [number, number]) => {
    if (!value || !value.length) {
      return true
    }
    const numericValue = Number(value)
    if (numericValue < min) {
      return $t('validation.max', { max })
    }
    if (numericValue > max) {
      return $t('validation.min', { min })
    }
    return true
  })
})
