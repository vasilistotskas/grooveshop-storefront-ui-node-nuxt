<script lang="ts" setup>
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const toast = useToast()
const { $i18n } = useNuxtApp()

const loading = ref(false)

const schema = z.object({
  name: z.string({
    error: issue => issue.input === undefined
      ? $i18n.t('validation.required')
      : $i18n.t('validation.string.invalid'),
  }).min(2, { error: $i18n.t('validation.string.invalid') }),

  email: z.email({
    error: issue => issue.input === undefined
      ? $i18n.t('validation.required')
      : $i18n.t('validation.email.valid'),
  }),

  message: z.string({
    error: issue => issue.input === undefined
      ? $i18n.t('validation.required')
      : $i18n.t('validation.string.invalid'),
  }).min(10, { error: $i18n.t('validation.string.invalid') }),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: undefined,
  email: undefined,
  message: undefined,
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    await $fetch('/api/contact', {
      method: 'POST',
      body: event.data,
    })

    toast.add({
      title: $i18n.t('success.title'),
      color: 'success',
    })

    state.name = undefined
    state.email = undefined
    state.message = undefined
  }
  catch {
    toast.add({
      title: $i18n.t('error.default'),
      color: 'error',
    })
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <section
    class="
      container mx-auto
      sm:px-6 sm:py-6
      lg:px-8
    "
  >
    <div class="mx-auto max-w-xl">
      <!-- Form Card -->
      <UCard class="shadow-lg">
        <UForm
          :schema="schema"
          :state="state"
          class="space-y-5"
          @submit="onSubmit"
        >
          <!-- Name Field -->
          <UFormField
            :label="$i18n.t('name')"
            name="name"
            required
          >
            <UInput
              v-model="state.name"
              :placeholder="$i18n.t('name')"
              size="lg"
              autocomplete="name"
              :disabled="loading"
              :ui="{
                root: 'w-full',
              }"
            />
          </UFormField>

          <!-- Email Field -->
          <UFormField
            :label="$i18n.t('email.title')"
            name="email"
            required
          >
            <UInput
              v-model="state.email"
              :placeholder="$i18n.t('email.title')"
              type="email"
              size="lg"
              autocomplete="email"
              :disabled="loading"
              :ui="{
                root: 'w-full',
              }"
            />
          </UFormField>

          <!-- Message Field -->
          <UFormField
            :label="$i18n.t('message')"
            name="message"
            required
          >
            <UTextarea
              v-model="state.message"
              :placeholder="$i18n.t('message')"
              :rows="6"
              size="lg"
              :disabled="loading"
              :ui="{
                root: 'w-full',
              }"
            />
          </UFormField>

          <!-- Submit Button -->
          <div class="pt-2">
            <UButton
              type="submit"
              color="success"
              variant="soft"
              size="lg"
              :loading="loading"
              :disabled="loading"
              block
            >
              {{ $i18n.t('submit') }}
            </UButton>
          </div>
        </UForm>
      </UCard>
    </div>
  </section>
</template>
