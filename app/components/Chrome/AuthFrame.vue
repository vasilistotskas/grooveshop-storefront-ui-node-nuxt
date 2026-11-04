<script lang="ts" setup>
/**
 * What a design draws around the sign-in, sign-up and re-authentication
 * pages inside the default layout. The platform draws nothing of its own
 * here (its Volt sign-in frame is the `auth-split` layout); a store with a
 * design of its own ships its frame as the `auth_frame` chrome variant,
 * the way it ships `account_shell` for the account area.
 */
defineSlots<{
  default(props: object): any
}>()
</script>

<template>
  <slot />
</template>
