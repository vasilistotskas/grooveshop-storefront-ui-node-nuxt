<script lang="ts" setup>
import type { RouteLocationNamedI18n } from 'vue-router'
import '~/assets/css/tenants/ekfyseosfyteias.css'

/**
 * «Εκ φύσεως Φυτειάς» header, built to the `Header` and `Mobile`
 * artboards: a paper band with a dashed rule beneath, the seal and the
 * store's name on the left, the page links as pills and one phone button
 * on the right. A phone gets the seal, the name and a round menu button
 * that opens the same links in large type below the bar.
 *
 * What the design deliberately does not have, and so neither does this:
 * search, the cart, favourites, an account menu, a language switcher and
 * a colour-mode button. The store is Greek-only and sells nothing online.
 *
 * Data, not markup: the links are the tenant's `NavigationMenu` header
 * rows (`useNavigation`), the phone number is the published
 * `INVOICE_SELLER_PHONE` (`useMerchantIdentity`, the same value the
 * contact page's methods card prints) and the logo is the tenant's own.
 * A store that has published no phone gets no button.
 *
 * The logo's size is the ΕΣΠΑ rule, not taste: Annex IX §1.7 of Reg.
 * 2021/1060 wants the EU emblem at least as large as any other logo on
 * the page, and the funding strip's emblem is 14.6% of its width wide.
 * `clamp(36px, 9vw, 54px)` keeps the seal under it at every width.
 *
 * Colours are the `--fy-*` roles only (see the tenant stylesheet), so
 * light and dark are decided in one place.
 */
const { t } = useI18n()
const route = useRoute()
const tenantStore = useTenantStore()
const { headerItems } = useNavigation()
const { identity } = useMerchantIdentity()
const { logoLightUrl } = useTenantBranding()

const MENU_ID = 'fy-mobile-menu'

const open = ref(false)
const menuButton = useTemplateRef<HTMLButtonElement>('menuButton')

const links = computed(() => headerItems.value ?? [])

const phone = computed(() => identity.value?.phone?.trim() ?? '')
const telHref = computed(() => `tel:${phone.value.replace(/\s+/g, '')}`)

/**
 * Active state for an operator-configured PATH. The rows hold unprefixed
 * paths while the live route may carry a locale prefix, so the prefix
 * comes off through `splitLocale` before comparing.
 */
const isActive = (path?: string) => {
  if (!path) return false
  const current = splitLocale(route.path).route
  if (path === '/') return current === '/'
  return current === path || current.startsWith(`${path}/`)
}

watch(() => route.fullPath, () => {
  open.value = false
})

onKeyStroke('Escape', () => {
  if (!open.value) return
  open.value = false
  menuButton.value?.focus()
})
</script>

<template>
  <header
    class="
      border-b-[1.5px] border-dashed border-(color:--fy-rule) bg-(--fy-ground)
      text-(color:--fy-text)
    "
  >
    <div
      class="
        mx-auto flex w-full max-w-(--ui-container) flex-wrap items-center
        justify-between gap-x-8 gap-y-3 px-4 py-2.5
        sm:px-6
        md:py-3.5
        lg:px-8
      "
    >
      <NuxtLinkLocale
        to="index"
        class="
          flex min-w-0 items-center gap-2.5 rounded-sm
          focus-visible:outline-3 focus-visible:outline-offset-3
          focus-visible:outline-(color:--fy-focus)
          sm:gap-3.5
        "
      >
        <span
          v-if="logoLightUrl"
          class="
            flex shrink-0
            [&>img]:size-[clamp(36px,9vw,54px)]!
          "
        >
          <TenantLogo
            :width="54"
            :height="54"
            img-class="object-center"
          />
        </span>
        <span class="flex min-w-0 flex-col gap-0.5 sm:gap-[3px]">
          <span
            class="
              font-display text-[19px] leading-none font-extrabold
              tracking-[-0.01em]
              sm:text-2xl
            "
          >{{ tenantStore.storeName }}</span>
          <span
            class="
              text-[11.5px] font-medium text-(color:--fy-text-muted)
              sm:text-[12.5px] sm:tracking-[0.02em]
            "
          >
            <span class="sm:hidden">{{ t('taglineShort') }}</span>
            <span class="max-sm:hidden">{{ t('tagline') }}</span>
          </span>
        </span>
      </NuxtLinkLocale>

      <div class="flex items-center gap-x-5 gap-y-2 max-md:hidden md:flex-wrap">
        <nav
          v-if="links.length"
          :aria-label="t('navigation')"
        >
          <ul class="flex flex-wrap items-center gap-1">
            <li
              v-for="item in links"
              :key="item.label"
            >
              <NuxtLinkLocale
                :to="(item.to ?? '/') as RouteLocationNamedI18n"
                class="
                  inline-flex min-h-11 items-center gap-2 rounded-full px-3.5
                  text-[15.5px] font-semibold
                  hover:bg-(--fy-chip)
                  focus-visible:outline-3 focus-visible:outline-offset-2
                  focus-visible:outline-(color:--fy-focus)
                "
                :class="isActive(item.to) && 'bg-(--fy-chip)'"
                :aria-current="isActive(item.to) ? 'page' : undefined"
              >
                <span
                  v-if="isActive(item.to)"
                  aria-hidden="true"
                  class="size-2 rounded-full bg-(--fy-accent)"
                />
                {{ item.label }}
              </NuxtLinkLocale>
            </li>
          </ul>
        </nav>
        <a
          v-if="phone"
          :href="telHref"
          class="
            inline-flex min-h-[46px] items-center gap-2.5 rounded-full
            bg-(--fy-ink-band) px-5 text-[15px] font-semibold tracking-[0.01em]
            text-(color:--fy-on-ink)
            focus-visible:outline-3 focus-visible:outline-offset-2
            focus-visible:outline-(color:--fy-focus)
            dark:ring-1 dark:ring-(color:--fy-rule-on-ink)
          "
        >
          <UIcon
            name="i-lucide:phone"
            class="size-[18px]"
            aria-hidden="true"
          />
          {{ phone }}
        </a>
      </div>

      <button
        ref="menuButton"
        type="button"
        class="
          flex size-12 shrink-0 items-center justify-center rounded-full
          border-2 border-(color:--fy-text)
          focus-visible:outline-3 focus-visible:outline-offset-3
          focus-visible:outline-(color:--fy-focus)
          md:hidden
        "
        :aria-label="t('menu')"
        :aria-expanded="open"
        :aria-controls="MENU_ID"
        @click="() => { open = !open }"
      >
        <UIcon
          :name="open ? 'i-lucide:x' : 'i-lucide:menu'"
          class="size-[22px]"
          aria-hidden="true"
        />
      </button>
    </div>

    <nav
      v-show="open"
      :id="MENU_ID"
      :aria-label="t('navigation')"
      class="
        mx-auto flex w-full max-w-(--ui-container) flex-col gap-1 border-t-[1.5px]
        border-dashed border-(color:--fy-rule) px-4 pt-2 pb-6
        sm:px-6
        md:hidden
      "
    >
      <NuxtLinkLocale
        v-for="item in links"
        :key="item.label"
        :to="(item.to ?? '/') as RouteLocationNamedI18n"
        class="
          flex min-h-[52px] items-center gap-3 rounded-sm font-display text-[26px]
          font-bold
          focus-visible:outline-3 focus-visible:outline-offset-2
          focus-visible:outline-(color:--fy-focus)
        "
        :aria-current="isActive(item.to) ? 'page' : undefined"
      >
        <span
          v-if="isActive(item.to)"
          aria-hidden="true"
          class="size-2.5 rounded-full bg-(--fy-accent)"
        />
        {{ item.label }}
      </NuxtLinkLocale>
      <a
        v-if="phone"
        :href="telHref"
        class="
          mt-3 flex min-h-[54px] items-center justify-center rounded-full
          bg-(--fy-ink-band) text-base font-semibold text-(color:--fy-on-ink)
          focus-visible:outline-3 focus-visible:outline-offset-2
          focus-visible:outline-(color:--fy-focus)
          dark:ring-1 dark:ring-(color:--fy-rule-on-ink)
        "
      >{{ t('call', { phone }) }}</a>
    </nav>
  </header>
</template>

<i18n lang="yaml">
el:
  menu: Μενού
  navigation: Κύριο μενού
  tagline: ΚοινΣΕπ Γυναικών · Φυτειά Ημαθίας
  taglineShort: ΚοινΣΕπ Γυναικών · Ημαθία
  call: 'Καλέστε μας · {phone}'
en:
  menu: Menu
  navigation: Main menu
  tagline: Women's social co-operative · Fytia, Imathia
  taglineShort: Women's co-operative · Imathia
  call: 'Call us · {phone}'
</i18n>
