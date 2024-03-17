<script lang="ts" setup>
import emptyIcon from '~icons/mdi/package-variant-remove'

const userStore = useUserStore()
const { userAddresses } = storeToRefs(userStore)

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper class="container flex flex-col gap-4 !p-0 md:gap-8">
    <PageHeader>
      <PageTitle :text="$t('pages.account.addresses.title')" />
    </PageHeader>
    <UserAccountNavbar />
    <PageBody>
      <AddressList
        v-if="userAddresses && userAddresses.length"
        :addresses="userAddresses"
        :addresses-total="userAddresses.length"
      />
      <ul v-if="!userAddresses" class="flex gap-4">
        <AddressAddNew />
        <li>
          <EmptyState :icon="emptyIcon">
            <template #actions>
              <UButton
                :label="$t('common.empty.button')"
                :to="'index'"
                color="white"
              />
            </template>
          </EmptyState>
        </li>
      </ul>
    </PageBody>
  </PageWrapper>
</template>
