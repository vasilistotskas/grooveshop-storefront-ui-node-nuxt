<script lang="ts" setup>
import { h, resolveComponent } from 'vue'
import type { PointsTransaction } from '#shared/openapi/types.gen'
import type { TableColumn } from '@nuxt/ui'

const UBadge = resolveComponent('UBadge')

const { t } = useI18n()

// Filter state
const selectedType = ref<string>('all')
const dateFrom = ref<string>('')
const dateTo = ref<string>('')
const currentPage = ref(1)

// Build params for API call
const transactionParams = computed(() => {
  const params: {
    page?: number
    transactionType?: string
    dateFrom?: string
    dateTo?: string
  } = {
    page: currentPage.value,
  }

  if (selectedType.value !== 'all') {
    params.transactionType = selectedType.value
  }
  if (dateFrom.value) {
    params.dateFrom = dateFrom.value
  }
  if (dateTo.value) {
    params.dateTo = dateTo.value
  }

  return params
})

// Fetch transactions with new API - automatically refetches when params change
const { data: transactions, status, error, refresh } = useLoyalty().fetchTransactions(transactionParams.value)

// Computed for loading state (compatible with template)
const loading = computed(() => status.value === 'pending')

// Watch for filter changes and refresh
watch([selectedType, dateFrom, dateTo], () => {
  currentPage.value = 1
  refresh()
})

// Watch for page changes and refresh
watch(currentPage, () => {
  refresh()
})

const handleRetry = () => {
  refresh()
}

// Fetch transactions with filters
const transactionTypeOptions = computed(() => [
  { label: t('filter.all_types'), value: 'all' },
  { label: t('filter.earn'), value: 'EARN' },
  { label: t('filter.redeem'), value: 'REDEEM' },
  { label: t('filter.expire'), value: 'EXPIRE' },
  { label: t('filter.adjust'), value: 'ADJUST' },
  { label: t('filter.bonus'), value: 'BONUS' },
])

// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Format points with sign
const formatPoints = (points: number) => {
  return points > 0 ? `+${points}` : points.toString()
}

// Get transaction type label
const getTransactionTypeLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    EARN: t('type.earn'),
    REDEEM: t('type.redeem'),
    EXPIRE: t('type.expire'),
    ADJUST: t('type.adjust'),
    BONUS: t('type.bonus'),
  }
  return typeMap[type] || type
}

// Table columns with proper TanStack Table configuration
const columns: TableColumn<PointsTransaction>[] = [
  {
    accessorKey: 'points',
    header: t('table.points'),
    cell: ({ row }) => {
      const points = row.getValue('points') as number
      const colorClass = points > 0
        ? 'text-success'
        : 'text-error'
      return h('span', { class: `font-semibold ${colorClass}` }, formatPoints(points))
    },
  },
  {
    accessorKey: 'transactionType',
    header: t('table.type'),
    cell: ({ row }) => {
      const type = row.getValue('transactionType') as string
      const points = row.original.points
      const color = points > 0 ? 'success' : 'error'
      return h(UBadge, {
        label: getTransactionTypeLabel(type),
        color,
        variant: 'subtle',
      })
    },
  },
  {
    accessorKey: 'description',
    header: t('table.description'),
    cell: ({ row }) => {
      return h('span', { class: 'text-sm' }, row.getValue('description') as string)
    },
  },
  {
    accessorKey: 'createdAt',
    header: t('table.date'),
    cell: ({ row }) => {
      return h('span', { class: 'text-sm text-muted' }, formatDate(row.getValue('createdAt') as string))
    },
  },
]

// Pagination
const totalPages = computed(() => {
  if (!transactions.value?.count) return 1
  const pageSize = 10 // Default page size
  return Math.ceil(transactions.value.count / pageSize)
})
</script>

<template>
  <details
    class="
      group rounded-xl border border-neutral-200 bg-white
      dark:border-neutral-800 dark:bg-neutral-950
    "
  >
    <summary
      class="
        flex cursor-pointer list-none items-center gap-3 px-5 py-4
        text-xl font-semibold text-primary-950
        select-none
        [&::-webkit-details-marker]:hidden
        dark:text-primary-50
      "
    >
      <UIcon
        name="i-heroicons-chevron-right"
        class="
          size-5 shrink-0 transition-transform duration-200
          group-open:rotate-90
        "
      />
      {{ t('title') }}
    </summary>

    <div class="px-5 pb-5 pt-2">
      <!-- Filters -->
      <div class="mb-6 grid gap-4 md:grid-cols-3">
        <UFormField :label="t('filter.transaction_type')">
          <USelect
            v-model="selectedType"
            :items="transactionTypeOptions"
            value-key="value"
            color="neutral"
          />
        </UFormField>

        <UFormField :label="t('filter.date_from')">
          <UInput
            v-model="dateFrom"
            type="date"
            color="neutral"
          />
        </UFormField>

        <UFormField :label="t('filter.date_to')">
          <UInput
            v-model="dateTo"
            type="date"
            color="neutral"
          />
        </UFormField>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="space-y-4">
        <USkeleton class="h-12" />
        <USkeleton class="h-12" />
        <USkeleton class="h-12" />
        <USkeleton class="h-12" />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="py-8 text-center">
        <p class="mb-4 text-red-600 dark:text-red-400">
          {{ t('error_loading') }}
        </p>
        <UButton
          :label="t('retry')"
          color="secondary"
          @click="handleRetry"
        />
      </div>

      <!-- Empty State -->
      <div v-else-if="!transactions?.results?.length" class="py-12 text-center">
        <p class="text-gray-600 dark:text-gray-200">
          {{ t('empty_state') }}
        </p>
      </div>

      <!-- Transactions Table -->
      <div v-else>
        <UTable
          :columns="columns"
          :data="transactions.results"
          class="flex-1"
        />

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="mt-6 flex justify-center">
          <UPagination
            v-model:page="currentPage"
            :total="transactions.count"
            :items-per-page="10"
            color="neutral"
          />
        </div>
      </div>
    </div>
  </details>
</template>

<i18n lang="yaml">
el:
  title: "Ιστορικό Συναλλαγών"
  filter:
    transaction_type: "Τύπος Συναλλαγής"
    all_types: "Όλοι οι τύποι"
    earn: "Κέρδος"
    redeem: "Εξαργύρωση"
    expire: "Λήξη"
    adjust: "Προσαρμογή"
    bonus: "Μπόνους"
    date_from: "Από Ημερομηνία"
    date_to: "Έως Ημερομηνία"
  table:
    points: "Πόντοι"
    type: "Τύπος"
    description: "Περιγραφή"
    date: "Ημερομηνία"
  type:
    earn: "Κέρδος"
    redeem: "Εξαργύρωση"
    expire: "Λήξη"
    adjust: "Προσαρμογή"
    bonus: "Μπόνους"
  empty_state: "Δεν βρέθηκαν συναλλαγές"
  error_loading: "Αποτυχία φόρτωσης συναλλαγών"
  retry: "Δοκιμάστε ξανά"
</i18n>
