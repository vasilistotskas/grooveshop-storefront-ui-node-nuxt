<script lang="ts" setup>
/**
 * Where the shopper is signed in, as the boards draw it: a section with
 * "Sign out everywhere else", one row per session — the browser and
 * system it runs in, this device marked, when it was last active — and
 * signing out of any other one.
 *
 * "Last active" needs allauth's activity tracking; without it the row
 * says when the session signed in. No location: allauth records none
 * (PLAN B44). The sessions are the auth store's, refreshed on mount.
 */
const { deleteSession } = useAllAuthSessions()
const toast = useToast()
const { t, locale } = useI18n()
const authStore = useAuthStore()
const { sessions, otherSessions } = storeToRefs(authStore)

onMounted(() => {
  authStore.setupSessions()
})

const busy = ref<number | 'others' | null>(null)

async function signOut(targets: Session[], key: number | 'others') {
  busy.value = key
  try {
    const remaining = await deleteSession({ sessions: targets.map(session => session.id) })
    if (remaining) sessions.value = remaining.data
    toast.add({ title: t('signed_out', targets.length), color: 'success' })
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
  finally {
    busy.value = null
  }
}

const DEVICE_ICON: Readonly<Record<DeviceClass, string>> = {
  mobile: 'i-lucide-smartphone',
  tablet: 'i-lucide-tablet',
  desktop: 'i-lucide-monitor',
}

/** "Chrome on Windows"; just the one that is known; or "Unknown device". */
function deviceName(userAgent: string) {
  const browser = browserOf(userAgent)
  const system = operatingSystemOf(userAgent)
  if (browser && system) return t('device', { browser, system })
  return browser ?? system ?? t('unknown_device')
}

const describe = (session: Session) => ({
  icon: DEVICE_ICON[deviceClassFromUserAgent(session.user_agent)],
  name: deviceName(session.user_agent),
  seen: new Date((session.last_seen_at ?? session.created_at) * 1000).toISOString(),
  tracked: session.last_seen_at !== undefined,
})
</script>

<template>
  <AccountSection :title="t('title')">
    <template #actions>
      <UButton
        v-if="otherSessions?.length"
        :label="t('sign_out_others')"
        :loading="busy === 'others'"
        color="neutral"
        variant="outline"
        size="sm"
        @click="() => signOut(otherSessions ?? [], 'others')"
      />
    </template>

    <!-- Rows only on the client: the store fills the sessions from a
         `watch(loggedIn)` that fires at the hydration boundary itself,
         so the server would render none and the client every one. -->
    <ClientOnly>
      <ul class="flex flex-col divide-y divide-default">
        <li
          v-for="session in sessions"
          :key="session.id"
          class="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:gap-4"
        >
          <span class="flex min-w-0 flex-1 items-center gap-3">
            <UIcon
              :name="describe(session).icon"
              class="size-4 shrink-0 text-toned"
            />
            <span class="truncate font-medium text-highlighted">{{ describe(session).name }}</span>
            <UBadge
              v-if="session.is_current"
              :label="t('this_device')"
              color="secondary"
              variant="soft"
              size="sm"
            />
          </span>
          <span class="text-toned sm:w-56">
            <i18n-t :keypath="describe(session).tracked ? 'last_active' : 'signed_in'">
              <template #when>
                <NuxtTime
                  :datetime="describe(session).seen"
                  :locale="locale"
                  relative
                  numeric="auto"
                />
              </template>
            </i18n-t>
          </span>
          <span class="flex sm:w-24 sm:justify-end">
            <UButton
              v-if="!session.is_current"
              :label="t('sign_out')"
              :aria-label="t('sign_out_named', { device: describe(session).name })"
              :loading="busy === session.id"
              color="error"
              variant="ghost"
              size="sm"
              @click="() => signOut([session], session.id)"
            />
          </span>
        </li>
      </ul>
      <template #fallback>
        <USkeleton class="h-12 w-full rounded-[0.75rem]" />
      </template>
    </ClientOnly>
  </AccountSection>
</template>

<i18n lang="yaml">
el:
  title: Συνδεδεμένες συσκευές
  sign_out_others: Αποσύνδεση από τις υπόλοιπες
  device: "{browser} σε {system}"
  unknown_device: Άγνωστη συσκευή
  this_device: Αυτή η συσκευή
  last_active: Ενεργή {when}
  signed_in: Συνδέθηκε {when}
  sign_out: Αποσύνδεση
  sign_out_named: Αποσύνδεση της συσκευής «{device}»
  signed_out: "Η συσκευή αποσυνδέθηκε | Οι συσκευές αποσυνδέθηκαν"
en:
  title: Signed-in devices
  sign_out_others: Sign out everywhere else
  device: "{browser} on {system}"
  unknown_device: Unknown device
  this_device: This device
  last_active: Active {when}
  signed_in: Signed in {when}
  sign_out: Sign out
  sign_out_named: Sign out “{device}”
  signed_out: "The device was signed out | The devices were signed out"
</i18n>
