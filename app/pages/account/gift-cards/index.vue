<script lang="ts" setup>
const { t } = useI18n()
const { $i18n } = useNuxtApp()
const localePath = useLocalePath()

defineRouteRules({
  robots: false,
})

definePageMeta({
  middleware: ['gift-cards-enabled'],
})

// useRequestFetch: SSR must forward the incoming host or the tenant
// middleware resolves localhost and 404s (useLoyalty.ts precedent).
const requestFetch = useRequestFetch()
const { data, status } = await useAsyncData(
  'my-gift-cards',
  () => requestFetch<PaginatedGiftCardList>('/api/giftcard/mine'),
  { lazy: true },
)

const cards = computed(() => data.value?.results ?? [])
const loading = computed(() => status.value === 'pending')
</script>

<template>
  <PageWrapper
    class="
      flex flex-col gap-4
      md:mt-1 md:gap-8 md:!p-0
    "
  >
    <PageTitle
      :text="t('title')"
      class="md:mt-0"
    />

    <div v-if="loading" class="grid gap-4">
      <USkeleton class="h-28 w-full rounded-lg" />
      <USkeleton class="h-28 w-full rounded-lg" />
    </div>

    <div v-else-if="cards.length" class="grid gap-4">
      <UCard
        v-for="card in cards"
        :key="card.uuid"
      >
        <div
          class="
            flex flex-col gap-3
            sm:flex-row sm:items-center sm:justify-between
          "
        >
          <div class="space-y-1">
            <p class="font-mono text-lg font-semibold tracking-wide">
              {{ card.code }}
            </p>
            <p
              v-if="card.expiresAt"
              class="
                text-xs text-primary-600
                dark:text-primary-400
              "
            >
              {{ t('valid_until', { date: new Date(card.expiresAt).toLocaleDateString('el-GR') }) }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-sm text-muted">
              {{ t('balance') }}
            </p>
            <p
              class="
                text-xl font-bold text-primary-950
                dark:text-primary-50
              "
            >
              {{ $i18n.n(Number(card.balance), 'currency') }}
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <UCard v-else>
      <div class="space-y-3 py-6 text-center">
        <UIcon
          name="i-heroicons-gift"
          class="
            mx-auto size-10 text-primary-400
            dark:text-primary-600
          "
        />
        <p class="text-muted">
          {{ t('empty') }}
        </p>
        <UButton
          :to="localePath('gift-cards')"
          color="secondary"
          variant="soft"
        >
          {{ t('buy_one') }}
        </UButton>
      </div>
    </UCard>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Οι Δωροκάρτες μου
  balance: Υπόλοιπο
  valid_until: Ισχύει έως {date}
  empty: Δεν έχετε συνδεδεμένες δωροκάρτες στον λογαριασμό σας
  buy_one: Αγορά δωροκάρτας
</i18n>
