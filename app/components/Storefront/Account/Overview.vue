<script lang="ts" setup>
/**
 * The account overview, as the boards draw it: the latest order and the
 * rewards card side by side, the profile at a glance under them. On a
 * phone the account's pages follow as tiles — the overview is the
 * navigation there (`Chrome/AccountShell.vue` hides its sidebar below
 * `lg`) — and the page ends with signing out.
 */
const { t, n, locale } = useI18n()
useHead({ title: () => t('title') })
const localePath = useLocalePath()
const { user } = useUserSession()
const { items } = useAccountNavigation()
const { signOut, signingOut } = useSignOut()

const { data: latest, status: latestStatus, refresh: refreshLatest } = await useApi('/api/orders/my-orders', {
  key: 'account-latest-order',
  method: 'GET',
  query: { pageSize: 1, ordering: '-createdAt' },
})

const latestOrder = computed(() => latest.value?.results[0])
const offersRewards = computed(() => items.value.some(item => item.key === 'rewards'))
const tiles = computed(() => items.value.filter(item => item.key !== 'overview'))

const greetingName = computed(() =>
  user.value?.firstName || user.value?.username || user.value?.email || '',
)

const profile = computed(() => {
  const value = user.value
  if (!value) return []
  return [
    { key: 'email', value: value.email },
    { key: 'phone', value: value.phone },
    { key: 'username', value: value.username },
    { key: 'location', value: [value.city, value.country].filter(Boolean).join(', ') },
  ].filter(row => row.value)
})

const itemCount = (order: Order) => order.items.reduce((sum, item) => sum + (item.quantity ?? 0), 0)
</script>

<template>
  <div class="flex flex-col gap-6">
    <AccountPageHeader
      :title="t('welcome', { name: greetingName })"
      :lead="t('lead')"
    />

    <div
      class="grid gap-5"
      :class="offersRewards ? 'lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]' : ''"
    >
      <section
        aria-labelledby="latest-order-title"
        class="flex flex-col gap-4 rounded-[1.25rem] bg-default p-6 ring ring-default"
      >
        <div class="flex items-center justify-between gap-3">
          <h2
            id="latest-order-title"
            class="font-semibold text-highlighted"
          >
            {{ t('latest_order') }}
          </h2>
          <ULink
            v-if="latestOrder"
            :to="localePath('account-orders')"
            class="text-sm font-semibold text-accent"
          >
            {{ t('all_orders') }}
          </ULink>
        </div>

        <USkeleton
          v-if="latestStatus === 'pending'"
          class="h-20 w-full rounded-[0.875rem]"
        />
        <div
          v-else-if="latestStatus === 'error'"
          role="alert"
          class="flex flex-col items-start gap-3"
        >
          <p class="text-toned">
            {{ t('latest_error') }}
          </p>
          <UButton
            :label="t('retry')"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            size="sm"
            @click="() => refreshLatest()"
          />
        </div>
        <ULink
          v-else-if="latestOrder"
          :to="localePath({ name: 'account-orders-id', params: { id: latestOrder.id } })"
          raw
          class="group flex flex-col gap-4"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <OrderThumbs :items="latestOrder.items" />
            <div class="flex min-w-0 flex-1 flex-col gap-1">
              <div class="flex items-center justify-between gap-3">
                <p class="font-mono font-semibold text-highlighted group-hover:underline">
                  #{{ latestOrder.id }}
                </p>
                <OrderStatusBadge
                  :status="latestOrder.status"
                  :label="latestOrder.statusDisplay"
                  class="shrink-0"
                />
              </div>
              <p class="text-sm text-toned">
                <NuxtTime
                  :datetime="latestOrder.createdAt"
                  :locale="locale"
                  day="numeric"
                  month="short"
                  year="numeric"
                />
                · {{ t('items', itemCount(latestOrder)) }}
                · {{ n(latestOrder.paidAmount, 'currency') }}
              </p>
            </div>
          </div>
          <OrderProgress :status="latestOrder.status" />
        </ULink>
        <div
          v-else
          class="flex flex-col items-start gap-3"
        >
          <p class="text-toned">
            {{ t('no_orders') }}
          </p>
          <UButton
            :label="t('start_shopping')"
            :to="localePath('products')"
            color="neutral"
            variant="outline"
            size="sm"
          />
        </div>
      </section>

      <LoyaltyRewardsCard v-if="offersRewards" />
    </div>

    <nav
      :aria-label="t('pages')"
      class="lg:hidden"
    >
      <ul class="grid grid-cols-3 gap-2.5">
        <li
          v-for="tile in tiles"
          :key="tile.key"
        >
          <ULink
            :to="tile.to"
            raw
            class="
              relative flex h-full flex-col gap-5 rounded-[1.125rem] bg-default p-3.5
              text-sm font-semibold text-highlighted ring ring-default
            "
          >
            <UIcon
              :name="tile.icon"
              class="size-5"
            />
            <span>{{ tile.label }}</span>
            <UBadge
              v-if="tile.badge"
              :label="String(tile.badge)"
              color="secondary"
              variant="soft"
              size="sm"
              class="absolute end-3 top-3 rounded-full"
            />
          </ULink>
        </li>
      </ul>
    </nav>

    <section
      v-if="profile.length"
      aria-labelledby="profile-title"
      class="flex flex-col gap-5 rounded-[1.25rem] bg-default p-6 ring ring-default"
    >
      <div class="flex items-center justify-between gap-3">
        <h2
          id="profile-title"
          class="font-semibold text-highlighted"
        >
          {{ t('profile') }}
        </h2>
        <ULink
          :to="localePath('account-settings')"
          class="text-sm font-semibold text-accent"
        >
          {{ t('edit') }}
        </ULink>
      </div>
      <dl class="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <div
          v-for="row in profile"
          :key="row.key"
          class="flex min-w-0 flex-col gap-1"
        >
          <dt class="text-xs font-medium text-toned">
            {{ t(`fields.${row.key}`) }}
          </dt>
          <dd class="truncate text-highlighted">
            {{ row.value }}
          </dd>
        </div>
      </dl>
    </section>

    <UButton
      :label="t('account_nav.sign_out')"
      :loading="signingOut"
      icon="i-lucide-log-out"
      color="neutral"
      variant="outline"
      size="lg"
      block
      class="lg:hidden"
      @click="signOut"
    />
  </div>
</template>

<i18n lang="yaml">
el:
  title: Επισκόπηση λογαριασμού
  welcome: Καλώς ήρθες ξανά, {name}
  lead: Τι συμβαίνει με τον λογαριασμό σου.
  latest_order: Τελευταία παραγγελία
  all_orders: Όλες οι παραγγελίες
  items: "{n} προϊόν | {n} προϊόντα"
  no_orders: Δεν έχεις κάνει ακόμα καμία παραγγελία.
  latest_error: Η τελευταία σου παραγγελία δεν φορτώθηκε.
  retry: Δοκίμασε ξανά
  start_shopping: Ξεκίνα τις αγορές
  pages: Σελίδες λογαριασμού
  profile: Προφίλ
  edit: Επεξεργασία
  fields:
    email: Email
    phone: Τηλέφωνο
    username: Όνομα χρήστη
    location: Τοποθεσία
en:
  title: Account overview
  welcome: Welcome back, {name}
  lead: Here is what is happening with your account.
  latest_order: Latest order
  all_orders: All orders
  items: "{n} item | {n} items"
  no_orders: You have not placed an order yet.
  latest_error: Your latest order did not load.
  retry: Try again
  start_shopping: Start shopping
  pages: Account pages
  profile: Profile
  edit: Edit
  fields:
    email: Email
    phone: Phone
    username: Username
    location: Location
</i18n>
