<script lang="ts" setup>
/**
 * One saved address, as the boards draw it: its label and the default
 * pill, the address itself, then Edit, "Set as default" and delete.
 *
 * The default address is the one checkout fills in, so it cannot be
 * deleted (Django refuses): another address has to become the default
 * first, which is why it offers no delete. Both changes are made here
 * and announced with `changed`, so the list can reload.
 */
const props = defineProps<{
  address: UserAddress
}>()

const emit = defineEmits<{
  changed: []
}>()

const { t, locale } = useI18n()
const toast = useToast()
const localePath = useLocalePath()

const busy = ref<'default' | 'delete' | null>(null)

const countryName = computed(() => {
  const code = props.address.country
  if (!code) return ''
  return new Intl.DisplayNames([locale.value], { type: 'region' }).of(code) ?? code
})

const lines = computed(() => {
  const address = props.address
  return [
    `${address.firstName} ${address.lastName}`.trim(),
    `${address.street} ${address.streetNumber}`.trim(),
    [`${address.zipcode} ${address.city}`.trim(), countryName.value].filter(Boolean).join(', '),
    address.phone,
  ].filter(Boolean)
})

async function makeDefault() {
  busy.value = 'default'
  try {
    await $api(`/api/user/addresses/${props.address.id}/set-main`, { method: 'POST' })
    toast.add({ title: t('default_set'), color: 'success' })
    emit('changed')
  }
  catch (error) {
    log.error({ action: 'address:set-main', error })
    toast.add({ title: t('default_error'), color: 'error' })
  }
  finally {
    busy.value = null
  }
}

async function remove() {
  busy.value = 'delete'
  try {
    await $api(`/api/user/addresses/${props.address.id}`, { method: 'DELETE' })
    toast.add({ title: t('deleted'), color: 'success' })
    emit('changed')
  }
  catch (error) {
    log.error({ action: 'address:delete', error })
    toast.add({ title: t('delete_error'), color: 'error' })
  }
  finally {
    busy.value = null
  }
}
</script>

<template>
  <article
    class="flex h-full flex-col gap-4 rounded-[1.25rem] bg-default p-5 ring ring-default"
    :aria-label="address.title"
  >
    <div class="flex items-center justify-between gap-3">
      <h2 class="font-semibold text-highlighted">
        {{ address.title }}
      </h2>
      <UBadge
        v-if="address.isMain"
        :label="t('default')"
        class="bg-inverted text-inverted ring-0"
      />
    </div>
    <address class="flex flex-1 flex-col gap-0.5 text-sm text-toned not-italic">
      <span
        v-for="(line, index) in lines"
        :key="index"
      >{{ line }}</span>
    </address>
    <div class="flex flex-wrap items-center gap-2">
      <UButton
        :label="t('edit')"
        :to="localePath({ name: 'account-addresses-id-edit', params: { id: address.id } })"
        :aria-label="t('edit_named', { name: address.title })"
        icon="i-lucide-pencil"
        color="neutral"
        variant="outline"
        size="sm"
      />
      <UButton
        v-if="!address.isMain"
        :label="t('make_default')"
        :loading="busy === 'default'"
        :disabled="busy !== null"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="makeDefault"
      />
      <UButton
        v-if="!address.isMain"
        :aria-label="t('delete_named', { name: address.title })"
        :loading="busy === 'delete'"
        :disabled="busy !== null"
        icon="i-lucide-trash-2"
        color="neutral"
        variant="ghost"
        size="sm"
        class="ms-auto"
        @click="remove"
      />
    </div>
  </article>
</template>

<i18n lang="yaml">
el:
  default: Προεπιλογή
  edit: Επεξεργασία
  edit_named: Επεξεργασία της διεύθυνσης «{name}»
  make_default: Ορισμός ως προεπιλογή
  delete_named: Διαγραφή της διεύθυνσης «{name}»
  default_set: Η προεπιλεγμένη διεύθυνση άλλαξε
  default_error: Η προεπιλεγμένη διεύθυνση δεν άλλαξε
  deleted: Η διεύθυνση διαγράφηκε
  delete_error: Η διεύθυνση δεν διαγράφηκε
en:
  default: Default
  edit: Edit
  edit_named: Edit the address “{name}”
  make_default: Set as default
  delete_named: Delete the address “{name}”
  default_set: Your default address changed
  default_error: Your default address did not change
  deleted: Address deleted
  delete_error: The address could not be deleted
</i18n>
