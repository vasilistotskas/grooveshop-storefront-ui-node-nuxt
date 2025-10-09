<script lang="ts" setup>
import type { PropType } from 'vue'

const props = defineProps({
  address: {
    type: Object as PropType<UserAddress>,
    required: true,
  },
})

const emit = defineEmits<{
  (e: 'address-delete', id: number): void
}>()

const { address } = toRefs(props)

const { t } = useI18n()
const toast = useToast()
const { contentShorten } = useText()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const isDeleting = ref(false)

const submit = async () => {
  if (address?.value && address?.value.isMain) {
    toast.add({
      title: t('cant_delete_main'),
      color: 'error',
    })
    return
  }

  isDeleting.value = true

  await $fetch(`/api/user/addresses/${address?.value.id}`, {
    method: 'DELETE',
    headers: useRequestHeaders(),
    onResponse({ response }) {
      if (!response.ok) {
        return
      }
      toast.add({
        title: t('success'),
        color: 'success',
      })
      emit('address-delete', address?.value.id)
    },
    onResponseError() {
      toast.add({
        title: t('error'),
        color: 'error',
      })
    },
  })

  isDeleting.value = false
}

const addressDetails = computed(() => {
  const details = []

  if (address.value.firstName || address.value.lastName) {
    details.push({
      icon: 'i-heroicons-user',
      text: `${address.value.firstName} ${address.value.lastName}`,
    })
  }

  if (address.value.street || address.value.streetNumber) {
    details.push({
      icon: 'i-heroicons-map-pin',
      text: `${address.value.street} ${address.value.streetNumber}`,
    })
  }

  if (address.value.city || address.value.zipcode) {
    details.push({
      icon: 'i-heroicons-building-office-2',
      text: `${address.value.city} ${address.value.zipcode}`,
    })
  }

  if (address.value.country || address.value.region) {
    details.push({
      icon: 'i-heroicons-globe-alt',
      text: `${address.value.country} ${address.value.region}`,
    })
  }

  if (address.value.phone) {
    details.push({
      icon: 'i-heroicons-phone',
      text: address.value.phone,
    })
  }

  if (address.value.mobilePhone) {
    details.push({
      icon: 'i-heroicons-device-phone-mobile',
      text: address.value.mobilePhone,
    })
  }

  return details
})
</script>

<template>
  <UCard
    v-if="address"
    as="li"
    class="relative h-full"
    varian="soft"
  >
    <UBadge
      v-if="address.isMain"
      color="warning"
      variant="soft"
      class="absolute top-4 right-4"
    >
      <div class="flex items-center gap-1">
        <UIcon
          name="i-heroicons-star-solid"
          class="size-3"
        />
        <span class="text-xs font-medium">{{ t('main_address') }}</span>
      </div>
    </UBadge>

    <div class="mb-4 flex items-start justify-between gap-2">
      <h3
        class="
          text-lg font-bold text-gray-900
          dark:text-gray-100
        "
      >
        {{ contentShorten(address.title, 0, 25) }}
      </h3>
    </div>

    <USeparator class="mb-4" />

    <div class="mb-4 space-y-3">
      <div
        v-for="detail in addressDetails"
        :key="detail.text"
        class="flex items-start gap-2"
      >
        <UIcon
          :name="detail.icon"
          class="
            mt-0.5 size-4 shrink-0 text-gray-400
            dark:text-gray-500
          "
        />
        <span
          class="
            text-sm text-gray-700
            dark:text-gray-300
          "
        >
          {{ detail.text }}
        </span>
      </div>

      <div
        v-if="address.floor"
        class="flex items-start gap-2"
      >
        <UIcon
          name="i-heroicons-building-office"
          class="
            mt-0.5 size-4 shrink-0 text-gray-400
            dark:text-gray-500
          "
        />
        <span
          class="
            text-sm text-gray-700
            dark:text-gray-300
          "
        >
          {{ $i18n.t('floor') }}: {{ address.floor }}
        </span>
      </div>

      <div
        v-if="address.locationType"
        class="flex items-start gap-2"
      >
        <UIcon
          name="i-heroicons-home"
          class="
            mt-0.5 size-4 shrink-0 text-gray-400
            dark:text-gray-500
          "
        />
        <span
          class="
            text-sm text-gray-700
            dark:text-gray-300
          "
        >
          {{ address.locationType }}
        </span>
      </div>

      <div
        v-if="address.notes"
        class="flex items-start gap-2"
      >
        <UIcon
          name="i-heroicons-document-text"
          class="
            mt-0.5 size-4 shrink-0 text-gray-400
            dark:text-gray-500
          "
        />
        <span
          class="
            text-sm text-gray-600 italic
            dark:text-gray-400
          "
        >
          {{ contentShorten(address.notes, 0, 50) }}
        </span>
      </div>
    </div>

    <USeparator class="mb-4" />

    <div class="flex items-center gap-2">
      <UButton
        icon="i-heroicons-pencil"
        :to="localePath({ name: 'account-addresses-id-edit', params: { id: address.id } })"
        color="neutral"
        variant="soft"
        class="flex-1"
        :label="t('edit')"
      />
      <UButton
        icon="i-heroicons-trash"
        color="error"
        variant="soft"
        :loading="isDeleting"
        :disabled="isDeleting"
        @click="submit"
      >
        <span v-if="!isDeleting">{{ t('delete') }}</span>
      </UButton>
    </div>
  </UCard>
</template>

<i18n lang="yaml">
el:
  success: Η διεύθυνση διαγράφηκε
  error: Η διεύθυνση δεν διαγράφηκε
  cant_delete_main: Δεν μπορείς να διαγράψεις την κύρια διεύθυνσή σου, όρισε
    μια άλλη διεύθυνση ως κύρια και ξαναπροσπάθησε.
  main_address: Κύρια διεύθυνση
  edit: Επεξεργασία
  delete: Διαγραφή
</i18n>
