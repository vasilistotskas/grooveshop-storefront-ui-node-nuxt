<script lang="ts" setup>
import type * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const { t } = useI18n()
const { fields: schema, isSubmitting, send } = useContactEnquiry({ t })

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: undefined,
  email: undefined,
  message: undefined,
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!await send(event.data)) return

  state.name = undefined
  state.email = undefined
  state.message = undefined
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
          @error="scrollToFirstFormError"
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
              icon="i-heroicons-user"
              size="xl"
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
              icon="i-heroicons-envelope"
              :placeholder="t('email.title')"
              type="email"
              size="xl"
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
              size="xl"
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
