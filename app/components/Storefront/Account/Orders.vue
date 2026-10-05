<script lang="ts" setup>
/**
 * The shopper's orders, newest first, as the boards draw them: one row
 * per order with its products, number, status, date, item count and
 * total, and "Buy again" for an order that arrived. The carrier's name
 * follows the item count; an order handled outside any carrier has none.
 *
 * Page and sort live in the query string, so a row's "Details" and the
 * browser's Back return to the same page.
 */
const { t, n, locale } = useI18n()
useHead({ title: () => t('title') })
const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const { reorder, reordering } = useReorder()

const PAGE_SIZE = 8
const SORTS = ['-createdAt', 'createdAt'] as const
type Sort = typeof SORTS[number]

const page = computed(() => Math.max(1, Number(route.query.page) || 1))
const ordering = computed<Sort>(() =>
  SORTS.includes(route.query.ordering as Sort) ? route.query.ordering as Sort : '-createdAt',
)

const { data: orders, status, refresh } = await useApi('/api/orders/my-orders', {
  key: 'account-orders',
  method: 'GET',
  query: { page, pageSize: PAGE_SIZE, ordering },
})

const sortItems = computed(() => [
  { label: t('sort.newest'), value: '-createdAt' },
  { label: t('sort.oldest'), value: 'createdAt' },
])

function sortBy(value: Sort) {
  router.replace({ query: { ...route.query, ordering: value === '-createdAt' ? undefined : value, page: undefined } })
}

const canBuyAgain = (order: Order) => order.status === 'DELIVERED' || order.status === 'COMPLETED'
const itemCount = (order: Order) => order.items.reduce((sum, item) => sum + (item.quantity ?? 0), 0)
const detailsTo = (order: Order) => localePath({ name: 'account-orders-id', params: { id: order.id } })
</script>

<template>
  <div class="flex flex-col gap-6">
    <AccountPageHeader
      :title="t('title')"
      :lead="orders?.count ? t('lead', orders.count) : undefined"
    >
      <template
        v-if="orders?.count"
        #actions
      >
        <USelect
          :model-value="ordering"
          :items="sortItems"
          :aria-label="t('sort.label')"
          class="w-44"
          @update:model-value="sortBy($event as Sort)"
        />
      </template>
    </AccountPageHeader>

    <div
      v-if="status === 'pending' && !orders"
      class="flex flex-col gap-3"
    >
      <USkeleton
        v-for="index in 3"
        :key="index"
        class="h-25 w-full rounded-[1.25rem]"
      />
    </div>

    <AccountLoadError
      v-else-if="status === 'error'"
      :message="t('load_error')"
      @retry="() => refresh()"
    />

    <ul
      v-else-if="orders?.results.length"
      class="flex flex-col gap-3"
    >
      <li
        v-for="order in orders.results"
        :key="order.id"
        class="
          flex flex-col gap-4 rounded-[1.25rem] bg-default p-5 ring ring-default
          sm:flex-row sm:items-center
        "
      >
        <OrderThumbs :items="order.items" />
        <div class="flex min-w-0 flex-1 flex-col gap-1.5">
          <div class="flex flex-wrap items-center gap-2">
            <p class="font-mono font-semibold text-highlighted">
              #{{ order.id }}
            </p>
            <OrderStatusBadge
              :status="order.status"
              :label="order.statusDisplay"
            />
          </div>
          <p class="text-sm text-toned">
            <NuxtTime
              :datetime="order.createdAt"
              :locale="locale"
              day="numeric"
              month="short"
              year="numeric"
            />
            · {{ t('items', itemCount(order)) }}
            <template v-if="order.deliveryMethod.providerName">
              · {{ order.deliveryMethod.providerName }}
            </template>
          </p>
        </div>
        <p class="font-mono font-semibold text-highlighted">
          {{ n(order.paidAmount, 'currency') }}
        </p>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-if="canBuyAgain(order)"
            :label="t('reorder.cta')"
            :loading="reordering === order.id"
            :disabled="reordering !== null && reordering !== order.id"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            size="sm"
            @click="() => reorder(order.id)"
          />
          <UButton
            :label="t('details')"
            :to="detailsTo(order)"
            :aria-label="t('details_of', { id: order.id })"
            color="neutral"
            size="sm"
          />
        </div>
      </li>
    </ul>

    <div
      v-else
      class="flex flex-col items-start gap-3 rounded-[1.25rem] bg-default p-6 ring ring-default"
    >
      <p class="font-semibold text-highlighted">
        {{ t('empty.title') }}
      </p>
      <p class="text-toned">
        {{ t('empty.description') }}
      </p>
      <UButton
        :label="t('empty.cta')"
        :to="localePath('products')"
        color="neutral"
      />
    </div>

    <UPagination
      v-if="orders && orders.count > PAGE_SIZE"
      :page="page"
      :total="orders.count"
      :items-per-page="PAGE_SIZE"
      :to="(target: number) => ({ query: { ...route.query, page: target > 1 ? target : undefined } })"
      class="self-center"
    />
  </div>
</template>

<i18n lang="yaml">
el:
  title: Παραγγελίες
  load_error: Οι παραγγελίες δεν φορτώθηκαν.
  lead: "{n} παραγγελία | {n} παραγγελίες"
  items: "{n} προϊόν | {n} προϊόντα"
  details: Λεπτομέρειες
  details_of: "Λεπτομέρειες της παραγγελίας #{id}"
  sort:
    label: Ταξινόμηση
    newest: Πρώτα οι νεότερες
    oldest: Πρώτα οι παλαιότερες
  empty:
    title: Καμία παραγγελία ακόμα
    description: Ό,τι παραγγείλεις θα εμφανίζεται εδώ, μαζί με την πορεία του.
    cta: Ξεκίνα τις αγορές
en:
  title: Orders
  load_error: Your orders did not load.
  lead: "{n} order | {n} orders"
  items: "{n} item | {n} items"
  details: Details
  details_of: "Details of order #{id}"
  sort:
    label: Sort
    newest: Newest first
    oldest: Oldest first
  empty:
    title: No orders yet
    description: Everything you order shows up here, with where it is.
    cta: Start shopping
</i18n>
