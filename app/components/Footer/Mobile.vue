<script lang="ts" setup>
import type { AccordionItem } from '#ui/types'

const localePath = useLocalePath()
const { columns } = useFooterLinks()

const items = computed<AccordionItem[]>(() =>
  columns.value.map(column => ({
    label: column.label,
    icon: column.icon,
  })),
)
</script>

<template>
  <footer
    class="
      w-full bg-primary-50 md:pb-11
      md:hidden
      dark:bg-primary-900
    "
  >
    <!-- `unmount-on-hide` defaults to TRUE, which drops every closed
         panel's body from the DOM. The desktop footer is not rendered
         at all on mobile (`v-if="isMobileOrTablet"` in the default
         layout), so under mobile-first indexing the ENTIRE footer link
         set — terms, privacy, cookies, contact and every operator menu
         row — was invisible to crawlers, orphaning those pages.
         Setting it false makes Reka render the body with
         `hidden="until-found"`: still collapsed, but present in the
         DOM, findable by find-in-page, and it auto-opens on
         `beforematch`. -->
    <!-- Sizing is deliberately keyed to the DESKTOP footer's scale
         (`text-sm` body, `size="lg"` link buttons) rather than picked
         by eye. These bars were `text-2xl` (24px) semibold with 32px
         leading icons — roughly twice the desktop type — so on a phone
         the four of them read as four large blue buttons and swallowed
         the fold, which is what the site owner reported.
         `text-base` keeps a section header a step above its links
         without competing with page content.

         The `bg-(--ui-secondary)` fill is intentionally untouched: it
         is a theme token shared by every tenant, so recolouring it
         here would silently restyle other stores. If the solid blue is
         itself the problem that is a theming decision, not a footer
         one. -->
    <UAccordion
      :items="items"
      :unmount-on-hide="false"
      :ui="{
        trigger: 'gap-3 bg-(--ui-secondary) px-3 py-2.5',
        leadingIcon: 'size-5 text-(--ui-on-secondary)',
        label: 'truncate text-base font-medium text-(--ui-on-secondary)',
        trailingIcon: 'size-4 text-(--ui-on-secondary)',
      }"
    >
      <template #body="{ index }">
        <div
          v-for="link in columns[index]?.children"
          :key="link.to"
          class="
            text-primary-950
            dark:text-primary-50
          "
        >
          <!-- `lg`, not `md`: this matches the desktop footer's link
               size and keeps the row a comfortable tap target. Going
               smaller trims a few pixels of type at the cost of
               touch accessibility, which is the wrong trade on the
               surface that is only ever rendered on phones. -->
          <UButton
            :label="link.label"
            :to="localePath(link.to as any)"
            class="font-medium"
            color="secondary"
            size="lg"
            type="button"
            variant="link"
          />
        </div>
      </template>
    </UAccordion>

    <!-- Same obligation as the desktop footer: the seller identity has
         to be on every page, not only the wide layout. Centered in its
         own padded block: as bare `px-4 pt-*` siblings these two sat
         flush against the last accordion bar and ran off the bottom
         edge of the page (no bottom padding, and the fixed mobile
         bottom nav overlapped them when enabled). -->
    <div class="flex flex-col items-center gap-2 px-4 text-center">
      <MerchantIdentity />
      <FooterHoursBadge />
    </div>
  </footer>
</template>
