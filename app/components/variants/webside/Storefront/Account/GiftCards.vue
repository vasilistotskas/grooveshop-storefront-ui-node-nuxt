<script lang="ts" setup>
const { t } = useI18n()
// Every account route rendered with the document title left at the
// store name, twice — 46 pages whose browser tab and history entry were
// indistinguishable. The `title` string was already here and simply
// never applied.
useHead({ title: () => t('title') })
const { $i18n } = useNuxtApp()
const localePath = useLocalePath()

// Not awaited: the page shows its own loading state meanwhile.
const { data, status, refresh } = useMyGiftCards()

const cards = computed(() => data.value?.results ?? [])
const loading = computed(() => status.value === 'pending')
</script>

<template>
  <WebsideAccountAreaPageWrapper
    class="
      flex flex-col gap-4
      md:mt-1 md:gap-8 md:!p-0
    "
  >
    <WebsidePageTitle
      :text="t('title')"
      class="md:mt-0"
    />

    <div v-if="loading" class="grid gap-4">
      <USkeleton class="h-28 w-full rounded-lg" />
      <USkeleton class="h-28 w-full rounded-lg" />
    </div>

    <!-- A list that could not load is said as that, never as "no
         cards": a shopper with cards must not read that they have none. -->
    <UCard v-else-if="status === 'error'">
      <div role="alert" class="space-y-3 py-6 text-center">
        <UIcon
          name="i-heroicons-exclamation-triangle"
          class="mx-auto size-10 text-error"
        />
        <p class="text-muted">
          {{ t('load_error') }}
        </p>
        <UButton
          color="neutral"
          variant="soft"
          icon="i-heroicons-arrow-path"
          @click="() => refresh()"
        >
          {{ t('retry') }}
        </UButton>
      </div>
    </UCard>

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
  </WebsideAccountAreaPageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Οι Δωροκάρτες μου
  balance: Υπόλοιπο
  valid_until: Ισχύει έως {date}
  empty: Δεν έχετε συνδεδεμένες δωροκάρτες στον λογαριασμό σας
  buy_one: Αγορά δωροκάρτας
  load_error: Δεν μπορέσαμε να φορτώσουμε τις δωροκάρτες σας
  retry: Δοκιμάστε ξανά
en:
  title: My Gift Cards
  balance: Balance
  valid_until: Valid until {date}
  empty: You have no gift cards linked to your account
  buy_one: Buy a gift card
  load_error: We could not load your gift cards
  retry: Try again
</i18n>
