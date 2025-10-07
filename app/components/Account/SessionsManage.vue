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

function getDeviceIcon(userAgent: string): string {
  const ua = userAgent.toLowerCase()
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'i-heroicons-device-phone-mobile'
  }
  if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'i-heroicons-device-tablet'
  }
  return 'i-heroicons-computer-desktop'
}

function getBrowserName(userAgent: string): string {
  const ua = userAgent.toLowerCase()
  if (ua.includes('edg/')) return 'Edge'
  if (ua.includes('chrome/')) return 'Chrome'
  if (ua.includes('firefox/')) return 'Firefox'
  if (ua.includes('safari/') && !ua.includes('chrome')) return 'Safari'
  if (ua.includes('opera/') || ua.includes('opr/')) return 'Opera'
  return 'Unknown'
}

function getOSName(userAgent: string): string {
  const ua = userAgent.toLowerCase()
  if (ua.includes('windows')) return 'Windows'
  if (ua.includes('mac os')) return 'macOS'
  if (ua.includes('linux')) return 'Linux'
  if (ua.includes('android')) return 'Android'
  if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'iOS'
  return 'Unknown'
}

const columns: TableColumn<Session>[] = [
  {
    accessorKey: 'is_current',
    header: '',
  },
  {
    accessorKey: 'device',
    header: t('device'),
  },
  {
    accessorKey: 'ip',
    header: $i18n.t('ip_address'),
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
      icon: 'i-heroicons-arrow-right-start-on-rectangle',
      class: session.is_current ? '' : 'cursor-pointer',
      ui: {
        itemLeadingIcon: 'text-red-500 dark:text-red-500 hover:text-red-500 hover:dark:text-red-500',
      },
      disabled: session.is_current,
      onSelect: () => {
        if (!session.is_current) {
          logout([session])
        }
      },
    },
  ]]
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
    <div
      class="
        w-full space-y-6 overflow-auto
        md:overflow-visible
      "
    >
      <UCard>
        <UAlert
          color="info"
          variant="soft"
          icon="i-heroicons-shield-check"
          :title="t('sessions.info.title')"
          :description="t('sessions.info.description')"
        />

        <UTable
          :data="data"
          :columns="columns"
          :loading="loading"
          :empty-state="{
            icon: 'i-heroicons-signal-slash',
            label: t('sessions.empty.title'),
            description: t('sessions.empty.description'),
          }"
        >
          <template #is_current-cell="{ row }">
            <UTooltip
              :text="row.original.is_current ? t('sessions.current') : t('sessions.other')"
            >
              <UBadge
                v-if="row.original.is_current"
                color="success"
                variant="soft"
                size="xs"
                icon="i-heroicons-check-circle"
              >
                {{ t('sessions.active') }}
              </UBadge>
              <div v-else class="size-2" />
            </UTooltip>
          </template>
          <template #device-cell="{ row }">
            <div class="flex items-center gap-3">
              <UIcon
                :name="getDeviceIcon(row.original.user_agent)"
                class="size-5 text-muted"
              />
              <div class="flex flex-col">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium">
                    {{ getBrowserName(row.original.user_agent) }}
                  </span>
                  <span class="text-xs text-muted">•</span>
                  <span class="text-xs text-muted">
                    {{ getOSName(row.original.user_agent) }}
                  </span>
                </div>
                <UTooltip :text="row.original.user_agent">
                  <span class="text-xs text-muted">
                    {{ contentShorten(row.original.user_agent, 0, 50) }}
                  </span>
                </UTooltip>
              </div>
            </div>
          </template>
          <template #ip-cell="{ row }">
            <UBadge
              color="neutral"
              variant="subtle"
              size="sm"
              class="font-mono"
            >
              {{ row.original.ip }}
            </UBadge>
          </template>
          <template #created_at-cell="{ row }">
            <span class="text-sm text-muted">
              <NuxtTime
                date-style="medium"
                :datetime="new Date(row.original.created_at * 1000)"
                time-style="short"
                :locale="locale"
              />
            </span>
          </template>
          <template #actions-cell="{ row }">
            <UTooltip :text="row.original.is_current ? t('sessions.cannot_logout_current') : $i18n.t('logout')">
              <LazyUDropdownMenu
                v-if="getActionItems(row.original).length > 0"
                :items="getActionItems(row.original)"
              >
                <UButton
                  color="neutral"
                  icon="i-heroicons-ellipsis-horizontal-20-solid"
                  variant="ghost"
                  size="sm"
                  :disabled="row.original.is_current"
                />
              </LazyUDropdownMenu>
            </UTooltip>
          </template>
        </UTable>

        <div
          class="
            flex flex-col items-center justify-between gap-2 pt-2
            md:flex-row
          "
        >
          <span class="text-sm text-muted">
            {{ t('sessions.total', { count: data.length, other: otherSessions.length }) }}
          </span>
          <UButton
            :disabled="otherSessions.length < 1"
            :loading="loading"
            icon="i-heroicons-arrow-right-start-on-rectangle"
            color="error"
            variant="subtle"
            size="md"
            @click="logout(otherSessions)"
          >
            {{ t('logout_all_other_sessions') }}
          </UButton>
        </div>

        <UAlert
          v-if="otherSessions.length > 0"
          color="warning"
          variant="soft"
          icon="i-heroicons-exclamation-triangle"
          class="mt-6"
          :title="t('sessions.security.title')"
          :description="t('sessions.security.description')"
        />
      </UCard>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  is_current: Τρέχουσα
  device: Συσκευή
  logout_all_other_sessions: Αποσύνδεση από όλες τις υπόλοιπες συσκευές
  session:
    logged_out: Αποσυνδέθηκες από όλες τις άλλες συνεδρίες
  sessions:
    info:
      title: Ενεργές Συνεδρίες
      description: Παρακολούθησε και διαχειρίσου όλες τις ενεργές συνεδρίες σου. Μπορείς να αποσυνδεθείς από οποιαδήποτε συσκευή για επιπλέον ασφάλεια.
    active: Ενεργή
    current: Αυτή είναι η τρέχουσα συνεδρία σου
    other: Άλλη συσκευή
    cannot_logout_current: Δεν μπορείς να αποσυνδεθείς από την τρέχουσα συνεδρία
    total: 'Σύνολο: {count} συνεδρία/συνεδρίες ({other} άλλες)'
    empty:
      title: Δεν υπάρχουν ενεργές συνεδρίες
      description: Θα δείς τις συνδεδεμένες συσκευές σου εδώ
    security:
      title: Ασφάλεια Λογαριασμού
      description: Αν δείς συνεδρίες που δεν αναγνωρίζεις, αποσυνδέσου αμέσως και αλλάξτε τον κωδικό σου.
</i18n>
