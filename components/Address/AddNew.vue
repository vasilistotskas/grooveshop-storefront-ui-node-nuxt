<template>
  <li
    class="
      relative grid min-h-[160px] place-content-center place-items-center gap-2
      border-2 border-dashed border-primary-500 bg-transparent text-left
      text-base font-normal leading-6 text-primary-600

      md:min-h-[244px] md:min-h-[305px] md:gap-8
    "
  >
    <p
      class="
        text-primary-950 p-4

        dark:text-primary-50
      "
    >
      {{ $t('components.address.add_new.title') }}
    </p>
    <div class="grid items-center justify-center">
      <UButton
        class="w-full"
        color="primary"
        :label="$t('components.address.add_new.button')"
        :to="'/account/addresses/new'"
        size="lg"
      />
    </div>
  </li>
</template>
