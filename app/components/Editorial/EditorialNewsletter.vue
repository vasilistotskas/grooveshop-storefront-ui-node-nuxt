<script setup lang="ts">
const emits = defineEmits(['subscribe', 'hydrated'])

const email = ref('')
const agreed = ref(false)
const isSubscribing = ref(false)
const isSubscribed = ref(false)
const error = ref('')

onMounted(() => {
  emits('hydrated')
})

const handleSubmit = async () => {
  error.value = ''

  if (!email.value) {
    error.value = 'Email is required'
    return
  }

  if (!agreed.value) {
    error.value = 'You must agree to receive newsletters'
    return
  }

  try {
    isSubscribing.value = true
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800))
    isSubscribed.value = true
    emits('subscribe', email.value)
  }
  catch (err) {
    console.error(err)
    error.value = 'An error occurred. Please try again.'
  }
  finally {
    isSubscribing.value = false
  }
}
</script>

<template>
  <div class="newsletter-form">
    <form v-if="!isSubscribed" class="space-y-4" @submit.prevent="handleSubmit">
      <UInput
        v-model="email"
        placeholder="Enter your email address"
        icon="i-heroicons-envelope"
        size="lg"
        class="w-full"
        :state="error ? 'error' : undefined"
      />

      <div class="flex items-center gap-2">
        <UCheckbox v-model="agreed" label="I agree to receive newsletters" color="primary" />
      </div>

      <UAlert v-if="error" color="error" variant="soft" class="text-sm" icon="i-heroicons-exclamation-triangle">
        {{ error }}
      </UAlert>

      <UButton
        type="submit"
        color="primary"
        size="lg"
        block
        :loading="isSubscribing"
        trailing-icon="i-heroicons-arrow-right"
      >
        Subscribe Now
      </UButton>
    </form>

    <div v-else class="text-center p-4">
      <UIcon name="i-heroicons-check-circle" class="text-5xl text-green-500 mb-4" />
      <h3 class="text-xl font-semibold mb-2">
        Thank you for subscribing!
      </h3>
      <p class="text-gray-600 dark:text-gray-400">
        You'll receive our latest updates and exclusive content directly to your inbox.
      </p>
    </div>
  </div>
</template>
