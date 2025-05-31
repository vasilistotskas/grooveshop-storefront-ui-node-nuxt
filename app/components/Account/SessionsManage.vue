<script lang="ts" setup>
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'

const emit = defineEmits(['deleteSession'])

const { deleteSession } = useAllAuthSessions()
const toast = useToast()
const { locale, t } = useI18n()
const { contentShorten } = useText()
const { $i18n } = useNuxtApp()

const loading = ref(false)

const authStore = useAuthStore()
const { sessions, otherSessions } = storeToRefs(authStore)
const { setupSessions } = authStore

await setupSessions()

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
      color: 'success',
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

const columns: TableColumn<Session>[] = [
  {
    accessorKey: 'is_current',
    header: t('is_current'),
  },
  {
    accessorKey: 'ip',
    header: t('ip_address'),
  },
  {
    accessorKey: 'user_agent',
    header: t('user_agent'),
  },
  {
    accessorKey: 'created_at',
    header: $i18n.t('ordering.created_at'),
  },
  {
    id: 'actions',
    header: '',
  },
]

const data = computed(() => {
  return sessions.value?.map(session => ({
    is_current: session.is_current,
    ip: session.ip,
    user_agent: session.user_agent,
    created_at: session.created_at,
    id: session.id,
  })) || []
})

const getActionItems = (session: Session): DropdownMenuItem[][] => {
  return [[
    {
      label: $i18n.t('logout'),
      icon: 'i-heroicons-trash-20-solid',
      onSelect: () => {
        logout([session])
      },
    },
  ]]
}
</script>

<template>
  <div class="grid gap-4 lg:flex">
    <slot />
    <div class="grid w-full gap-4">
      <UTable :data="data" :columns="columns" :loading="loading">
        <template #actions-cell="{ row }">
          <LazyUDropdownMenu
            v-if="getActionItems(row.original).length > 0"
            :items="getActionItems(row.original)"
          >
            <UButton
              color="neutral"
              icon="i-heroicons-ellipsis-horizontal-20-solid"
              variant="ghost"
            />
          </LazyUDropdownMenu>
        </template>
        <template #is_current-cell="{ row }">
          <UIcon
            v-if="row.original.is_current"
            name="i-heroicons-star-solid"
            class="size-6 text-yellow-500 dark:text-yellow-400"
          />
          <UIcon
            v-else
            name="i-heroicons-star"
            class="size-6 text-neutral-400 dark:text-neutral-500"
          />
        </template>
        <template #user_agent-cell="{ row }">
          <span :title="row.original.user_agent">
            {{ contentShorten(row.original.user_agent, 0, 40) }}
          </span>
        </template>
        <template #created_at-cell="{ row }">
          <NuxtTime
            date-style="medium"
            :datetime="new Date(row.original.created_at * 1000)"
            time-style="medium"
            :locale="locale"
          />
        </template>
      </UTable>
      <div class="grid items-center justify-center justify-items-center">
        <UButton
          :disabled="otherSessions.length < 1"
          :loading="loading"
          color="error"
          variant="subtle"
          @click="logout(otherSessions)"
        >
          {{ $i18n.t('logout_all_other_sessions') }}
        </UButton>
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  session:
    logged_out: Αποσυνδέθηκες από όλες τις άλλες συνεδρίες
</i18n>
