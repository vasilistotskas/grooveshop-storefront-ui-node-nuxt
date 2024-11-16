<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })
</script>

<template>
  <nav
    class="
      border-primary-500 static z-10 w-auto border-b bg-transparent px-0
      shadow-none
    "
  >
    <ul
      role="tablist"
      class="flex snap-x gap-4 overflow-x-auto"
    >
      <li
        role="tab"
        class="shrink-0"
      >
        <Anchor
          :to="'account-favourites-products'"
          :aria-label="t('favourite.products')"
          :title="t('favourite.products')"
          class="
            text-primary-600 block whitespace-nowrap py-4 text-sm outline-none
          "
        >
          <span
            class="
              text-primary-950

              dark:text-primary-50
            "
          >
            {{ t('favourite.products') }}
          </span>
        </Anchor>
      </li>
      <li
        role="tab"
        class="shrink-0"
      >
        <Anchor
          :to="'account-favourites-posts'"
          :aria-label="t('favourite.posts')"
          :title="t('favourite.posts')"
          class="
            text-primary-600 block whitespace-nowrap py-4 text-sm outline-none
          "
        >
          <span
            class="
              text-primary-950

              dark:text-primary-50
            "
          >
            {{ t('favourite.posts') }}
          </span>
        </Anchor>
      </li>
    </ul>
  </nav>
</template>

<i18n lang="yaml">
el:
  favourite:
    products: Αγαπημένα Προϊόντα
    posts: Αγαπημένες Δημοσιεύσεις
</i18n>
