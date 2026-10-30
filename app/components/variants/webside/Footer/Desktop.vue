<script lang="ts" setup>
const siteConfig = useSiteConfig()
const localePath = useLocalePath()
const { t } = useStoreI18n('components/variants/webside/Footer/Desktop')
const { columns, aboutColumnIndex } = useFooterLinks()
const { isModalActive } = useCookieControl()
const tenantStore = useTenantStore()
const runtimeConfig = useRuntimeConfig()

const packageVersion = runtimeConfig.public.version
const currentYear = new Date().getFullYear()

const openCookieModal = () => {
  isModalActive.value = true
}
</script>

<template>
  <UFooter
    class="
      mt-6 hidden border-t-2 border-primary-500 bg-primary-50
      md:block
      dark:bg-primary-900
    "
  >
    <template #top>
      <UContainer>
        <UFooterColumns
          :columns="columns"
          :ui="{ center: 'xl:col-span-3' }"
        >
          <!-- UFooterColumns draws only links under a column, so the columns
               are drawn here, with its classes: the seller identity sits
               under the column of the About page. -->
          <div
            v-for="(column, index) in columns"
            :key="index"
          >
            <h3 class="text-sm font-semibold">
              {{ column.label }}
            </h3>
            <ul class="mt-6 space-y-4">
              <li
                v-for="link in column.children"
                :key="link.to"
                class="relative"
              >
                <ULink
                  :to="link.to"
                  active-class="font-medium text-primary"
                  inactive-class="text-muted transition-colors hover:text-default"
                  class="
                    group flex items-center gap-1.5 rounded-sm text-sm
                    outline-primary/25
                    focus-visible:outline-3
                  "
                >
                  <span class="truncate">{{ link.label }}</span>
                </ULink>
              </li>
            </ul>
            <!-- Seller identity: N. 4919/2022 art. 22 §4 requires it "σε
                 εμφανές σημείο"; the footer is on every page, which is also
                 what makes it "permanently accessible" under ECD art. 5. -->
            <WebsideMerchantIdentity
              v-if="index === aboutColumnIndex"
              class="mt-6"
            />
          </div>
        </UFooterColumns>
      </UContainer>
    </template>

    <template #left>
      <div class="flex flex-col gap-1">
        <!-- A footer with no About column keeps the seller identity here:
             the law wants it on every page whichever way the footer is laid
             out. -->
        <WebsideMerchantIdentity v-if="aboutColumnIndex === -1" />
        <WebsideFooterHoursBadge />
        <div
          class="
            flex flex-wrap items-center gap-x-3 gap-y-1 text-sm
            text-primary-950
            dark:text-primary-100
          "
        >
          <span>
            &copy; {{ currentYear }}&nbsp;
            <UButton
              :label="`${siteConfig.name}™.`"
              :to="localePath('index')"
              class="p-0 text-primary-950 dark:text-primary-50"
              color="neutral"
              size="lg"
              type="button"
              variant="link"
            /> {{ t('all_rights_reserved') }}.
          </span>
          <template v-if="tenantStore.hasOptionalServices">
            <span aria-hidden="true" class="text-primary-400">·</span>
            <UButton
              :label="t('cookie_settings')"
              icon="i-unjs:cookie-es"
              color="neutral"
              variant="link"
              size="sm"
              class="p-0"
              @click="openCookieModal"
            />
          </template>
        </div>
      </div>
    </template>

    <template #right>
      <div class="flex items-center gap-6">
        <WebsideSocials
          :button-size="'sm'"
          :icon-class="'text-xl'"
        />
        <span
          class="
            text-xs text-primary-950
            dark:text-primary-300
          "
        >Version: {{ packageVersion }}</span>
      </div>
    </template>
  </UFooter>
</template>

<i18n lang="yaml">
el:
  all_rights_reserved: Με επιφύλαξη παντός δικαιώματος
  cookie_settings: Ρυθμίσεις cookies
en:
  all_rights_reserved: All rights reserved
  cookie_settings: Cookie settings
</i18n>
