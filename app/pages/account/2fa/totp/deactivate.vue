<script lang="ts" setup>
const emit = defineEmits(['deactivateTotp'])

const { deactivateTotp, totpAuthenticatorStatus } = useAllAuthAccount()
const { t } = useI18n()
const toast = useToast()
const { $i18n } = useNuxtApp()
const localePath = useLocalePath()

const loading = ref(false)
const showConfirmation = ref(false)

const { error, refresh } = await useAsyncData(
  'totpAuthenticatorStatus',
  () => totpAuthenticatorStatus(),
  {
    server: false, // User-specific data: client-side only
  },
)

watchEffect(async () => {
  if (error.value) {
    await navigateTo(localePath('account-settings'))
  }
})

async function onConfirm() {
  try {
    loading.value = true
    await deactivateTotp()

    toast.add({
      title: $i18n.t('success.title'),
      description: t('success.description'),
      color: 'success',
      icon: 'i-heroicons-shield-check',
    })

    emit('deactivateTotp')
    await navigateTo(localePath('account-settings'))
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
  finally {
    loading.value = false
  }
}

function onCancel() {
  navigateTo(localePath('account-settings'))
}

onReactivated(async () => {
  await refresh()
})

defineRouteRules({
  robots: false,
})

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper
    class="
      flex flex-col gap-4
      md:gap-8 md:!p-0
    "
  >
    <PageTitle
      :text="t('title')"
      class="hidden"
    />

    <div
      class="
        grid gap-4
        lg:flex
      "
    >
      <aside
        class="md:sticky md:top-16"
      >
        <AccountAuthSettingsNavigation />
      </aside>
      <UCard
        :ui="{
          body: 'space-y-6',
        }"
      >
        <template #header>
          <div class="flex items-center gap-3">
            <div
              class="
                flex size-10 min-w-10 items-center justify-center rounded-full
                bg-error/10
              "
            >
              <UIcon
                name="i-heroicons-shield-exclamation"
                class="size-5 text-error"
              />
            </div>
            <div>
              <h1
                class="
                  text-lg font-semibold text-gray-900
                  md:text-xl
                  dark:text-white
                "
              >
                {{ t('title') }}
              </h1>
              <p
                class="
                  mt-1 text-sm text-gray-500
                  dark:text-gray-200
                "
              >
                {{ t('subtitle') }}
              </p>
            </div>
          </div>
        </template>

        <UAlert
          color="warning"
          variant="soft"
          icon="i-heroicons-exclamation-triangle"
          :title="t('warning.title')"
          :description="t('warning.description')"
        />

        <div class="space-y-4">
          <div
            class="
              text-sm text-gray-700
              dark:text-gray-300
            "
          >
            {{ t('info.paragraph1') }}
          </div>

          <div
            class="
              rounded-lg bg-gray-50 p-4
              dark:bg-gray-800/50
            "
          >
            <h3
              class="
                mb-2 text-sm font-medium text-gray-900
                dark:text-white
              "
            >
              {{ t('info.consequences_title') }}
            </h3>
            <ul
              class="
                space-y-2 text-sm text-gray-600
                dark:text-gray-200
              "
            >
              <li class="flex items-start gap-2">
                <UIcon
                  name="i-heroicons-x-mark" class="
                    mt-0.5 size-4 shrink-0 text-error
                  "
                />
                <span>{{ t('info.consequence1') }}</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon
                  name="i-heroicons-x-mark" class="
                    mt-0.5 size-4 shrink-0 text-error
                  "
                />
                <span>{{ t('info.consequence2') }}</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon
                  name="i-heroicons-x-mark" class="
                    mt-0.5 size-4 shrink-0 text-error
                  "
                />
                <span>{{ t('info.consequence3') }}</span>
              </li>
            </ul>
          </div>
        </div>

        <UCheckbox
          v-model="showConfirmation"
          color="neutral"
          :label="t('confirmation.checkbox')"
          :ui="{
            label: 'text-sm font-medium',
          }"
        />

        <template #footer>
          <div
            class="
              flex flex-col-reverse gap-3
              sm:flex-row sm:justify-end
            "
          >
            <UButton
              :label="$i18n.t('cancel')"
              color="neutral"
              variant="outline"
              size="lg"
              :disabled="loading"
              @click="onCancel"
            />
            <UButton
              :label="$i18n.t('deactivate')"
              color="error"
              size="lg"
              icon="i-heroicons-shield-exclamation"
              :loading="loading"
              :disabled="!showConfirmation"
              @click="onConfirm"
            />
          </div>
        </template>
      </UCard>
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Απενεργοποίηση εφαρμογής ελέγχου ταυτότητας (TOTP)
  subtitle: Διαχείριση ρυθμίσεων ασφάλειας λογαριασμού
  warning:
    title: Προειδοποίηση Ασφαλείας
    description: Η απενεργοποίηση του TOTP θα μειώσει την ασφάλεια του λογαριασμού σου. Σιγουρέψου ότι έχεις εναλλακτικά μέτρα ασφαλείας.
  info:
    paragraph1: Είσαι σίγουρος ότι θέλεις να απενεργοποιήσεις την εφαρμογή ελέγχου ταυτότητας;
    consequences_title: Τι θα συμβεί αν απενεργοποιήσετε το TOTP
    consequence1: Δεν θα χρειάζεται πλέον κωδικός επαλήθευσης κατά τη σύνδεση
    consequence2: Ο λογαριασμός σου θα είναι λιγότερο ασφαλής
    consequence3: Θα πρέπει να ρυθμίσεις ξανά το TOTP αν το ενεργοποιήσεις στο μέλλον
  confirmation:
    checkbox: Κατανοώ τους κινδύνους και θέλω να συνεχίσω
  success:
    description: Η εφαρμογή ελέγχου ταυτότητας απενεργοποιήθηκε επιτυχώς
</i18n>
