<template>
  <nav
    class="
      static z-10 w-auto border-b border-primary-500 bg-transparent px-0
      shadow-none
    "
  >
    <ul role="tablist" class="flex snap-x gap-4 overflow-x-auto">
      <li role="tab" class="shrink-0">
        <Anchor
          :to="`/account/favourites/products`"
          :aria-label="$t('pages.account.favourites.products.title')"
          :title="$t('pages.account.favourites.products.title')"
          class="
            block whitespace-nowrap py-4 text-sm text-primary-600 outline-none
          "
        >
          <span
            class="
              text-primary-950

              dark:text-primary-50
            "
          >
            {{ $t('pages.account.favourites.products.title') }}
          </span>
        </Anchor>
      </li>
      <li role="tab" class="shrink-0">
        <Anchor
          :to="`/account/favourites/posts`"
          :aria-label="$t('pages.account.favourites.posts.title')"
          :title="$t('pages.account.favourites.posts.title')"
          class="
            block whitespace-nowrap py-4 text-sm text-primary-600 outline-none
          "
        >
          <span
            class="
              text-primary-950

              dark:text-primary-50
            "
          >
            {{ $t('pages.account.favourites.posts.title') }}
          </span>
        </Anchor>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts"></script>
