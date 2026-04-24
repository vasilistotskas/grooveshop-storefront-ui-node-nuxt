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
        leadingIcon: 'size-8 text-white',
        label: 'truncate text-2xl font-semibold text-white',
        trailingIcon: 'text-white',
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

    <div
      class="
        flex flex-col items-center gap-3 border-t border-primary-200 p-4
        dark:border-primary-800
      "
    >
      <TrustSecureCheckoutBadge />
      <TrustPaymentBadges />
    </div>
  </footer>
</template>
