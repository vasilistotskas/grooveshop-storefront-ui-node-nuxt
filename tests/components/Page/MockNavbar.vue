<script lang="ts" setup>
import type { PropType } from 'vue'

defineProps({
  user: {
    type: Object as PropType<AuthenticationReadable>,
    default: () => ({ email: 'test@example.com' }),
  },
  loggedIn: {
    type: Boolean,
    default: true,
  },
  onLogout: {
    type: Function,
    default: () => {},
  },
})
</script>

<template>
  <div class="navbar">
    <div class="navbar-content">
      <div class="navbar-title">
        <h1>
          <a href="/">Grooveshop</a>
        </h1>
      </div>
      <div class="navbar-menu">
        <nav>
          <ul>
            <li>
              <a href="/shop">Shop</a>
            </li>
            <li>
              <a href="/blog">Blog</a>
            </li>
          </ul>
          <ul>
            <li>
              <button>Language</button>
            </li>
            <li>
              <button>Theme</button>
            </li>
            <li v-if="loggedIn">
              <button>Notifications</button>
            </li>
            <li>
              <UChip color="success" :show="true" text="3">
                <button>Cart</button>
              </UChip>
            </li>
            <li v-if="loggedIn && user">
              <div>
                <UserAvatar :img-height="30" :img-width="30" :show-name="false" :user-account="user" />
              </div>
              <button class="logout-button" type="button" @click="onLogout()">
                Logout
              </button>
            </li>
            <li v-if="!loggedIn">
              <a href="/account/login">Login</a>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </div>
</template>
