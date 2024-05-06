<script lang="ts" setup>
import type { LocaleObject } from 'vue-i18n-routing'
import type { DropdownItem } from '#ui/types'

type Locale = LocaleObject & {
  flag: string
}

defineProps({
  type: {
    type: String,
    default: 'dropdown-right-top',
  },
})

const { locale, locales, setLocale } = useI18n()

const allLocales = locales.value as unknown as Locale[]

const items = computed<DropdownItem[][]>(() => {
  const dropDownItems: DropdownItem[][] = []
  allLocales.forEach((option) => {
    dropDownItems.push([
      {
        label: option.name || '',
        disabled: option.code === locale.value,
        icon: option.code === locale.value ? 'i-heroicons-check' : '',
        click: () => onLocaleChange(option.code),
      },
    ])
  })

  dropDownItems.sort((a, b) => {
    if (a[0].disabled && !b[0].disabled) {
      return -1
    }
    if (!a[0].disabled && b[0].disabled) {
      return 1
    }
    return a[0].label.localeCompare(b[0].label)
  })

  return dropDownItems
})

const navigateToLocale = (code: string) => {
  setLocale(code)
}
const onLocaleChange = (code: string) => {
  navigateToLocale(code)
}
</script>

<template>
  <div class="flex items-center">
    <UDropdown
      :items="items"
      :popper="{ placement: 'bottom-start' }"
      :ui="{
        background: 'bg-primary-200 dark:bg-primary-800',
        item: {
          label: 'text-primary-800 dark:text-primary-200',
        },
      }"
    >
      <UButton
        size="xl"
        class="p-0"
        color="primary"
        trailing-icon="i-heroicons-language"
        :aria-current-value="locale"
        :title="$t('components.language.switcher.current_language', {
          language: locale,
        })"
      >
        <span class="sr-only">{{
          $t('components.language.switcher.change_language')
        }}</span>
      </UButton>
    </UDropdown>
  </div>
</template>
