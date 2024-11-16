<script lang="ts" setup>
import type { DropdownItem } from '#ui/types'

const emit = defineEmits(['deleteSession'])

const {
  deleteSession,
} = useAllAuthSessions()
const toast = useToast()
const { t } = useI18n()
const { contentShorten } = useText()

const loading = ref(false)

const authStore = useAuthStore()
const { sessions, otherSessions } = storeToRefs(authStore)

const logout = async (fromSessions: Session[]) => {
  try {
    loading.value = true
    const newSessions = await deleteSession({
      sessions: fromSessions?.map(session => session.id),
    })
    if (newSessions) {
      sessions.value = newSessions.data
    }
    toast.add({
      title: t('session.logged_out'),
      color: 'green',
    })
    emit('deleteSession')
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
  finally {
    loading.value = false
  }
}

const columns = [{
  key: 'is_current',
  label: t('is_current'),
  sortable: true,
}, {
  key: 'ip',
  label: t('ip_address'),
}, {
  key: 'user_agent',
  label: t('user_agent'),
}, {
  key: 'created_at',
  label: t('ordering.created_at'),
}, {
  key: 'actions',
}]

const rows = computed(() => {
  return sessions.value?.map((session) => {
    return {
      is_current: session.is_current,
      ip: session.ip,
      user_agent: session.user_agent,
      created_at: session.created_at,
      id: session.id,
    }
  })
})

const actionItems = (session: Session) => {
  const items: DropdownItem[] = []
  items.push({
    label: t('logout'),
    icon: 'i-heroicons-trash-20-solid',
    click: () => {
      logout([session])
    },
  })
  return [items]
}
</script>

<template>
  <div
    class="
      grid gap-4

      lg:flex
    "
  >
    <slot />
    <div class="grid w-full gap-4">
      <UTable :columns="columns" :rows="rows">
        <template #actions-data="{ row }">
          <LazyUDropdown v-if="actionItems(row).length > 0" :items="actionItems(row)">
            <UButton color="gray" icon="i-heroicons-ellipsis-horizontal-20-solid" variant="ghost" />
          </LazyUDropdown>
        </template>
        <template #is_current-data="{ row }">
          <UIcon
            v-if="row.is_current"
            :name="'i-heroicons-star-solid'"
            class="
              size-6 text-yellow-500

              dark:text-yellow-400
            "
          />
          <UIcon
            v-else
            :name="'i-heroicons-star'"
            class="
              size-6 text-gray-400

              dark:text-gray-500
            "
          />
        </template>
        <template #user_agent-data="{ row }">
          <span :title="row.user_agent">{{ contentShorten(row.user_agent, 0, 40) }}</span>
        </template>
        <template #created_at-data="{ row }">
          <NuxtTime :date-style="'medium'" :datetime="new Date(row.created_at * 1000)" :time-style="'medium'" />
        </template>
      </UTable>
      <div class="grid items-center justify-center justify-items-center">
        <UButton
          :disabled="otherSessions.length < 1"
          :loading="loading"
          color="red"
          variant="solid"
          @click="logout(otherSessions)"
        >
          {{ $t('logout_all_other_sessions') }}
        </UButton>
      </div>
    </div>
  </div>
</template>
