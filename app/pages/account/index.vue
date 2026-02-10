<script lang="ts" setup>
const { menus } = useAccountMenus()
const { t } = useI18n()
const { user } = useUserSession()
const localePath = useLocalePath()

const { data: loyaltySettings } = useLoyalty().fetchSettings()
const loyaltyEnabled = computed(() => loyaltySettings.value?.enabled ?? false)

defineRouteRules({
  robots: false,
})

definePageMeta({
  layout: 'user',
})

const quickStats = computed(() => [
  {
    label: t('account.email'),
    value: user.value?.email || '-',
    icon: 'i-heroicons-envelope-open',
    bgClass: 'flex items-center justify-center bg-primary-100 dark:bg-primary-900/20',
    iconClass: 'text-primary-600 dark:text-primary-400',
  },
  {
    label: t('account.username'),
    value: user.value?.username || user.value?.email?.split('@')[0] || '-',
    icon: 'i-heroicons-user',
    bgClass: 'flex items-center justify-center bg-secondary-100 dark:bg-secondary-900/20',
    iconClass: 'text-secondary-600 dark:text-secondary-400',
  },
  {
    label: t('account.full_name'),
    value: user.value?.firstName && user.value?.lastName
      ? `${user.value.firstName} ${user.value.lastName}`
      : user.value?.firstName || user.value?.lastName || '-',
    icon: 'i-heroicons-user-circle',
    bgClass: 'flex items-center justify-center bg-success-100 dark:bg-success-900/20',
    iconClass: 'text-success-600 dark:text-success-400',
  },
])

const activityStats = computed(() => {
  const stats = []

  if (user.value?.phone) {
    stats.push({
      label: t('account.phone'),
      value: user.value.phone,
      description: t('account.phone_description'),
      icon: 'i-heroicons-phone',
    })
  }

  if (user.value?.city || user.value?.country) {
    const location = [user.value?.city, user.value?.country].filter(Boolean).join(', ')
    stats.push({
      label: t('account.location'),
      value: location,
      description: t('account.location_description'),
      icon: 'i-heroicons-map-pin',
    })
  }

  return stats
})
</script>

<template>
  <PageWrapper
    class="
      flex flex-col gap-4
      md:mt-1 md:gap-8 md:!p-0
    "
  >
    <PageTitle
      :text="t('title')"
      class="md:mt-0"
    />

    <DesktopOnly>
      <div class="grid gap-6">
        <UCard
          :ui="{
            body: 'sm:p-8',
          }"
          variant="subtle"
          class="
            overflow-hidden bg-gradient-to-br from-primary-50 to-secondary-50
            dark:from-primary-950/30 dark:to-secondary-950/30
          "
        >
          <div class="flex items-center gap-6">
            <UAvatar
              :alt="user?.username || user?.email || 'User'"
              :text="(user?.username || user?.email || 'U').substring(0, 2).toUpperCase()"
              size="3xl"
              class="
                ring-4 ring-white/50
                dark:ring-primary-900/50
              "
            />
            <div class="flex-1">
              <div>
                <h2
                  class="
                    text-3xl font-bold text-primary-950
                    dark:text-primary-50
                  "
                >
                  {{ t('account.welcome_back') }}, {{ user?.username || user?.email?.split('@')[0] }}
                </h2>
              </div>
              <p
                class="
                  mt-2 text-base text-neutral-700
                  dark:text-neutral-300
                "
              >
                {{ t('account.manage_description') }}
              </p>
              <div
                class="
                  mt-3 flex items-center gap-2 text-sm text-neutral-600
                  dark:text-neutral-300
                "
              >
                <UIcon name="i-heroicons-envelope" class="size-5" />
                <span>{{ user?.email }}</span>
              </div>
            </div>
          </div>
        </UCard>

        <LoyaltyProgressHero v-if="loyaltyEnabled" />

        <div
          class="
            grid grid-cols-2 gap-4
            lg:grid-cols-3
          "
        >
          <UCard
            v-for="(stat, i) in quickStats"
            :key="i"
            :ui="{
              body: 'sm:p-5',
            }"
            variant="subtle"
            class="
              transition-all duration-200
              hover:-translate-y-1 hover:shadow-lg
            "
          >
            <div
              class="
                flex flex-col items-center gap-3
                md:flex-row md:gap-5
              "
            >
              <div class="flex items-center justify-between">
                <div
                  :class="[`flex items-center justify-center rounded-lg p-2.5`, stat.bgClass]"
                >
                  <UIcon
                    :name="stat.icon"
                    :class="['size-6', stat.iconClass]"
                  />
                </div>
              </div>
              <div class="flex w-full flex-col items-center">
                <p
                  class="
                    text-xs font-medium tracking-wide text-neutral-500 uppercase
                    dark:text-neutral-300
                  "
                >
                  {{ stat.label }}
                </p>
                <p
                  class="
                    mt-1 text-center text-xl font-bold text-primary-950
                    dark:text-primary-50
                  "
                >
                  {{ stat.value }}
                </p>
              </div>
            </div>
          </UCard>
        </div>

        <UCard
          v-for="activity in activityStats"
          :key="activity.label"
          variant="subtle"
          :ui="{
            body: 'sm:p-5',
          }"
        >
          <div class="flex items-center gap-4">
            <div
              class="
                flex items-center justify-center rounded-lg bg-primary-100 p-3
                dark:bg-primary-900/20
              "
            >
              <UIcon
                :name="activity.icon"
                class="
                  size-6 text-primary-600
                  dark:text-primary-400
                "
              />
            </div>
            <div class="flex-1">
              <p
                class="
                  text-sm font-semibold text-primary-950
                  dark:text-primary-50
                "
              >
                {{ activity.label }}
              </p>
              <p
                class="
                  mt-1 text-xs text-neutral-600
                  dark:text-neutral-300
                "
              >
                {{ activity.value }}: {{ activity.description }}
              </p>
            </div>
          </div>
        </UCard>

        <div>
          <div class="mb-5 flex items-center justify-between">
            <div>
              <h3
                class="
                  text-xl font-bold text-primary-950
                  dark:text-primary-50
                "
              >
                {{ t('account.quick_actions') }}
              </h3>
              <p
                class="
                  mt-1 text-sm text-neutral-600
                  dark:text-neutral-300
                "
              >
                {{ t('account.quick_actions_description') }}
              </p>
            </div>
          </div>
          <div
            class="
              grid grid-cols-1 gap-4
              lg:grid-cols-2
              xl:grid-cols-3
            "
          >
            <UCard
              v-for="(item, i) in menus"
              :key="i"
              variant="subtle"
              :ui="{
                root: 'h-full',
                body: `
                  h-full
                  sm:p-0
                `,
              }"
              class="
                group transition-all duration-200
                hover:shadow-lg hover:ring-2 hover:ring-primary-500/20
              "
            >
              <NuxtLink
                v-if="item.route && item.type === 'link'"
                :to="localePath(item.route)"
                class="
                  flex h-full items-center gap-4 p-5 transition-all duration-200
                "
              >
                <div
                  class="
                    flex items-center justify-center rounded-xl
                    bg-gradient-to-br from-primary-100 to-primary-200 p-3
                    transition-transform duration-200
                    group-hover:scale-105
                    dark:from-primary-900 dark:to-primary-800
                  "
                >
                  <UIcon
                    v-if="item.icon"
                    :name="item.icon"
                    class="
                      size-6 text-primary-700
                      dark:text-primary-300
                    "
                  />
                </div>
                <div class="flex-1">
                  <h4
                    class="
                      font-semibold text-primary-950
                      dark:text-primary-50
                    "
                  >
                    {{ item.text }}
                  </h4>
                  <p
                    class="
                      mt-0.5 text-sm text-neutral-600
                      dark:text-neutral-300
                    "
                  >
                    {{ t(`account.menu_description.${item.route.name}`) }}
                  </p>
                </div>
                <UIcon
                  name="i-heroicons-chevron-right"
                  class="
                    size-6 text-neutral-400 transition-transform duration-200
                    group-hover:translate-x-1
                  "
                />
              </NuxtLink>
            </UCard>

            <UCard
              :ui="{
                body: `
                  flex h-full items-center justify-center bg-linear-to-br
                  from-red-100 to-red-200
                  group-hover:scale-105
                  sm:p-5
                  dark:from-red-900/20 dark:to-red-800/20
                `,
              }"
              variant="subtle"
              class="
                group transition-all duration-200
                hover:shadow-lg hover:ring-2 hover:ring-red-500/20
              "
            >
              <div class="flex items-center">
                <div
                  class="
                    flex items-center justify-center rounded-xl p-3
                    transition-transform duration-200
                  "
                >
                  <UIcon
                    name="i-heroicons-arrow-right-on-rectangle"
                    class="
                      size-6 text-red-600
                      dark:text-red-400
                    "
                  />
                </div>
                <div class="flex-1">
                  <LogoutButton
                    class="!m-0 !p-0"
                    variant="link"
                    size="lg"
                  />
                </div>
              </div>
            </UCard>
          </div>
        </div>
      </div>
    </DesktopOnly>

    <MobileOrTabletOnly>
      <div class="grid gap-4">
        <UCard
          :ui="{
            body: 'p-6',
          }"
          variant="subtle"
          class="
            bg-gradient-to-br from-primary-50 to-secondary-50
            dark:from-primary-950/30 dark:to-secondary-950/30
          "
        >
          <div class="flex flex-col items-center gap-4 text-center">
            <UAvatar
              :alt="user?.username || user?.email || 'User'"
              :text="(user?.username || user?.email || 'U').substring(0, 2).toUpperCase()"
              size="3xl"
              class="
                ring-4 ring-white/50
                dark:ring-primary-900/50
              "
            />
            <div>
              <div>
                <h2
                  class="
                    text-xl font-bold text-primary-950
                    dark:text-primary-50
                  "
                >
                  {{ user?.username || user?.email?.split('@')[0] }}
                </h2>
              </div>
              <p
                class="
                  mt-1 text-sm text-neutral-600
                  dark:text-neutral-300
                "
              >
                {{ user?.email }}
              </p>
            </div>
          </div>
        </UCard>

        <LoyaltyProgressHero v-if="loyaltyEnabled" />

        <div class="grid grid-cols-2 gap-3">
          <UCard
            v-for="(stat, i) in quickStats"
            :key="i"
            :ui="{
              body: 'p-4',
            }"
            variant="subtle"
            class="
              transition-all duration-200
              active:scale-95
            "
          >
            <div class="flex flex-col gap-2">
              <div :class="['w-fit rounded-lg p-2', stat.bgClass]">
                <UIcon
                  :name="stat.icon"
                  :class="['size-6', stat.iconClass]"
                />
              </div>
              <div>
                <p
                  class="
                    text-[10px] font-medium tracking-wide text-neutral-500
                    uppercase
                    dark:text-neutral-300
                  "
                >
                  {{ stat.label }}
                </p>
                <p
                  class="
                    mt-0.5 text-base font-bold text-primary-950
                    dark:text-primary-50
                  "
                >
                  {{ stat.value }}
                </p>
              </div>
            </div>
          </UCard>
        </div>

        <UCard
          v-for="activity in activityStats"
          :key="activity.label"
          :ui="{
            body: 'p-4',
          }"
          variant="subtle"
        >
          <div class="flex items-start gap-3">
            <div
              class="
                rounded-lg bg-primary-100 p-2
                dark:bg-primary-900/20
              "
            >
              <UIcon
                :name="activity.icon"
                class="
                  size-6 text-primary-600
                  dark:text-primary-400
                "
              />
            </div>
            <div class="flex-1">
              <p
                class="
                  text-sm font-semibold text-primary-950
                  dark:text-primary-50
                "
              >
                {{ activity.label }}
              </p>
              <p
                class="
                  mt-0.5 text-xs text-neutral-600
                  dark:text-neutral-300
                "
              >
                {{ activity.description }}
              </p>
            </div>
          </div>
        </UCard>

        <div class="flex items-center gap-3 py-2">
          <div
            class="
              h-px flex-1 bg-neutral-200
              dark:bg-neutral-800
            "
          />
          <span
            class="
              text-sm font-semibold text-neutral-600
              dark:text-neutral-300
            "
          >
            {{ t('account.quick_actions') }}
          </span>
          <div
            class="
              h-px flex-1 bg-neutral-200
              dark:bg-neutral-800
            "
          />
        </div>

        <ul
          role="list"
          :aria-label="t('menu')"
          class="
            grid grid-cols-2 gap-3
            lg:grid-cols-3
            xl:grid-cols-4
          "
        >
          <li
            v-for="(item, i) in menus"
            :key="i"
          >
            <UCard
              v-if="item.route && item.type === 'link'"
              :ui="{
                body: 'p-4',
              }"
              variant="subtle"
              class="
                h-full ring-1 ring-primary-200 transition-all duration-200
                hover:shadow-lg hover:ring-2 hover:ring-primary-500/30
                active:scale-95
                dark:ring-primary-800
              "
            >
              <NuxtLink
                :to="localePath(item.route)"
                :aria-label="item.text"
                class="
                  flex h-full flex-col content-center items-center
                  justify-center gap-3
                  md:items-start
                "
              >
                <div
                  class="
                    flex items-center justify-center rounded-xl
                    bg-gradient-to-br from-primary-100 to-primary-200 p-2.5
                    dark:from-primary-900 dark:to-primary-800
                  "
                >
                  <UIcon
                    v-if="item.icon"
                    :name="item.icon"
                    class="
                      size-6 text-primary-700
                      dark:text-primary-300
                    "
                  />
                </div>
                <span
                  class="
                    text-sm leading-tight font-semibold text-primary-950
                    capitalize
                    dark:text-primary-50
                  "
                >
                  {{ item.text }}
                </span>
              </NuxtLink>
            </UCard>
          </li>
          <li class="col-span-2">
            <UCard
              :ui="{
                body: 'p-4',
              }"
              variant="subtle"
              class="
                ring-1 ring-red-200 transition-all duration-200
                hover:shadow-lg hover:ring-2 hover:ring-red-500/30
                active:scale-95
                dark:ring-red-800
              "
            >
              <div class="flex items-center gap-3">
                <div
                  class="
                    flex items-center justify-center rounded-xl
                    bg-gradient-to-br from-red-100 to-red-200 p-2.5
                    dark:from-red-900/20 dark:to-red-800/20
                  "
                >
                  <UIcon
                    name="i-heroicons-arrow-right-on-rectangle"
                    class="
                      size-6 text-red-600
                      dark:text-red-400
                    "
                  />
                </div>
                <LogoutButton
                  class="!m-0 !p-0"
                  variant="link"
                  size="xl"
                />
              </div>
            </UCard>
          </li>
        </ul>
      </div>
    </MobileOrTabletOnly>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Λογαριασμός
  account:
    welcome_back: Καλώς ήρθες πάλι
    manage_description: Διαχειρίσου τον λογαριασμό και τις προτιμήσεις σου
    quick_actions: Γρήγορες Ενέργειες
    quick_actions_description: Απέκτησε γρήγορη πρόσβαση στις πιο συχνές ενέργειες λογαριασμού
    user_id: Αναγνωριστικό Χρήστη
    email: Email
    username: Όνομα Χρήστη
    full_name: Πλήρες Όνομα
    phone: Τηλέφωνο
    phone_description: Το τηλέφωνο επικοινωνίας σου
    location: Τοποθεσία
    location_description: Η πόλη και χώρα σου
    menu_description:
      account-favourites-posts: Δες τις αγαπημένες σου αναρτήσεις
      account-subscriptions: Διαχειρίσου τις εγγραφές σου
      account-loyalty: Δες τους πόντους και το ιστορικό σου
      account-settings: Ρύθμισε τις προτιμήσεις σου
      account-addresses: Διαχειρίσου τις διευθύνσεις σου
      account-orders: Δες τις παραγγελίες σου
      account-reviews: Διαχειρίσου τις κριτικές σου
      account-help: Λάβε βοήθεια και υποστήριξη
  yes: Ναι
  no: Όχι
</i18n>
