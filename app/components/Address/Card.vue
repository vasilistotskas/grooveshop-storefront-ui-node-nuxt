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

const { t } = useI18n({ useScope: 'local' })
const toast = useToast()
const { contentShorten } = useText()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const submit = async () => {
  if (address?.value && address?.value.isMain) {
    toast.add({
      title: t('cant_delete_main'),
      color: 'error',
    })
    return
  }

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
}
</script>

<template>
  <li
    v-if="address"
    class="
      bg-primary-100 text-primary-950 relative grid w-full items-start gap-4
      rounded-lg p-2

      dark:text-primary-50 dark:bg-primary-900

      md:p-5

      sm:px-4 sm:py-10
    "
  >
    <div
      v-if="address.isMain"
      class="
        grid place-items-center absolute right-24 top-3 text-sm text-[#f0c14b]

        md:right-1 md:top-1
      "
    >
      <UTooltip :text="t('main_address')">
        <UIcon
          name="i-mdi-star"
          class="size-5 cursor-help"
        />
      </UTooltip>
    </div>
    <div class="flex items-center justify-between gap-2">
      <h3
        class="
            text-primary-950 text-start text-xl font-bold

            dark:text-primary-50
          "
      >
        {{ contentShorten(address.title, 0, 25) }}
      </h3>
      <div class="grid grid-cols-[auto_auto] items-center gap-2">
        <UButton
          class="grid size-8 place-items-center rounded-full"
          icon="i-heroicons-pencil"
          :to="localePath({ name: 'account-addresses-id-edit', params: { id: address.id } })"
          size="sm"
          :trailing="true"
          color="neutral"
        />
        <UButton
          class="grid size-8 place-items-center rounded-full"
          icon="i-heroicons-trash"
          size="sm"
          :trailing="true"
          color="error"
          @click="submit"
        />
      </div>
    </div>
    <div
      class="
        grid gap-2

        md:items-center md:justify-center md:gap-4
      "
    >
      <div
        class="
          grid w-full grid-cols-2 items-center gap-2 overflow-auto

          md:h-68 md:grid-cols-1
        "
      >
        <span
          v-if="address.firstName || address.lastName"
          class="
            text-primary-950 text-sm font-bold

            dark:text-primary-50
          "
        >
          {{ address.firstName }} {{ address.lastName }}
        </span>
        <span
          v-if="address.street || address.streetNumber"
          class="
            text-primary-950 text-sm font-bold

            dark:text-primary-50
          "
        >
          {{ address.street }} {{ address.streetNumber }}
        </span>
        <span
          v-if="address.city || address.zipcode"
          class="
            text-primary-950 text-sm font-bold

            dark:text-primary-50
          "
        >
          {{ address.city }} {{ address.zipcode }}
        </span>
        <span
          v-if="address.country || address.region"
          class="
            text-primary-950 text-sm font-bold

            dark:text-primary-50
          "
        >
          {{ address.country }} {{ address.region }}
        </span>
        <span
          v-if="address.floor"
          class="
            text-primary-950 text-sm font-bold

            dark:text-primary-50
          "
        >
          {{ $i18n.t('floor') }}: {{ address.floor }}
        </span>
        <span
          v-if="address.locationType"
          class="
            text-primary-950 text-sm font-bold

            dark:text-primary-50
          "
        >
          {{ $i18n.t('location_type') }}: {{ address.locationType }}
        </span>
        <span
          v-if="address.phone"
          class="
            text-primary-950 text-sm font-bold

            dark:text-primary-50
          "
        >
          {{ $i18n.t('phone') }}: {{ address.phone }}
        </span>
        <span
          v-if="address.mobilePhone"
          class="
            text-primary-950 text-sm font-bold

            dark:text-primary-50
          "
        >
          {{ $i18n.t('mobile_phone') }}: {{ address.mobilePhone }}
        </span>
        <span
          v-if="address.notes"
          class="
            text-primary-950 text-sm font-bold

            dark:text-primary-50
          "
        >
          {{ $i18n.t('notes') }}: {{ address.notes }}
        </span>
      </div>
    </div>
  </li>
</template>

<i18n lang="yaml">
el:
  success: Η διεύθυνση διαγράφηκε
  error: Η διεύθυνση δεν διαγράφηκε
  cant_delete_main: Δεν μπορείς να διαγράψεις την κύρια διεύθυνσή σου, όρισε
    μια άλλη διεύθυνση ως κύρια και ξαναπροσπάθησε.
  main_address: Κύρια διεύθυνση
</i18n>
