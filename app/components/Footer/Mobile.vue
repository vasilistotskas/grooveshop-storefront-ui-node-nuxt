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
    <UAccordion
      :items="items"
      :ui="{
        trigger: 'gap-4 bg-(--ui-secondary) p-3',
        leadingIcon: 'size-8 text-(--ui-on-secondary)',
        label: 'truncate text-2xl font-semibold text-(--ui-on-secondary)',
        trailingIcon: 'text-(--ui-on-secondary)',
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
          <UButton
            :label="link.label"
            :to="localePath(link.to as any)"
            class="font-semibold"
            color="secondary"
            size="xl"
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
    <div class="flex flex-col items-center gap-2 px-4 pt-6 pb-8 text-center">
      <MerchantIdentity />
      <FooterHoursBadge />
    </div>
  </footer>
</template>
