<script lang="ts" setup>
const emit = defineEmits(['generateRecoveryCodes'])

const { getRecoveryCodes, generateRecoveryCodes } = useAllAuthAccount()
const { t } = useI18n()
const localePath = useLocalePath()
const toast = useToast()
const { $i18n } = useNuxtApp()

const { data, refresh, error } = await useAsyncData(
  'recoveryCodes',
  () => getRecoveryCodes(),
)

if (error.value) {
  toast.add({
    title: t('auth.mfa.required'),
    color: 'error',
  })
  navigateTo(localePath('account-settings'))
}

const hasCodes = computed(() => {
  if (!data.value?.data?.unused_code_count) {
    return false
  }
  return data.value?.data?.unused_code_count > 0
})

const unusedCodeCount = computed(() => data.value?.data?.unused_code_count ?? 0)

const loading = ref(false)
const confirmed = ref(false)

async function onSubmit() {
  if (!confirmed.value && hasCodes.value) {
    return
  }

  try {
    loading.value = true
    await generateRecoveryCodes()
    toast.add({
      title: t('toast.success.title'),
      description: t('toast.success.description'),
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    emit('generateRecoveryCodes')
    await navigateTo(localePath('account-2fa-recovery-codes'))
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
  finally {
    loading.value = false
  }
}

function onCancel() {
  navigateTo(localePath('account-2fa-recovery-codes'))
}

onReactivated(async () => {
  await refresh()
})
</script>

<template>
  <div
    class="
      grid gap-4
      lg:flex
    "
  >
    <slot />

    <div class="space-y-6">
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <div
              class="
                flex size-10 min-w-10 items-center justify-center rounded-full
                bg-neutral-100
              "
            >
              <UIcon name="i-lucide-refresh-cw" class="size-5 text-primary-900" />
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
                  dark:text-gray-400
                "
              >
                {{ t('subtitle') }}
              </p>
            </div>
          </div>
        </template>

        <div class="space-y-6">
          <UAlert
            v-if="hasCodes"
            color="warning"
            variant="soft"
            icon="i-lucide-alert-triangle"
          >
            <template #title>
              {{ t('existing.title', unusedCodeCount) }}
            </template>
            <template #description>
              {{ t('existing.description') }}
            </template>
          </UAlert>

          <UAlert
            v-else
            color="info"
            variant="soft"
            icon="i-lucide-info"
          >
            <template #title>
              {{ t('no_existing.title') }}
            </template>
            <template #description>
              {{ t('no_existing.description') }}
            </template>
          </UAlert>

          <div class="space-y-4">
            <h2
              class="
                text-sm font-medium text-gray-900
                dark:text-white
              "
            >
              {{ t('info.title') }}
            </h2>

            <div
              class="
                space-y-3 text-sm text-gray-600
                dark:text-gray-400
              "
            >
              <div class="flex items-start gap-3">
                <div
                  class="
                    flex size-6 shrink-0 items-center justify-center
                    rounded-full bg-primary/10
                  "
                >
                  <span class="text-xs font-bold text-primary">1</span>
                </div>
                <p>{{ t('info.step1') }}</p>
              </div>

              <div class="flex items-start gap-3">
                <div
                  class="
                    flex size-6 shrink-0 items-center justify-center
                    rounded-full bg-primary/10
                  "
                >
                  <span class="text-xs font-bold text-primary">2</span>
                </div>
                <p>{{ t('info.step2') }}</p>
              </div>

              <div class="flex items-start gap-3">
                <div
                  class="
                    flex size-6 shrink-0 items-center justify-center
                    rounded-full bg-primary/10
                  "
                >
                  <span class="text-xs font-bold text-primary">3</span>
                </div>
                <p>{{ t('info.step3') }}</p>
              </div>
            </div>
          </div>

          <div
            class="
              rounded-lg border border-gray-200 bg-gray-50 p-4
              dark:border-gray-700 dark:bg-gray-800/50
            "
          >
            <h3
              class="
                mb-3 flex items-center gap-2 text-sm font-medium text-gray-900
                dark:text-white
              "
            >
              <UIcon name="i-lucide-list-checks" class="size-4" />
              {{ t('what_happens.title') }}
            </h3>
            <ul
              class="
                space-y-2 text-sm text-gray-600
                dark:text-gray-400
              "
            >
              <li class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-check"
                  class="mt-0.5 size-4 shrink-0 text-success"
                />
                <span>{{ t('what_happens.point1') }}</span>
              </li>
              <li
                v-if="hasCodes"
                class="flex items-start gap-2"
              >
                <UIcon
                  name="i-lucide-x"
                  class="mt-0.5 size-4 shrink-0 text-error"
                />
                <span>{{ t('what_happens.point2') }}</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-check"
                  class="mt-0.5 size-4 shrink-0 text-success"
                />
                <span>{{ t('what_happens.point3') }}</span>
              </li>
            </ul>
          </div>

          <UCheckbox
            v-if="hasCodes"
            v-model="confirmed"
            :label="t('confirmation.checkbox')"
            :ui="{
              label: 'text-sm font-medium',
            }"
          />
        </div>

        <template #footer>
          <div
            class="
              flex flex-col-reverse gap-3
              sm:flex-row sm:justify-end
            "
          >
            <UButton
              color="neutral"
              variant="outline"
              size="lg"
              :disabled="loading"
              @click="onCancel"
            >
              {{ $i18n.t('cancel') }}
            </UButton>
            <UButton
              color="neutral"
              size="lg"
              icon="i-lucide-refresh-cw"
              :loading="loading"
              :disabled="hasCodes && !confirmed"
              @click="onSubmit"
            >
              {{ t('action.generate') }}
            </UButton>
          </div>
        </template>
      </UCard>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Δημιουργία Νέων Κωδικών Ανάκτησης
  subtitle: Δημιούργησε ένα νέο σύνολο κωδικών ασφαλείας
  existing:
    title: Δεν έχεις διαθέσιμο κωδικό | Έχεις {n} διαθέσιμο κωδικό | Έχεις {n} διαθέσιμους κωδικούς
    description: Η δημιουργία νέων κωδικών θα ακυρώσει όλους τους υπάρχοντες κωδικούς σου. Οι παλιοί κωδικοί δεν θα λειτουργούν πλέον.
  no_existing:
    title: Δεν έχεις κωδικούς ανάκτησης
    description: Δημιούργησε ένα νέο σύνολο κωδικών για χρήση σε περίπτωση έκτακτης ανάγκης.
  info:
    title: Τι πρέπει να κάνεις
    step1: Δημιούργησε νέους κωδικούς ανάκτησης πατώντας το κουμπί παρακάτω
    step2: Αποθήκευσε τους κωδικούς σε ασφαλές μέρος (διαχειριστής κωδικών, εκτύπωση, κλπ)
    step3: Χρησιμοποίησε τους μόνο αν χάσεις την πρόσβαση στην εφαρμογή ελέγχου ταυτότητας
  what_happens:
    title: Τι θα συμβεί
    point1: Θα δημιουργηθούν 10 νέοι κωδικοί ανάκτησης
    point2: Όλοι οι παλιοί κωδικοί θα ακυρωθούν αμέσως
    point3: Κάθε νέος κωδικός μπορεί να χρησιμοποιηθεί μόνο μία φορά
  confirmation:
    checkbox: Κατανοώ ότι οι παλιοί κωδικοί θα ακυρωθούν και θέλω να συνεχίσω
  action:
    generate: Δημιουργία Κωδικών
  toast:
    success:
      title: Επιτυχής δημιουργία κωδικών
      description: Αποθήκευσε τους νέους κωδικούς σου
</i18n>
