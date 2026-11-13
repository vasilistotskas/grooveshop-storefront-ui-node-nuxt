<script lang="ts" setup>
/**
 * webside's desk footer as its design board draws it: the store's logo and
 * line about itself, then the link columns; under them one row with the
 * copyright on the left and the ways to pay, the carriers and the cookie
 * settings on the right (`Footer/Legal`). The seller identity stays, the law
 * wants it on every page; the social links and the opening hours stay too
 * (not on the board: the owner's call). The build version is gone.
 */
const { columns, merchantIdentityColumnIndex } = useFooterLinks()
const tenantStore = useTenantStore()
const { locale } = useI18n({ useScope: 'global' })
// The store's line about itself in the page's language (as the platform's
// footer reads it).
const storeDescription = computed(() =>
  tenantStore.config ? localizedStoreDescription(tenantStore.config, locale.value) : '',
)
</script>

<template>
  <UFooter
    :ui="{ bottom: `
      pt-0 pb-7
      lg:pt-0 lg:pb-7
    ` }"
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
          :ui="{
            root: `
              grid gap-8
              lg:grid-cols-5
            `,
            left: 'mb-0',
            center: 'lg:col-span-4',
          }"
        >
          <template #left>
            <div class="flex flex-col items-start gap-3">
              <TenantLogo
                :width="120"
                :height="28"
              />
              <p
                v-if="storeDescription"
                class="text-sm/relaxed text-muted"
              >
                {{ storeDescription }}
              </p>
            </div>
          </template>
          <!-- UFooterColumns draws only links under a column, so the columns
               are drawn here, with its classes: the seller identity sits
               under the column the operator marked for them. -->
          <div
            v-for="(column, index) in columns"
            :key="index"
          >
            <h2 class="text-sm font-semibold">
              {{ column.label }}
            </h2>
            <ul class="mt-6 space-y-4">
              <li
                v-for="link in column.children"
                :key="link.to"
                class="relative"
              >
                <ULink
                  :to="link.to"
                  active-class="font-medium text-primary"
                  inactive-class="
                    text-muted transition-colors
                    hover:text-default
                  "
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
              v-if="index === merchantIdentityColumnIndex"
              class="mt-6"
            />
          </div>
        </UFooterColumns>
        <!-- Its own band under the link columns: the two halves of its grid
             start where the columns' first and third start. The band's rule
             and spacing ride on the form's root, so a store with the
             newsletter off draws neither. -->
        <WebsideFooterNewsletter
          class="
            mt-12 border-t border-primary-200 pt-10
            dark:border-primary-700
          "
        />
      </UContainer>
    </template>

    <template #left>
      <div class="flex w-full flex-col gap-1">
        <!-- A footer with no marked column keeps the seller identity here:
             the law wants it on every page whichever way the footer is laid
             out. -->
        <WebsideMerchantIdentity v-if="merchantIdentityColumnIndex === -1" />
        <WebsideFooterHoursBadge />
      </div>
    </template>

    <!-- Not on the board, kept: the newsletter sits above the store's social
         links on every footer (`webside-footer-newsletter.spec.ts`). -->
    <template #right>
      <WebsideSocials
        :button-size="'sm'"
        :icon-class="'text-xl'"
      />
    </template>

    <!-- The footer's last row, the full width of the page: the copyright at
         the left end, the ways to pay, the carriers and the cookie settings
         at the right (read from the store's data). -->
    <template #bottom>
      <UContainer>
        <WebsideFooterLegal
          class="
            border-t border-primary-200 pt-5
            dark:border-primary-700
          "
        />
      </UContainer>
    </template>
  </UFooter>
</template>
