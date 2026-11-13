<script lang="ts" setup>
const { columns, merchantIdentityColumnIndex } = useFooterLinks()
const runtimeConfig = useRuntimeConfig()

const packageVersion = runtimeConfig.public.version
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
      <div class="flex flex-col gap-1">
        <!-- A footer with no marked column keeps the seller identity here:
             the law wants it on every page whichever way the footer is laid
             out. -->
        <WebsideMerchantIdentity v-if="merchantIdentityColumnIndex === -1" />
        <WebsideFooterHoursBadge />
        <!-- The copyright, the ways to pay and the carriers, the cookie
             settings: one line, read from the store's data. -->
        <WebsideFooterLegal />
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
