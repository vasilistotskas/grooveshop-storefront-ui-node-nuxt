<script lang="ts" setup>
import type { FooterColumn } from '@nuxt/ui'

/**
 * The storefront footer — light and editorial.
 *
 * Desk: the store (logo, its line, whether it is open, phone and email)
 * beside the newsletter card; then the Shop and Help columns beside the
 * ways to pay; then a bottom bar with the company and legal links in one
 * row, the seller's legal identity and the language and colour-mode
 * controls.
 *
 * Phone: the newsletter card, Shop and Help as a two-column grid, the
 * company and legal links folded into one row, call and email buttons,
 * the opening state, the ways to pay, the legal identity and the
 * controls. The footer keeps clear of the floating tab bar by its own
 * bottom padding.
 *
 * Which links go where is `useFooterNavigation`. Store-level data only,
 * so the footer renders identically for every visitor and stays inside
 * the cached anonymous page; the per-visitor controls — colour mode and
 * cookie settings — render on the client only.
 */
const { t } = useI18n()
const tenantStore = useTenantStore()
const { primary, secondary } = useFooterNavigation()
const { identity } = useMerchantIdentity()
const { isModalActive } = useCookieControl()
const { getPaymentMethodName } = usePaymentMethod()

const mobileBottomNavEnabled = useSettingFlag('MOBILE_BOTTOM_NAV_ENABLED', {
  fallback: true,
})
const giftCardsRuntimeEnabled = useSettingFlag('GIFT_CARDS_ENABLED', {
  fallback: false,
})
const giftCardsEnabled = computed(
  () => tenantStore.giftCardsEnabled && giftCardsRuntimeEnabled.value,
)

/**
 * The payment marks are the store's active pay ways, so the footer can
 * only promise what checkout offers. The list is a cached, per-tenant
 * handler (`server/api/pay-way`), read once per server render.
 *
 * Named the way checkout names them: a pay way's `key` is its
 * `PayWayEnum` key (`PAY_ON_DELIVERY`), which `getPaymentMethodName`
 * turns into the shopper's words. Each way is listed once: two pay ways
 * can share a key (card payments through two processors), and the
 * shopper is told how they can pay, not by whom.
 */
const { data: payWays } = await useApi('/api/pay-way', {
  key: 'footer-pay-ways',
  query: { active: 'true', pageSize: 50 },
})

const paymentMarks = computed(() => [...new Set([
  ...(payWays.value?.results ?? [])
    .flatMap(payWay => payWay.key ? [getPaymentMethodName(payWay.key)] : []),
  ...(giftCardsEnabled.value ? [t('gift_card')] : []),
])])

const carrierMarks = computed(() => tenantStore.shippingCarriers.map(carrier => carrier.name))

const primaryColumns = computed<FooterColumn[]>(() =>
  primary.value.map(column => ({
    label: column.label,
    children: column.children.map(link => ({
      label: link.label,
      to: link.to,
      target: link.to.startsWith('http') ? '_blank' : undefined,
    })),
  })),
)

const currentYear = new Date().getFullYear()
const storeName = computed(() => tenantStore.storeName || '')
</script>

<template>
  <!-- No top margin of its own: a page built from bands ends on a band
       that already carries its padding, and a margin here painted a
       strip of bare ground between the last band and the footer. -->
  <UFooter
    :class="[
      'border-t border-default bg-default',
      // A page with a sticky buy bar (`data-action-bar`: the product
      // page) reserves room for the bar too — above the tab bar on a
      // phone, at the foot of the screen on a desktop.
      mobileBottomNavEnabled
        ? `
          max-lg:pb-[calc(6.5rem+env(safe-area-inset-bottom))]
          max-lg:[body:has([data-action-bar])_&]:pb-[calc(11.25rem+env(safe-area-inset-bottom))]
        `
        : 'max-lg:[body:has([data-action-bar])_&]:pb-[calc(6.5rem+env(safe-area-inset-bottom))]',
      'lg:[body:has([data-action-bar])_&]:pb-22',
    ]"
    :ui="{
      top: `
        pt-7 pb-0
        lg:pt-18
      `,
      container: `
        flex flex-col gap-3.5 py-4.5
        lg:flex-row lg:items-end lg:justify-between lg:gap-6 lg:pt-5 lg:pb-8
      `,
      left: `
        order-1 mt-0 flex-col items-start justify-start gap-2 text-xs text-muted
      `,
      right: `
        order-2 mt-0 justify-start gap-2
        lg:order-3 lg:flex-none
      `,
    }"
  >
    <template #top>
      <UContainer class="flex flex-col gap-5 lg:gap-11">
        <div class="grid items-start gap-5 lg:grid-cols-2 lg:gap-16">
          <div
            class="
              hidden flex-col items-start gap-5
              lg:flex
            "
          >
            <!-- `!w-auto`: Anchor hardcodes `w-full` on its
                 NuxtLinkLocale branch, which in a flex column makes the
                 logo's link span the column. -->
            <Anchor
              :to="'index'"
              :aria-label="storeName"
              class="!w-auto"
            >
              <TenantLogo
                :width="132"
                :height="34"
              />
              <span class="sr-only">{{ storeName }}</span>
            </Anchor>
            <p
              v-if="tenantStore.storeDescription"
              class="
                max-w-110 font-display text-3xl/[1.15] font-bold tracking-tight
                text-highlighted text-balance
              "
            >
              {{ tenantStore.storeDescription }}
            </p>
            <FooterHoursBadge />
            <div class="flex flex-wrap gap-5 text-sm">
              <a
                v-if="identity?.phone"
                :href="`tel:${identity.phone}`"
                class="
                  flex items-center gap-2
                  hover:underline
                "
              >
                <UIcon
                  name="i-heroicons-device-phone-mobile"
                  class="size-4"
                />{{ identity.phone }}
              </a>
              <a
                v-if="identity?.email"
                :href="`mailto:${identity.email}`"
                class="
                  flex items-center gap-2
                  hover:underline
                "
              >
                <UIcon
                  name="i-heroicons-envelope"
                  class="size-4"
                />{{ identity.email }}
              </a>
            </div>
          </div>
          <ChromeFooterNewsletter />
        </div>

        <!-- The design's row is Shop · Help · Pay with · Delivered by on
             `1fr 1fr 1.3fr 1fr`: the link columns take the first half,
             the marks the columns' own right slot. The `xl:` classes
             are not repeats — the component's base theme sets
             `xl:grid-cols-3` and `xl:col-span-2`, which an `lg:` class
             cannot override. -->
        <UFooterColumns
          :columns="primaryColumns"
          :ui="{
            root: `
              lg:grid lg:grid-cols-[2fr_2.3fr] lg:gap-8
              xl:grid-cols-[2fr_2.3fr]
            `,
            center: `
              grid grid-flow-row grid-cols-2 gap-4
              lg:gap-8
              xl:col-span-1
            `,
            right: `
              mt-0 hidden grid-cols-[1.3fr_1fr] items-start gap-8
              lg:grid
            `,
            label: 'text-xs font-bold tracking-wider text-muted uppercase',
            list: 'mt-3 space-y-3',
            link: `
              text-[0.9375rem] font-semibold text-default
              hover:text-highlighted
              lg:font-medium
            `,
          }"
        >
          <template #right>
            <ChromeFooterMarks
              :marks="paymentMarks"
              :label="t('pay_with')"
            />
            <div class="flex flex-col items-start gap-3.5">
              <ChromeFooterMarks
                :marks="carrierMarks"
                :label="t('delivered_by')"
              />
              <UBadge
                v-if="tenantStore.agentCommerceEnabled"
                :label="t('agent_ready')"
                icon="i-heroicons-sparkles"
                class="bg-volt text-on-volt"
              />
            </div>
          </template>
        </UFooterColumns>

        <div
          class="
            flex flex-col gap-5
            lg:hidden
          "
        >
          <UCollapsible
            v-if="secondary.length"
            :ui="{ content: 'pt-3' }"
          >
            <UButton
              :label="t('footer.company_legal')"
              color="neutral"
              variant="ghost"
              trailing-icon="i-heroicons-plus"
              block
              class="
                h-13 justify-between rounded-none border-y border-default px-0
                text-[0.9375rem] font-bold
                hover:bg-transparent
              "
              :ui="{ trailingIcon: `
                transition-transform
                group-data-[state=open]:rotate-45
              ` }"
            />
            <template #content>
              <ul class="flex flex-col gap-3 pb-1">
                <li
                  v-for="(link, index) in secondary"
                  :key="index"
                >
                  <ULink
                    :to="link.to"
                    class="text-[0.9375rem] font-semibold"
                  >
                    {{ link.label }}
                  </ULink>
                </li>
                <li>
                  <ClientOnly>
                    <button
                      type="button"
                      class="text-[0.9375rem] font-semibold"
                      @click="() => { isModalActive = true }"
                    >
                      {{ t('cookie_settings') }}
                    </button>
                  </ClientOnly>
                </li>
              </ul>
            </template>
          </UCollapsible>

          <div
            v-if="identity?.phone || identity?.email"
            class="flex gap-2"
          >
            <UButton
              v-if="identity?.phone"
              :to="`tel:${identity.phone}`"
              :label="t('call')"
              icon="i-heroicons-device-phone-mobile"
              color="neutral"
              variant="outline"
              size="sm"
              class="flex-1 justify-center"
            />
            <UButton
              v-if="identity?.email"
              :to="`mailto:${identity.email}`"
              :label="t('email')"
              icon="i-heroicons-envelope"
              color="neutral"
              variant="outline"
              size="sm"
              class="flex-1 justify-center"
            />
          </div>

          <FooterHoursBadge />

          <ChromeFooterMarks
            :marks="paymentMarks"
            :label="t('pay')"
            inline
          />

          <ChromeFooterMarks
            :marks="carrierMarks"
            :label="t('delivered')"
            inline
          />

          <UBadge
            v-if="tenantStore.agentCommerceEnabled"
            :label="t('agent_ready')"
            icon="i-heroicons-sparkles"
            class="self-start bg-volt text-on-volt"
          />
        </div>

        <USeparator />
      </UContainer>
    </template>

    <template #left>
      <nav
        v-if="secondary.length"
        :aria-label="t('footer.company_legal')"
        class="
          hidden flex-wrap items-center gap-2
          lg:flex
        "
      >
        <template
          v-for="(link, index) in secondary"
          :key="index"
        >
          <span
            v-if="index"
            aria-hidden="true"
          >·</span>
          <ULink
            :to="link.to"
            class="
              text-[0.8125rem] font-semibold text-toned
              hover:text-highlighted
            "
          >
            {{ link.label }}
          </ULink>
        </template>
        <ClientOnly>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            class="
              text-[0.8125rem] font-semibold text-toned
              hover:text-highlighted
            "
            @click="() => { isModalActive = true }"
          >
            {{ t('cookie_settings') }}
          </button>
        </ClientOnly>
      </nav>
      <!-- A <div>, not a <p>: the seller identity is an <address>, which
           a paragraph cannot hold. The browser's parser closed the <p>
           before it, so the server's DOM no longer matched the client's
           and every page hydrated with a mismatch. -->
      <div class="leading-relaxed">
        <!-- Seller identity: N. 4919/2022 art. 22 §4 requires it "σε
             εμφανές σημείο"; the footer is on every page, which is also
             what makes it "permanently accessible" under ECD art. 5(1). -->
        <MerchantIdentity class="inline" />
        <span
          class="
            hidden
            lg:inline
          "
          aria-hidden="true"
        > · </span>
        <span
          class="
            block
            lg:inline
          "
        >© {{ currentYear }} {{ storeName }}</span>
      </div>
    </template>

    <template #right>
      <LanguageSwitcher v-if="tenantStore.availableLocales.length > 1" />
      <!-- Content width, not the app config's form-field `w-full`. The
           select is client-only by itself, with a placeholder in SSR. -->
      <UColorModeSelect
        color="neutral"
        size="sm"
        :ui="{ base: 'w-auto rounded-full font-semibold' }"
      />
    </template>
  </UFooter>
</template>

<i18n lang="yaml">
el:
  pay_with: Πληρωμή με
  pay: Πληρωμή
  delivered_by: Αποστολή με
  delivered: Αποστολή
  gift_card: Δωροκάρτα
  agent_ready: Έτοιμο για AI agents
  cookie_settings: Ρυθμίσεις cookies
  call: Κλήση
  email: Email
en:
  pay_with: Pay with
  pay: Pay
  delivered_by: Delivered by
  delivered: Delivery
  gift_card: Gift card
  agent_ready: AI-agent ready
  cookie_settings: Cookie settings
  call: Call
  email: Email
</i18n>
