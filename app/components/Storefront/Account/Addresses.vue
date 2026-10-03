<script lang="ts" setup>
/**
 * The shopper's saved addresses as cards, the default first — the order
 * checkout offers them in (`useCheckoutForm`). A new address and an edit
 * open the address form's own pages.
 */
const { t } = useI18n()
useHead({ title: () => t('title') })
const route = useRoute()
const localePath = useLocalePath()

const PAGE_SIZE = 50
const page = computed(() => Math.max(1, Number(route.query.page) || 1))

const { data: addresses, status, refresh } = await useApi('/api/user/addresses', {
  key: 'account-addresses',
  method: 'GET',
  query: { page, pageSize: PAGE_SIZE, ordering: '-isMain,-createdAt' },
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <AccountPageHeader :title="t('title')">
      <template #actions>
        <UButton
          :label="t('add')"
          :to="localePath('account-addresses-new')"
          icon="i-lucide-plus"
          color="neutral"
          size="sm"
        />
      </template>
    </AccountPageHeader>

    <div
      v-if="status === 'pending' && !addresses"
      class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      <USkeleton
        v-for="index in 3"
        :key="index"
        class="h-48 rounded-[1.25rem]"
      />
    </div>

    <AccountLoadError
      v-else-if="status === 'error'"
      :message="t('load_error')"
      @retry="() => refresh()"
    />

    <ul
      v-else-if="addresses?.results.length"
      class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      <li
        v-for="address in addresses.results"
        :key="address.id"
      >
        <AddressCard
          :address="address"
          @changed="refresh"
        />
      </li>
    </ul>

    <div
      v-else
      class="flex flex-col items-start gap-3 rounded-[1.25rem] bg-default p-6 ring ring-default"
    >
      <p class="font-semibold text-highlighted">
        {{ t('empty.title') }}
      </p>
      <p class="text-toned">
        {{ t('empty.description') }}
      </p>
      <UButton
        :label="t('add')"
        :to="localePath('account-addresses-new')"
        icon="i-lucide-plus"
        color="neutral"
      />
    </div>

    <UPagination
      v-if="addresses && addresses.count > PAGE_SIZE"
      :page="page"
      :total="addresses.count"
      :items-per-page="PAGE_SIZE"
      :to="(target: number) => ({ query: { ...route.query, page: target > 1 ? target : undefined } })"
      class="self-center"
    />
  </div>
</template>

<i18n lang="yaml">
el:
  title: Διευθύνσεις
  load_error: Οι διευθύνσεις δεν φορτώθηκαν.
  add: Νέα διεύθυνση
  empty:
    title: Καμία αποθηκευμένη διεύθυνση
    description: Αποθήκευσε μια διεύθυνση και θα τη βρίσκεις έτοιμη στο ταμείο.
en:
  title: Addresses
  load_error: Your addresses did not load.
  add: Add address
  empty:
    title: No saved addresses
    description: Save an address and it will be ready for you at checkout.
</i18n>
