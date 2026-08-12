<script lang="ts" setup>
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const { t } = useI18n()
const toast = useToast()

const isSubmitting = ref(false)

const schema = z.object({
  name: z.string({
    error: issue => issue.input === undefined
      ? t('validation.required')
      : t('validation.string.invalid'),
  }).min(2, { error: t('validation.string.invalid') })
    .max(100, { error: t('validation.max', { max: 100 }) }),

  email: z.email({
    error: issue => issue.input === undefined
      ? t('validation.required')
      : t('validation.email.valid'),
  }).max(254, { error: t('validation.max', { max: 254 }) }),

  message: z.string({
    error: issue => issue.input === undefined
      ? t('validation.required')
      : t('validation.string.invalid'),
  }).min(10, { error: t('validation.min', { min: 10 }) })
    .max(5000, { error: t('validation.max', { max: 5000 }) })
    // Django's contact spam filter rejects anything under 5 words
    // (contact/utils.py detect_spam_patterns) — mirror it here so a
    // short-but-legitimate inquiry gets an inline hint instead of an
    // opaque 400 at submit.
    .refine(
      value => value.trim().split(/\s+/).filter(Boolean).length >= 5,
      { error: t('validation.message.min_words', { min: 5 }) },
    ),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: undefined,
  email: undefined,
  message: undefined,
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (isSubmitting.value) return
  isSubmitting.value = true
  try {
    await $fetch('/api/contact', {
      method: 'POST',
      body: event.data,
    })

    toast.add({
      title: t('success.title'),
      color: 'success',
    })

    state.name = undefined
    state.email = undefined
    state.message = undefined
  }
  catch (error) {
    // The proxy forwards Django's 4xx validation body — surface the
    // field detail (spam filter, disposable email, …) instead of a
    // blanket failure.
    const data = error && typeof error === 'object' && 'data' in error
      ? (error as { data: unknown }).data
      : null
    toast.add({
      title: t('error.default'),
      description: isDrfFieldErrorMap(data)
        ? formatDrfFieldErrors(data, t)
        : undefined,
      color: 'error',
    })
  }
  finally {
    isSubmitting.value = false
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
            :label="t('name')"
            name="name"
            required
          >
            <UInput
              v-model="state.name"
              :placeholder="t('name')"
              size="lg"
              autocomplete="name"
              :ui="{
                root: 'w-full',
              }"
            />
          </UFormField>

          <!-- Email Field -->
          <UFormField
            :label="t('email.title')"
            name="email"
            required
          >
            <UInput
              v-model="state.email"
              :placeholder="t('email.title')"
              type="email"
              size="lg"
              autocomplete="email"
              :ui="{
                root: 'w-full',
              }"
            />
          </UFormField>

          <!-- Message Field -->
          <UFormField
            :label="t('message')"
            name="message"
            required
          >
            <UTextarea
              v-model="state.message"
              :placeholder="t('message')"
              :rows="6"
              size="lg"
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
              block
              :loading="isSubmitting"
              :disabled="isSubmitting"
            >
              {{ t('submit') }}
            </UButton>
          </div>
        </UForm>
      </UCard>
    </div>
  </section>
</template>
