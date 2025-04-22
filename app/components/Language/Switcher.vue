<script lang="ts" setup>
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Locale } from '@intlify/core-base'

defineProps({
  type: {
    type: String,
    default: 'dropdown-right-top',
  },
})

const { locale, locales, t, setLocale } = useI18n({ useScope: 'local' })

const isOpen = ref(false)

const emit = defineEmits(['languageChanged'])

const items = computed<DropdownMenuItem[][]>(() => {
  const dropDownItems: DropdownMenuItem[][] = []
  locales.value?.forEach((option) => {
    dropDownItems.push([
      {
        label: option.name || '',
        disabled: option.code === locale.value,
        icon: String(option.icon) || undefined,
        onSelect: () => {
          emit('languageChanged', option.code)
          navigateToLocale(option.code)
        },
      },
    ])
  })

  dropDownItems.sort((a, b) => {
    if (!a[0]) {
      return 1
    }
    if (!b[0]) {
      return -1
    }
    if (a[0].disabled && !b[0].disabled) {
      return -1
    }
    if (!a[0].disabled && b[0].disabled) {
      return 1
    }

    if (a[0].label && b[0].label) {
      return a[0].label.localeCompare(b[0].label)
    }

    return 0
  })

  return dropDownItems
})

const navigateToLocale = (locale: Locale) => {
  setLocale(locale)
}
</script>

<template>
  <div class="flex items-center">
    <UDropdownMenu
      v-model:open="isOpen"
      arrow
      :items="items"
      :popper="{ placement: 'bottom-start' }"
    >
      <UButton
        type="button"
        class="p-0"
        color="neutral"
        variant="ghost"
        size="xl"
        trailing-icon="i-heroicons-language"
        :ui="{
          base: 'cursor-pointer hover:bg-transparent',
        }"
        :title="t('current_language', {
          language: locale,
        })"
        :aria-label="t('current_language', {
          language: locale,
        })"
        :aria-current-value="locale"
      >
        <span class="sr-only">{{
          t('change_language')
        }}</span>
      </UButton>
      <template #item="{ item }">
        <span class="truncate">{{ item.label }}</span>
        <UIcon
          v-if="item.icon"
          :name="item.icon"
          class="ms-auto h-5 w-5 flex-shrink-0"
        />
      </template>
    </UDropdownMenu>
  </div>
</template>

<i18n lang="yaml">
el:
  change_language: Άλλαξε γλώσσα
  current_language: Τρέχουσα γλώσσα {language}
</i18n>
