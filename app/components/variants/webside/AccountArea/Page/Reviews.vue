<script lang="ts" setup>
/**
 * "My reviews" on webside: the platform's own body (`Storefront/Account/
 * Reviews.vue`), inside the account-area page frame the other webside
 * account pages sit in. The reviews UI is one implementation for every
 * store; only this frame is webside's, because its account shell leaves
 * the page container to each page.
 */
</script>

<template>
  <WebsideAccountAreaPageWrapper>
    <StorefrontAccountReviews />
  </WebsideAccountAreaPageWrapper>
</template>
