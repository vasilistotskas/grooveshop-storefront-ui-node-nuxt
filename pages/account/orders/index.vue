<script lang="ts" setup>
import emptyIcon from '~icons/mdi/package-variant-remove'

const userStore = useUserStore()
const { orders } = storeToRefs(userStore)

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper class="container flex flex-col gap-4 !p-0 md:gap-8">
    <PageHeader>
      <PageTitle :text="$t('pages.account.orders.title')" />
    </PageHeader>
    <PageBody>
      <OrderList v-if="orders && orders.length" :orders="orders" />
      <EmptyState v-if="!orders" :icon="emptyIcon">
        <template #actions>
          <UButton
            :label="$t('common.empty.button')"
            :to="'index'"
            color="white"
          />
        </template>
      </EmptyState>
    </PageBody>
  </PageWrapper>
</template>
