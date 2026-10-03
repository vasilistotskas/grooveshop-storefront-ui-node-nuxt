<script lang="ts" setup>
/**
 * The signed-in account area's frame, as the boards draw it: an ink band
 * with the shopper's name, standing and figures across the top, and the
 * account's pages in a sidebar beside the page from `lg` up.
 *
 * On a phone the band shows on the overview alone — whose tiles are the
 * navigation there — and every other account page opens with a way back
 * to it instead.
 *
 * The figures come from one BFF request (`/api/user/account/summary`),
 * lazy so a client navigation into the account never waits on it. Each
 * shows only while the navigation offers its page: the same gates, so
 * the band never quotes points for a programme the store switched off.
 */
defineSlots<{
  default(props: object): any
}>()

const { t, n, locale } = useI18n()
const localePath = useLocalePath()
const img = useMediaStreamImage()
const { user } = useUserSession()
const { items, onOverview } = useAccountNavigation()
const { signOut, signingOut } = useSignOut()

const { data: summary } = useLazyApi<AccountSummary>('/api/user/account/summary', {
  key: 'account-summary',
  method: 'GET',
})

const offers = (key: AccountNavKey) => items.value.some(item => item.key === key)

/** The shopper's name, else their username, else their email. */
const name = computed(() => {
  const full = [user.value?.firstName, user.value?.lastName].filter(Boolean).join(' ')
  return full || user.value?.username || user.value?.email || ''
})

const avatarSrc = computed(() => {
  const path = user.value?.mainImagePath
  if (!path) return undefined
  return img(path, { width: 144, height: 144, fit: 'cover' }, { provider: 'mediaStream' })
})

const tierName = computed(() => {
  const tier = summary.value?.loyalty?.tier
  return tier && offers('rewards') ? extractTranslated(tier, 'name', locale.value) : null
})

const isBusiness = computed(() => offers('business') && summary.value?.businessStatus === 'APPROVED')

const stats = computed(() => {
  const value = summary.value
  if (!value) return []
  return [
    ...(value.loyalty && offers('rewards')
      ? [{ key: 'points', figure: n(value.loyalty.pointsBalance), label: t('stats.points') }]
      : []),
    { key: 'orders', figure: n(value.ordersCount), label: t('stats.orders') },
    ...(value.giftCardBalance !== null && offers('gift_cards')
      ? [{ key: 'gift', figure: n(value.giftCardBalance, 'currency'), label: t('stats.gift_balance') }]
      : []),
  ]
})

const CHIP = 'bg-(--ui-text-inverted)/10 text-inverted ring-0'
</script>

<template>
  <div class="flex flex-col">
    <section
      :aria-label="t('band_label')"
      class="bg-inverted text-inverted"
      :class="onOverview ? '' : 'max-lg:hidden'"
    >
      <UContainer class="flex flex-wrap items-center justify-between gap-x-10 gap-y-6 py-6 lg:py-8">
        <div class="flex min-w-0 items-center gap-4 lg:gap-5">
          <UAvatar
            :src="avatarSrc"
            :alt="name"
            class="size-12 shrink-0 text-lg lg:size-18 lg:text-[1.75rem]"
            :ui="{ root: 'bg-volt', fallback: `
              font-display font-bold text-on-volt
            ` }"
          />
          <div class="flex min-w-0 flex-col gap-2">
            <p class="truncate font-display text-xl/tight font-bold lg:text-[2rem]/tight">
              {{ name }}
            </p>
            <div class="flex flex-wrap items-center gap-1.5">
              <UBadge
                v-if="tierName"
                :label="tierName"
                icon="i-lucide-hourglass"
                class="bg-volt text-on-volt ring-0"
              />
              <UBadge
                v-if="isBusiness"
                :label="t('business')"
                icon="i-lucide-building-2"
                :class="CHIP"
              />
              <UBadge
                v-if="user?.createdAt"
                :class="CHIP"
                class="max-sm:hidden"
              >
                <i18n-t keypath="member_since">
                  <template #date>
                    <NuxtTime
                      :datetime="user.createdAt"
                      :locale="locale"
                      month="short"
                      year="numeric"
                    />
                  </template>
                </i18n-t>
              </UBadge>
            </div>
          </div>
        </div>
        <dl
          v-if="stats.length"
          class="flex gap-8 max-lg:hidden"
        >
          <div
            v-for="stat in stats"
            :key="stat.key"
            class="flex flex-col-reverse items-end gap-1"
          >
            <dt class="text-sm text-inverted/70">
              {{ stat.label }}
            </dt>
            <dd class="font-mono text-[1.75rem]/none font-bold">
              {{ stat.figure }}
            </dd>
          </div>
        </dl>
      </UContainer>
    </section>

    <UContainer class="grid gap-8 py-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12 lg:py-10">
      <nav
        :aria-label="t('nav_label')"
        class="max-lg:hidden"
      >
        <ul class="flex flex-col gap-1">
          <li
            v-for="item in items"
            :key="item.key"
          >
            <ULink
              :to="item.to"
              :aria-current="item.active ? 'page' : undefined"
              raw
              class="
                flex items-center gap-3 rounded-[0.875rem] px-3.5 py-3
                text-[0.9375rem] font-medium transition-colors
              "
              :class="item.active
                ? 'bg-default text-highlighted ring ring-default'
                : 'text-toned hover:bg-elevated/60 hover:text-highlighted'"
            >
              <UIcon
                :name="item.icon"
                class="size-4 shrink-0"
              />
              <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
              <UBadge
                v-if="item.badge"
                :label="String(item.badge)"
                color="secondary"
                variant="soft"
                size="sm"
                class="rounded-full"
              />
            </ULink>
          </li>
        </ul>
        <USeparator class="my-4" />
        <button
          type="button"
          :disabled="signingOut"
          class="
            flex w-full items-center gap-3 rounded-[0.875rem] px-3.5 py-3
            text-[0.9375rem] font-medium text-toned transition-colors
            hover:bg-elevated/60 hover:text-highlighted
            disabled:opacity-60
          "
          @click="signOut"
        >
          <UIcon
            name="i-lucide-log-out"
            class="size-4 shrink-0"
          />
          {{ t('account_nav.sign_out') }}
        </button>
      </nav>

      <!-- `min-w-0`: a grid item defaults to `min-width: auto`, so a wide
           table inside would floor this column at its own width and push
           the page sideways. -->
      <div class="flex min-w-0 flex-col gap-6">
        <ULink
          v-if="!onOverview"
          :to="localePath('account')"
          class="inline-flex items-center gap-1 self-start text-sm font-medium text-toned lg:hidden"
        >
          <UIcon
            name="i-lucide-chevron-left"
            class="size-4"
          />
          {{ t('account_nav.back') }}
        </ULink>
        <slot />
      </div>
    </UContainer>
  </div>
</template>

<i18n lang="yaml">
el:
  band_label: Ο λογαριασμός σου
  nav_label: Σελίδες λογαριασμού
  business: B2B
  member_since: Μέλος από {date}
  stats:
    points: πόντοι
    orders: παραγγελίες
    gift_balance: υπόλοιπο δωροκαρτών
en:
  band_label: Your account
  nav_label: Account pages
  business: B2B
  member_since: Member since {date}
  stats:
    points: points
    orders: orders
    gift_balance: gift balance
</i18n>
