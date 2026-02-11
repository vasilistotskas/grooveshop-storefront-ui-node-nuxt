<script lang="ts" setup>
const props = defineProps<{
  productPrice: number
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const loyalty = useLoyalty()
const { data: settings } = loyalty.fetchSettings()

const enabled = computed(() => settings.value?.enabled ?? false)

const estimatedPoints = computed(() => {
  if (!settings.value || !props.productPrice) return 0
  return Math.floor(props.productPrice * settings.value.pointsFactor)
})

const shouldShow = computed(() => enabled.value && estimatedPoints.value > 0)
</script>

<template>
  <div v-if="shouldShow">
    <NuxtLink
      :to="localePath('account-signup')"
      class="
        group flex items-center gap-2.5 rounded-lg
        bg-gradient-to-r from-secondary-50 to-primary-50
        dark:from-secondary-950 dark:to-primary-950
        ring-1 ring-secondary-200 dark:ring-secondary-800
        px-3 py-2
        transition-all duration-200
        hover:ring-secondary-300 dark:hover:ring-secondary-700
        hover:shadow-sm
      "
    >
      <!-- Mini hexagonal badge -->
      <div class="relative flex size-8 shrink-0 items-center justify-center">
        <svg viewBox="0 0 100 100" class="absolute inset-0 size-full">
          <polygon
            points="50 1 95 25 95 75 50 99 5 75 5 25"
            class="fill-secondary-100 stroke-secondary-400 dark:fill-secondary-900 dark:stroke-secondary-500"
            stroke-width="2"
          />
        </svg>
        <span class="relative z-10 text-[11px] font-bold text-secondary-900 dark:text-secondary-100">
          +{{ estimatedPoints }}
        </span>
      </div>

      <!-- Text -->
      <span class="flex-1 text-xs font-medium text-primary-800 dark:text-primary-200">
        {{ t('earn', { points: estimatedPoints }) }}
      </span>

      <!-- Arrow indicator -->
      <UIcon
        name="i-heroicons-arrow-right-20-solid"
        class="
          size-4 shrink-0 text-secondary-400
          transition-transform duration-200
          group-hover:translate-x-0.5 group-hover:text-secondary-600
          dark:text-secondary-500 dark:group-hover:text-secondary-300
        "
      />
    </NuxtLink>
  </div>
</template>

<i18n lang="yaml">
el:
  earn: "Κέρδισε {points} πόντους — Εγγραφή δωρεάν"
</i18n>
