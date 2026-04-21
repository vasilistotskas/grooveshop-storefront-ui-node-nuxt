<script lang="ts" setup>
definePageMeta({
  layout: 'default',
  // Landing page for the abandoned-cart recovery email link. Runs the
  // redirect inside the page's own middleware so the navigation fires
  // BEFORE Vue mounts the component — avoids the SSR double-render
  // you'd get from a top-level ``await navigateTo()`` in
  // ``<script setup>``.
  //
  // Auth is enforced by the global ``auth.global`` middleware via the
  // ``cart-recover-uuid`` entry in ``AuthenticatedRoutes``, so a
  // logged-out click routes through ``/account/login?next=...`` and
  // lands back here after sign-in.
  //
  // The Cart auto-loads from the backend by user FK on ``/cart`` — we
  // don't need to resolve the UUID path param here. It's just a
  // correlation marker from the email and we drop it on forward,
  // passing ``recovered=1`` so the cart page can show the welcome
  // banner. ``@nuxtjs/i18n``'s routing middleware rewrites the path to
  // include the active locale prefix when needed, so a plain
  // ``/cart`` target is safe across all configured locales.
  middleware: [
    () => navigateTo(
      { path: '/cart', query: { recovered: '1' } },
      { replace: true },
    ),
  ],
})

defineRouteRules({
  robots: false,
})
</script>

<template>
  <div />
</template>
