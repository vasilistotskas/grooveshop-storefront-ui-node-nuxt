<template>
  <li
    class="relative grid min-h-[305px] place-content-center place-items-center gap-8 border-2 border-dashed border-gray-300 bg-transparent text-left text-base font-normal leading-6 text-gray-600"
  >
    <p class="text-primary-700 dark:text-primary-100 p-4">
      {{ $t('components.address.add_new.title') }}
    </p>
    <div class="grid items-center justify-center">
      <UButton
        class="w-full"
        color="white"
        :label="$t('components.address.add_new.button')"
        :to="'/account/addresses/new'"
        size="lg"
      />
    </div>
  </li>
</template>
