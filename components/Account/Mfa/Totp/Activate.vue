<script lang="ts" setup>
const { totpActivateGet } = useAuthMfa()

const { data: totp } = await totpActivateGet()
</script>

<template>
  <section
    class="
      container-2xs relative grid items-center justify-center
      justify-items-center gap-1 p-0

      md:px-6
    "
  >
    <div
      v-if="totp"
      class="grid items-center justify-center justify-items-center gap-4"
    >
      <p v-html="totp.totpSvg" />
      <p
        class="
          text-primary-500 rounded-md border border-primary-500 p-2 text-xs
          italic

          dark:text-primary-400 dark:border-primary-500

          lg:text-base
        "
      >
        {{ totp.secret }}
      </p>
    </div>
  </section>
</template>
