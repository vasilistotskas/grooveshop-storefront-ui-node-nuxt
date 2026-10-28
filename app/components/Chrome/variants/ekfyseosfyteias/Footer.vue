<script lang="ts" setup>
import '~/assets/css/tenants/ekfyseosfyteias.css'

/**
 * «Εκ φύσεως Φυτειάς» footer, built to the `Footer` artboard: an ink band
 * with the seal beside an italic invitation and one apricot phone button,
 * a dashed rule, four columns, the ΕΣΠΑ banner in a white box, and the
 * legal line.
 *
 * Every column is data the platform already holds, and a column with
 * nothing to show is left out rather than printed empty:
 * - Διεύθυνση: the public offices (`STORE_OFFICES`, `useStoreOffices`).
 * - Επικοινωνία: the published `INVOICE_SELLER_PHONE` and
 *   `INVOICE_SELLER_EMAIL` (`useMerchantIdentity`).
 * - Ωράριο: `BUSINESS_HOURS`, consecutive days with the same hours run
 *   together, then the tenant's social links (`socials*` on the tenant).
 * - Ο ιστότοπος: the footer navigation (`useFooterNavigation`) — the
 *   `NavigationMenu` footer rows when configured.
 * The legal line is the merchant identity (`MerchantIdentity`: ΓΕΜΗ and
 * ΑΦΜ, which N. 4919/2022 art. 22 wants on the e-shop) and the
 * navigation's legal links.
 *
 * The ΕΣΠΑ banner is the same `FUNDING_BANNER` setting as the strip above
 * the header, in its framed form. The logo is capped like the header's
 * (`clamp(40px, 6vw, 72px)` against a banner up to 760px wide): the EU
 * emblem may not be smaller than any other logo on the page.
 *
 * Colours are the `--fy-*` roles only.
 */
const { t } = useStoreI18n('components/Chrome/variants/ekfyseosfyteias/Footer')
const tenantStore = useTenantStore()
const { identity } = useMerchantIdentity()
const { offices } = useStoreOffices()
const { hasData: hasHours, schedule } = useBusinessHours()
const { primary, secondary } = useFooterNavigation()
const { logoLightUrl } = useTenantBranding()
const { isModalActive } = useCookieControl()

const SOCIALS = [
  { key: 'facebook', icon: 'i-mdi-facebook' },
  { key: 'instagram', icon: 'i-mdi-instagram' },
  { key: 'youtube', icon: 'i-mdi-youtube' },
  { key: 'tiktok', icon: 'i-ant-design-tik-tok-filled' },
  { key: 'pinterest', icon: 'i-mdi-pinterest' },
  { key: 'linkedin', icon: 'i-mdi-linkedin' },
  { key: 'reddit', icon: 'i-mdi-reddit' },
  { key: 'discord', icon: 'i-mdi-discord' },
] as const

const year = new Date().getFullYear()

const phone = computed(() => identity.value?.phone?.trim() ?? '')
const email = computed(() => identity.value?.email?.trim() ?? '')
const telHref = computed(() => `tel:${phone.value.replace(/\s+/g, '')}`)

const hours = computed(() =>
  schedule.value
    ? groupBusinessHours(schedule.value).map(group => ({
        key: group.from,
        days: group.from === group.to
          ? t(`days.${group.from}`)
          : `${t(`days.${group.from}`)} – ${t(`days.${group.to}`)}`,
        entry: group.entry,
      }))
    : [],
)

const socials = computed(() =>
  SOCIALS.flatMap(({ key, icon }) => {
    const url = tenantStore.socials[key]
    return url ? [{ key, icon, url, label: t(`socials.${key}`) }] : []
  }),
)

const pages = computed(() =>
  primary.value.flatMap(column => column.children),
)
</script>

<template>
  <footer class="bg-(--fy-ink-band) text-(color:--fy-on-ink)">
    <div
      class="
        mx-auto flex w-full max-w-(--ui-container) flex-col gap-11 px-4 pt-14
        pb-9
        sm:px-6
        md:pt-18
        lg:px-8
      "
    >
      <div class="flex flex-wrap items-center justify-between gap-7">
        <div class="flex flex-wrap items-center gap-6">
          <span
            v-if="logoLightUrl"
            class="
              flex shrink-0
              [&>img]:size-[clamp(40px,6vw,72px)]!
            "
          >
            <TenantLogo
              :width="72"
              :height="72"
              img-class="object-center"
            />
          </span>
          <p
            class="
              max-w-[15em] font-display text-[clamp(30px,3.2vw,44px)]
              leading-[1.1] font-semibold text-balance italic
            "
          >
            {{ t('invitation') }}
          </p>
        </div>
        <a
          v-if="phone"
          :href="telHref"
          class="
            inline-flex min-h-14 items-center gap-3 rounded-full
            bg-(--fy-accent) px-6.5 text-[17px] font-bold
            text-(color:--fy-on-accent)
            focus-visible:outline-3 focus-visible:outline-offset-3
            focus-visible:outline-(color:--fy-on-ink)
          "
        >
          <UIcon
            name="i-lucide:phone"
            class="size-5"
            aria-hidden="true"
          />
          {{ t('call', { phone }) }}
        </a>
      </div>

      <div class="border-t-[1.5px] border-dashed border-(color:--fy-rule-on-ink)" />

      <div
        class="
          grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-x-10
          gap-y-8
        "
      >
        <section
          v-if="offices.length"
          class="flex flex-col gap-2.5"
        >
          <h2
            class="
              text-[13px] font-bold tracking-[0.14em] text-(color:--fy-accent)
              uppercase
            "
          >
            {{ t('address') }}
          </h2>
          <address class="flex flex-col gap-3 not-italic">
            <p
              v-for="office in offices"
              :key="office.label"
              class="text-base leading-[1.6] text-(color:--fy-on-ink-muted)"
            >
              {{ office.addressLine }}
            </p>
          </address>
        </section>

        <section
          v-if="phone || email"
          class="flex flex-col gap-2.5"
        >
          <h2
            class="
              text-[13px] font-bold tracking-[0.14em] text-(color:--fy-accent)
              uppercase
            "
          >
            {{ t('contact') }}
          </h2>
          <a
            v-if="phone"
            :href="telHref"
            class="
              w-fit rounded-sm text-base underline underline-offset-3
              focus-visible:outline-3 focus-visible:outline-offset-2
              focus-visible:outline-(color:--fy-on-ink)
            "
          >{{ phone }}</a>
          <a
            v-if="email"
            :href="`mailto:${email}`"
            class="
              w-fit rounded-sm text-base break-all underline underline-offset-3
              focus-visible:outline-3 focus-visible:outline-offset-2
              focus-visible:outline-(color:--fy-on-ink)
            "
          >{{ email }}</a>
        </section>

        <section
          v-if="hasHours || socials.length"
          class="flex flex-col gap-2.5"
        >
          <template v-if="hasHours">
            <h2
              class="
                text-[13px] font-bold tracking-[0.14em] text-(color:--fy-accent)
                uppercase
              "
            >
              {{ t('hours') }}
            </h2>
            <ul class="flex flex-col gap-2 text-base text-(color:--fy-on-ink-muted)">
              <li
                v-for="row in hours"
                :key="row.key"
                class="flex flex-col"
              >
                <span>{{ row.days }}</span>
                <span
                  v-if="row.entry"
                  class="tabular-nums"
                >{{ row.entry.opens }} – {{ row.entry.closes }}</span>
                <span v-else>{{ t('closed') }}</span>
              </li>
            </ul>
          </template>
          <ul
            v-if="socials.length"
            class="mt-1.5 flex flex-wrap gap-2"
          >
            <li
              v-for="social in socials"
              :key="social.key"
            >
              <a
                :href="social.url"
                target="_blank"
                rel="noopener noreferrer"
                :aria-label="social.label"
                class="
                  flex size-11 items-center justify-center rounded-full border-[1.5px]
                  border-(color:--fy-rule-on-ink)
                  focus-visible:outline-3 focus-visible:outline-offset-2
                  focus-visible:outline-(color:--fy-on-ink)
                "
              >
                <UIcon
                  :name="social.icon"
                  class="size-[18px]"
                  aria-hidden="true"
                />
              </a>
            </li>
          </ul>
        </section>

        <nav
          v-if="pages.length"
          :aria-label="t('pages_label')"
          class="flex flex-col gap-2.5"
        >
          <h2
            class="
              text-[13px] font-bold tracking-[0.14em] text-(color:--fy-accent)
              uppercase
            "
          >
            {{ t('site') }}
          </h2>
          <ul class="flex flex-col gap-2.5">
            <li
              v-for="link in pages"
              :key="link.to"
            >
              <NuxtLink
                :to="link.to"
                class="
                  inline-flex min-h-6 items-center rounded-sm text-base underline
                  underline-offset-3
                  focus-visible:outline-3 focus-visible:outline-offset-2
                  focus-visible:outline-(color:--fy-on-ink)
                "
              >
                {{ link.label }}
              </NuxtLink>
            </li>
          </ul>
        </nav>
      </div>

      <ChromeFundingBanner framed />

      <div
        class="
          flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-sm
          text-(color:--fy-on-ink-muted)
        "
      >
        <div class="flex flex-col gap-1">
          <p>© {{ year }} {{ tenantStore.storeName }}</p>
          <MerchantIdentity />
        </div>
        <ul class="flex flex-wrap gap-x-5 gap-y-1">
          <li
            v-for="link in secondary"
            :key="link.to"
          >
            <NuxtLink
              :to="link.to"
              class="
                inline-flex min-h-6 items-center rounded-sm underline
                underline-offset-3
                focus-visible:outline-3 focus-visible:outline-offset-2
                focus-visible:outline-(color:--fy-on-ink)
              "
            >
              {{ link.label }}
            </NuxtLink>
          </li>
          <li v-if="tenantStore.hasOptionalServices">
            <ClientOnly>
              <button
                type="button"
                class="
                  inline-flex min-h-6 items-center rounded-sm underline
                  underline-offset-3
                  focus-visible:outline-3 focus-visible:outline-offset-2
                  focus-visible:outline-(color:--fy-on-ink)
                "
                @click="() => { isModalActive = true }"
              >
                {{ t('cookie_settings') }}
              </button>
            </ClientOnly>
          </li>
        </ul>
      </div>
    </div>
  </footer>
</template>

<i18n lang="yaml">
el:
  invitation: Ελάτε να μας βρείτε στη Φυτειά.
  call: 'Καλέστε μας · {phone}'
  address: Διεύθυνση
  contact: Επικοινωνία
  hours: Ωράριο
  closed: Κλειστά
  site: Ο ιστότοπος
  pages_label: Σελίδες υποσέλιδου
  cookie_settings: Ρυθμίσεις cookies
  days:
    mon: Δευτέρα
    tue: Τρίτη
    wed: Τετάρτη
    thu: Πέμπτη
    fri: Παρασκευή
    sat: Σάββατο
    sun: Κυριακή
  socials:
    facebook: Facebook
    instagram: Instagram
    youtube: YouTube
    tiktok: TikTok
    pinterest: Pinterest
    linkedin: LinkedIn
    reddit: Reddit
    discord: Discord
en:
  invitation: Come and find us in Fytia.
  call: 'Call us · {phone}'
  address: Address
  contact: Contact
  hours: Opening hours
  closed: Closed
  site: The website
  pages_label: Footer pages
  cookie_settings: Cookie settings
  days:
    mon: Monday
    tue: Tuesday
    wed: Wednesday
    thu: Thursday
    fri: Friday
    sat: Saturday
    sun: Sunday
  socials:
    facebook: Facebook
    instagram: Instagram
    youtube: YouTube
    tiktok: TikTok
    pinterest: Pinterest
    linkedin: LinkedIn
    reddit: Reddit
    discord: Discord
</i18n>
