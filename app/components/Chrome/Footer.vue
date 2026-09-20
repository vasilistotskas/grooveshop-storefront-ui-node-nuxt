<script lang="ts" setup>
/**
 * The storefront footer.
 *
 * ONE component for both breakpoints. The previous default shipped a
 * desktop footer and a mobile one and picked between them with
 * `useDevice`, so a store's whole link graph depended on user-agent
 * sniffing being right; here the columns are a grid that stacks, which
 * is the same markup at every width and always in the DOM for a
 * crawler.
 *
 * Everything is store-level data, so it renders identically for every
 * visitor and stays inside the cached anonymous page. The one
 * per-visitor control — cookie settings — is `ClientOnly`.
 *
 * Payment and carrier marks are deliberately NOT here: they are the
 * `trust_badges` section, which an operator places where the design
 * wants it. Fetching them on every page to decorate the footer would
 * cost two requests per route for something a page can say better.
 */
const { t } = useI18n()
const tenantStore = useTenantStore()
const runtimeConfig = useRuntimeConfig()
const { columns } = useFooterLinks()
const { isModalActive } = useCookieControl()

const currentYear = new Date().getFullYear()
const packageVersion = runtimeConfig.public.version
const storeName = computed(() => tenantStore.storeName || '')
</script>

<template>
  <footer class="mt-16 border-t border-default bg-muted">
    <UContainer class="py-10">
      <div
        class="
          grid gap-8
          lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]
        "
      >
        <div class="flex flex-col items-start gap-4">
          <!-- `!w-auto`: Anchor hardcodes `w-full` on its
               NuxtLinkLocale branch, which in a flex row makes the
               logo eat every other child. -->
          <Anchor
            :to="'index'"
            :aria-label="storeName"
            class="!w-auto"
          >
            <TenantLogo
              :width="132"
              :height="36"
            />
            <span class="sr-only">{{ storeName }}</span>
          </Anchor>

          <!-- Seller identity: N. 4919/2022 art. 22 §4 requires it "σε
               εμφανές σημείο"; the footer is on every page, which is
               also what makes it "permanently accessible" under ECD
               art. 5(1). -->
          <MerchantIdentity />
          <FooterHoursBadge />
          <Socials />
        </div>

        <div
          class="
            grid gap-6
            sm:grid-cols-2
            lg:grid-cols-3
          "
        >
          <nav
            v-for="column in columns"
            :key="column.label"
            class="flex flex-col gap-2"
          >
            <p class="text-xs font-medium tracking-wide text-muted uppercase">
              {{ column.label }}
            </p>
            <ul class="flex flex-col gap-1.5">
              <li
                v-for="link in column.children"
                :key="link.label"
              >
                <!-- `to` covers both: an operator's external entry is
                     an https URL, which NuxtLink renders as an external
                     anchor on its own. -->
                <ULink
                  :to="link.to"
                  :target="link.to.startsWith('http') ? '_blank' : undefined"
                  class="
                    text-sm text-default
                    hover:text-highlighted
                  "
                >
                  {{ link.label }}
                </ULink>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </UContainer>

    <div class="border-t border-default">
      <UContainer
        class="
          flex flex-col-reverse items-center justify-between gap-3 py-5
          sm:flex-row
        "
      >
        <p class="text-xs text-muted">
          © {{ currentYear }} {{ storeName }}
          <span class="sr-only">v{{ packageVersion }}</span>
        </p>

        <ClientOnly>
          <UButton
            :label="t('cookie_settings')"
            icon="i-heroicons-shield-check"
            color="neutral"
            variant="link"
            size="xs"
            @click="() => { isModalActive = true }"
          />
        </ClientOnly>
      </UContainer>
    </div>
  </footer>
</template>

<i18n lang="yaml">
el:
  cookie_settings: Ρυθμίσεις cookies
en:
  cookie_settings: Cookie settings
</i18n>
