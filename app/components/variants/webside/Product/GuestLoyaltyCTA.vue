<script lang="ts" setup>
const props = defineProps<{
  potentialPoints: number
}>()

const { t } = useStoreI18n('components/variants/webside/Product/GuestLoyaltyCTA')
const localePath = useLocalePath()
// Links between auth pages keep the destination the shopper came with.
const { authLink } = useAuthLinks()

const enabled = useStoreFeature('loyalty')

const shouldShow = computed(() => enabled.value && props.potentialPoints > 0)
</script>

<template>
  <div v-if="shouldShow">
    <NuxtLink
      :to="localePath(authLink('account-signup'))"
      class="
        group flex items-center gap-2.5 rounded-lg bg-linear-to-r
        from-secondary-50 to-primary-50 px-3 py-2 ring-1 ring-secondary-200
        transition-all duration-200
        hover:shadow-sm hover:ring-secondary-300
        dark:from-secondary-950 dark:to-primary-950 dark:ring-secondary-800
        dark:hover:ring-secondary-700
      "
    >
      <!-- Mini hexagonal badge -->
      <div class="relative flex size-8 shrink-0 items-center justify-center">
        <svg viewBox="0 0 100 100" class="absolute inset-0 size-full">
          <polygon
            points="50 1 95 25 95 75 50 99 5 75 5 25"
            class="
              fill-secondary-100 stroke-secondary-400
              dark:fill-secondary-900 dark:stroke-secondary-500
            "
            stroke-width="2"
          />
        </svg>
        <span
          class="
            relative z-10 text-[11px] font-bold text-secondary-900
            dark:text-secondary-100
          "
        >
          +{{ potentialPoints }}
        </span>
      </div>

      <!-- Text -->
      <span
        class="
          flex-1 text-xs font-medium text-primary-800
          dark:text-primary-200
        "
      >
        {{ t('earn', { points: potentialPoints }) }}
      </span>

      <!-- Arrow indicator -->
      <UIcon
        name="i-heroicons-arrow-right-20-solid"
        class="
          size-4 shrink-0 text-secondary-400 transition-transform duration-200
          group-hover:translate-x-0.5 group-hover:text-secondary-600
          dark:text-secondary-500
          dark:group-hover:text-secondary-300
        "
      />
    </NuxtLink>
  </div>
</template>

<i18n lang="yaml">
el:
  earn: "Κέρδισε {points} πόντους — Εγγραφή δωρεάν"
en:
  earn: "Earn {points} points — sign up free"
</i18n>
