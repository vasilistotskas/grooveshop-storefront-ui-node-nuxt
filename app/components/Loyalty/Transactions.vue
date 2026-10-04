<script lang="ts" setup>
import type { TableColumn } from '@nuxt/ui'
import type { DateValue } from '@internationalized/date'

/**
 * The account's points ledger, as the board draws it: a History card
 * whose rows are date, description, a soft badge for the transaction's
 * type and the signed points. On a phone the date moves under the
 * description and the type badge drops out.
 *
 * The date range is picked with `UInputDate` in the page's locale (a
 * native date input follows the browser's instead) and sent as the
 * ISO days the API filters on.
 *
 * The types the filter offers are the API's own enum
 * (`zTransactionTypeEnum`), so one Django adds later is filterable at
 * once, labelled by its raw code until it is translated.
 */
const { t, n, locale } = useI18n()

const TYPE_COLORS = {
  EARN: 'success',
  REDEEM: 'neutral',
  BONUS: 'info',
  EXPIRE: 'warning',
  ADJUST: 'neutral',
} as const

const HIDDEN_ON_PHONE = { class: { th: 'max-sm:hidden', td: 'max-sm:hidden' } }

const headingId = useId()

// Filter state
const selectedType = ref<string>('all')
const dateFrom = shallowRef<DateValue | null>(null)
const dateTo = shallowRef<DateValue | null>(null)
const currentPage = ref(1)

// Build params for API call
const transactionParams = computed(() => {
  const params: LoyaltyTransactionsParams = {
    page: currentPage.value,
  }

  if (selectedType.value !== 'all') {
    params.transactionType = selectedType.value
  }
  // A CalendarDate's toString() is the ISO day, 'YYYY-MM-DD'.
  if (dateFrom.value) {
    params.dateFrom = dateFrom.value.toString()
  }
  if (dateTo.value) {
    params.dateTo = dateTo.value.toString()
  }

  return params
})

// Fetch transactions - pass the computed ref so useAsyncData re-fetches reactively
const { data: transactions, status, error, refresh } = useLoyalty().fetchTransactions(transactionParams)

const loading = computed(() => status.value === 'pending')

// Reset to page 1 when filters change
watch([selectedType, dateFrom, dateTo], () => {
  currentPage.value = 1
})

const typeLabel = (type: string) =>
  type in TYPE_COLORS ? t(`type.${type.toLowerCase()}`) : type

const typeColor = (type: string) =>
  TYPE_COLORS[type as keyof typeof TYPE_COLORS] ?? 'neutral'

const typeOptions = computed(() => [
  { label: t('all_types'), value: 'all' },
  ...zTransactionTypeEnum.options.map(type => ({ label: typeLabel(type), value: type })),
])

const columns = computed<TableColumn<PointsTransaction>[]>(() => [
  { accessorKey: 'createdAt', header: t('table.date'), meta: HIDDEN_ON_PHONE },
  { accessorKey: 'description', header: t('table.description') },
  { accessorKey: 'transactionType', header: t('table.type'), meta: HIDDEN_ON_PHONE },
  { accessorKey: 'points', header: t('table.points'), meta: { class: { th: 'text-right', td: 'text-right' } } },
])

const totalPages = computed(() => transactions.value?.totalPages ?? 1)
</script>

<template>
  <section
    :aria-labelledby="headingId"
    class="flex flex-col gap-5 rounded-[1.25rem] bg-default p-5 ring ring-default sm:p-6"
  >
    <div class="flex items-center justify-between gap-3">
      <h2
        :id="headingId"
        class="font-semibold text-highlighted"
      >
        {{ t('title') }}
      </h2>
      <USelect
        v-model="selectedType"
        :items="typeOptions"
        :aria-label="t('filter.type')"
        value-key="value"
        color="neutral"
        class="w-auto min-w-36"
      />
    </div>

    <div class="flex flex-wrap gap-3">
      <UFormField
        :label="t('filter.date_from')"
        class="w-40"
      >
        <UInputDate
          v-model="dateFrom"
          :locale="locale"
          color="neutral"
          class="w-full"
        />
      </UFormField>
      <UFormField
        :label="t('filter.date_to')"
        class="w-40"
      >
        <UInputDate
          v-model="dateTo"
          :locale="locale"
          color="neutral"
          class="w-full"
        />
      </UFormField>
    </div>

    <div
      v-if="loading"
      class="flex flex-col gap-3"
    >
      <USkeleton
        v-for="row in 4"
        :key="row"
        class="h-12"
      />
    </div>

    <AccountLoadError
      v-else-if="error"
      :message="t('error_loading')"
      @retry="() => refresh()"
    />

    <p
      v-else-if="!transactions?.results?.length"
      class="py-8 text-center text-toned"
    >
      {{ t('empty_state') }}
    </p>

    <template v-else>
      <UTable
        :columns="columns"
        :data="transactions.results"
        :ui="{
          th: `
            text-xs tracking-wider text-muted uppercase
            max-sm:px-0
          `,
          td: `
            py-4 whitespace-normal text-toned
            max-sm:px-0
          `,
        }"
      >
        <template #createdAt-cell="{ row }">
          <NuxtTime
            :datetime="row.original.createdAt"
            :locale="locale"
            year="numeric"
            month="short"
            day="numeric"
            class="whitespace-nowrap"
          />
        </template>

        <template #description-cell="{ row }">
          <span class="font-medium text-highlighted">{{ row.original.description }}</span>
          <NuxtTime
            :datetime="row.original.createdAt"
            :locale="locale"
            year="numeric"
            month="short"
            day="numeric"
            class="mt-0.5 block text-xs text-muted sm:hidden"
          />
        </template>

        <template #transactionType-cell="{ row }">
          <UBadge
            :label="typeLabel(row.original.transactionType)"
            :color="typeColor(row.original.transactionType)"
            variant="soft"
          />
        </template>

        <template #points-cell="{ row }">
          <span
            class="font-mono font-semibold"
            :class="row.original.points > 0 ? 'text-success' : 'text-highlighted'"
          >
            {{ n(row.original.points, { signDisplay: 'always' }) }}
          </span>
        </template>
      </UTable>

      <div
        v-if="totalPages > 1"
        class="flex justify-center"
      >
        <UPagination
          v-model:page="currentPage"
          :total="transactions.count"
          :items-per-page="transactions.pageSize ?? 12"
          color="neutral"
        />
      </div>
    </template>
  </section>
</template>

<i18n lang="yaml">
el:
  title: Ιστορικό
  all_types: Όλοι οι τύποι
  filter:
    type: Τύπος συναλλαγής
    date_from: Από
    date_to: Έως
  table:
    date: Ημερομηνία
    description: Περιγραφή
    type: Τύπος
    points: Πόντοι
  type:
    earn: Κέρδος
    redeem: Εξαργύρωση
    expire: Λήξη
    adjust: Προσαρμογή
    bonus: Μπόνους
  empty_state: Δεν βρέθηκαν συναλλαγές
  error_loading: Δεν μπορέσαμε να φορτώσουμε τις συναλλαγές σου.
en:
  title: History
  all_types: All types
  filter:
    type: Transaction type
    date_from: From
    date_to: To
  table:
    date: Date
    description: Description
    type: Type
    points: Points
  type:
    earn: Earned
    redeem: Redeemed
    expire: Expired
    adjust: Adjustment
    bonus: Bonus
  empty_state: No transactions found
  error_loading: We could not load your transactions.
</i18n>
