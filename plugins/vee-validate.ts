import { defineRule } from 'vee-validate'

export default defineNuxtPlugin((nuxtApp) => {
  const $t = nuxtApp.$i18n.t

  defineRule('minMax', (value: string, [min, max]: [number, number]) => {
    if (!value || !value.length) {
      return true
    }
    const numericValue = Number(value)
    if (numericValue < min) {
      return $t('common.validation.max', { max })
    }
    if (numericValue > max) {
      return $t('common.validation.min', { min })
    }
    return true
  })
})
