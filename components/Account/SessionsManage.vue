<script lang="ts" setup>
import type { DropdownItem } from '#ui/types'
import type { Session } from '~/types/all-auth'

const emit = defineEmits(['deleteSession'])

const {
  deleteSession,
} = useAllAuthSessions()
const toast = useToast()
const { t } = useI18n()
const { clear } = useUserSession()

const loading = ref(false)

const userStore = useUserStore()
const { sessions } = storeToRefs(userStore)
const { setupSessions } = userStore

const otherSessions = computed(() => {
  return sessions.value?.filter(session => !session.is_current)
})

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
      title: t('common.session.logged_out'),
      color: 'green',
    })
    emit('deleteSession')
    await setupSessions()
  }
  catch (error) {
    if (isAllAuthClientError(error)) {
      if (error.data.data.status === 401) {
        toast.add({
          title: t('common.logged_out'),
          color: 'red',
        })
        await clear()
      }
      return
    }
    toast.add({
      title: t('common.error.default'),
      color: 'red',
    })
  }
  finally {
    loading.value = false
  }
}

const columns = [{
  key: 'created_at',
  label: t('common.created_at'),
}, {
  key: 'ip',
  label: t('common.ip_address'),
}, {
  key: 'user_agent',
  label: t('common.user_agent'),
}, {
  key: 'is_current',
  label: t('common.is_current'),
  sortable: true,
}, {
  key: 'actions',
}]

const rows = computed(() => {
  return sessions.value?.map((session) => {
    return {
      id: session.id,
      created_at: session.created_at,
      ip: session.ip,
      user_agent: session.user_agent,
      is_current: session.is_current,
    }
  })
})

const actionItems = (session: Session) => {
  const items: DropdownItem[] = []
  items.push({
    label: t('common.logout'),
    icon: 'i-heroicons-trash-20-solid',
    click: () => {
      console.log('session', session)
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

      md:gap-12
    "
  >
    <UTable :columns="columns" :rows="rows">
      <template #actions-data="{ row }">
        <UDropdown v-if="actionItems(row).length > 0" :items="actionItems(row)">
          <UButton color="gray" icon="i-heroicons-ellipsis-horizontal-20-solid" variant="ghost" />
        </UDropdown>
      </template>

      <template #created_at-data="{ row }">
        <NuxtTime :date-style="'medium'" :datetime="new Date(row.created_at * 1000)" :time-style="'medium'" />
      </template>

      <template #is_current-data="{ row }">
        <UIcon
          v-if="row.is_current"
          :name="'i-heroicons-star-solid'"
          class="
            h-6 w-6 text-yellow-500

            dark:text-yellow-400
          "
        />
        <UIcon
          v-else
          :name="'i-heroicons-star'"
          class="
            h-6 w-6 text-gray-400

            dark:text-gray-500
          "
        />
      </template>
    </UTable>
    <div class="grid items-center justify-center justify-items-center">
      <UButton
        :disabled="otherSessions.length <= 1"
        :loading="loading"
        color="red"
        variant="solid"
        @click="logout(otherSessions)"
      >
        {{ $t('common.logout_all_other_sessions') }}
      </UButton>
    </div>
  </div>
</template>
