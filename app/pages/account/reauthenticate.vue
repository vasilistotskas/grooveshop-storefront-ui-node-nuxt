<script lang="ts" setup>
const emit = defineEmits(['reauthenticate'])

const { reauthenticate } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n()
const authEvent = useState<AuthChangeEventType>('authEvent')
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const loading = ref(false)
const password = ref('')
const showPassword = ref(false)

if (authEvent.value !== AuthChangeEvent.REAUTHENTICATION_REQUIRED) {
  await navigateTo(localePath('index'))
}

async function onSubmit() {
  if (!password.value) {
    toast.add({
      title: $i18n.t('validation.required'),
      color: 'error',
    })
    return
  }

  try {
    loading.value = true
    await reauthenticate({
      password: password.value,
    })
    toast.add({
      title: $i18n.t('success.title'),
      description: t('success.description'),
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
    emit('reauthenticate')
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
  finally {
    loading.value = false
  }
}

definePageMeta({
  layout: 'auth',
})
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center px-4 py-12">
    <UCard
      class="w-full max-w-lg"
      :ui="{
        body: 'space-y-6',
      }"
    >
      <template #header>
        <div class="space-y-2 text-center">
          <div
            class="
              mx-auto flex size-12 items-center justify-center rounded-full
              bg-primary/10
            "
          >
            <UIcon
              name="i-heroicons-shield-check"
              class="size-6 text-info"
            />
          </div>
          <h2 class="text-2xl font-bold tracking-tight">
            {{ t('title') }}
          </h2>
          <p class="text-sm text-muted">
            {{ t('description') }}
          </p>
        </div>
      </template>

      <Account2FaReauthenticateFlow :flow="Flows.REAUTHENTICATE">
        <form
          class="space-y-4"
          @submit.prevent="onSubmit"
        >
          <UFormField
            :label="t('password.label')"
            name="password"
            :ui="{
              container: '',
            }"
            required
          >
            <UInput
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              :placeholder="t('password.placeholder')"
              size="lg"
              icon="i-heroicons-lock-closed"
              autocomplete="current-password"
              :disabled="loading"
              :ui="{
                root: 'w-full',
                trailing: 'pe-1',
              }"
            >
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  :icon="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                  :aria-label="showPassword ? t('password.hide') : t('password.show')"
                  :aria-pressed="showPassword"
                  @click="showPassword = !showPassword"
                />
              </template>
            </UInput>
          </UFormField>

          <UButton
            type="submit"
            color="neutral"
            size="lg"
            block
            :loading="loading"
            :disabled="!password"
            icon="i-heroicons-arrow-right"
            trailing
          >
            {{ t('submit') }}
          </UButton>
        </form>
      </Account2FaReauthenticateFlow>

      <template #footer>
        <UAlert
          color="info"
          variant="soft"
          icon="i-heroicons-information-circle"
          :title="t('info.title')"
          :description="t('info.description')"
        />
      </template>
    </UCard>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Επαναπιστοποίηση
  description: Για λόγους ασφαλείας, παρακαλούμε επιβεβαιώστε τον κωδικό σας
  password:
    label: Κωδικός Πρόσβασης
    placeholder: Εισάγετε τον κωδικό σας
    show: Εμφάνιση κωδικού
    hide: Απόκρυψη κωδικού
  submit: Επιβεβαίωση
  success:
    description: Επιτυχής επαναπιστοποίηση
  info:
    title: Γιατί χρειάζεται αυτό;
    description: Για την προστασία του λογαριασμού σας, απαιτείται επαναπιστοποίηση για ευαίσθητες ενέργειες
</i18n>
