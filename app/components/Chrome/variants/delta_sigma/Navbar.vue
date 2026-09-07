<script lang="ts" setup>
import type { RouteLocationNamedI18n } from 'vue-router'

/**
 * Δelta Σigma's header, built to the artboards rather than assembled
 * from the platform's storefront chrome.
 *
 * The measurements are the design's, not approximations: 64px bar, a
 * 1px `#1E293B` rule, an 85%-opaque `#020617` ground, a 1280px inner
 * track, 13.5px nav links at `#94A3B8` with the active one white, a
 * 26px nav gap, a monospace EL/EN pill in a 6px-radius `#1E293B` box,
 * and one teal CTA at 13px/600 in 9×14 padding. They are written as
 * arbitrary Tailwind values on purpose — this is one tenant's chrome,
 * not a new set of platform tokens.
 *
 * What the design deliberately does NOT have, and so neither does
 * this: ⌘K search, the favourites heart, the account avatar, the cart.
 * Δelta Σigma is an engineering contractor with a quote-only
 * catalogue; those affordances belong to shops. The colour-mode button
 * is kept at the operator's request — the theme system supports both
 * and the artboards are dark-only.
 *
 * Nav content stays merchant data: it comes from the tenant's
 * `NavigationMenu` rows through `useNavigation()`, per locale. The
 * design's shape is imposed on that data rather than hardcoded — the
 * `/contact` entry becomes the CTA, and `Αρχική` leads.
 *
 * COLOUR IS TOKENS, NOT LITERALS. Every value the artboards use turned
 * out to be a step on the tenant's own ramps — `#020617` is
 * `--ui-bg` in dark, `#1E293B` is `--ui-border`, `#94A3B8` is
 * `--ui-text-muted`, and `#5BC4C4` is `--ui-primary` exactly — so this
 * band is written in `bg-default` / `bg-muted` / `border-default` /
 * `text-muted` / `text-primary` and inverts for light mode on its own.
 * The hexes below are the MEASUREMENT that established the mapping,
 * not what the markup says.
 */
const { locale, t } = useI18n()
const route = useRoute()
const { headerItems } = useNavigation()
const { setLanguage } = useUserLanguage()
const tenantStore = useTenantStore()

const CONTACT_PATH = '/contact'

/** Nav links, contact removed — it is the CTA in this design. */
const links = computed(() =>
  (headerItems.value ?? []).filter(item => item.to !== CONTACT_PATH),
)

/** The CTA, from the menu when present so its label stays translated. */
const cta = computed(() =>
  (headerItems.value ?? []).find(item => item.to === CONTACT_PATH),
)

/**
 * Active state for an operator-configured PATH.
 *
 * The menu rows hold unprefixed paths (`/services`) while the live
 * route carries the locale under `prefix_except_default`
 * (`/en/services`), so the prefix has to come off before comparing —
 * through `splitLocale`, which checks the segment against the
 * supported set rather than reading any two letters as a locale.
 */
const isActive = (path?: string) => {
  if (!path) return false
  const current = splitLocale(route.path).route
  if (path === '/') return current === '/'
  return current === path || current.startsWith(`${path}/`)
}

/**
 * The EL/EN pill. Rendered only for a tenant that actually serves more
 * than one locale — `availableLocales` is the per-tenant allow-list, so
 * a single-language store gets no dead control.
 */
const locales = computed(() => tenantStore.availableLocales)
const mobileOpen = ref(false)

async function pick(code: string) {
  if (code === locale.value) return
  await setLanguage(code)
}
</script>

<template>
  <div
    class="
      sticky top-0 z-50 border-b border-default bg-default/85
      backdrop-blur-md
    "
  >
    <div
      class="
        mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5
        xl:px-0
      "
    >
      <NuxtLinkLocale
        to="index"
        :aria-label="tenantStore.storeName || 'Δelta Σigma'"
      >
        <ChromeVariantsDeltaSigmaLogo :show-caption="true" />
      </NuxtLinkLocale>

      <!-- Desktop nav: plain text links, no pills, no underline chrome. -->
      <nav
        class="hidden items-center gap-[26px] lg:flex"
        :aria-label="t('navigation')"
      >
        <NuxtLinkLocale
          to="index"
          class="text-[13.5px] transition-colors"
          :class="isActive('/')
            ? 'font-medium text-highlighted'
            : 'text-muted hover:text-highlighted'"
          :aria-current="isActive('/') ? 'page' : undefined"
        >
          {{ t('home') }}
        </NuxtLinkLocale>
        <NuxtLinkLocale
          v-for="item in links"
          :key="item.label"
          :to="(item.to ?? '/') as RouteLocationNamedI18n"
          class="text-[13.5px] transition-colors"
          :class="isActive(item.to)
            ? 'font-medium text-highlighted'
            : 'text-muted hover:text-highlighted'"
          :aria-current="isActive(item.to) ? 'page' : undefined"
        >
          {{ item.label }}
        </NuxtLinkLocale>
      </nav>

      <div class="flex items-center gap-2.5">
        <!-- Kept at the operator's request; the artboards are dark-only
             and show no such control. Placed BEFORE the locale pill so
             the design's pill + CTA pair stays adjacent and the CTA
             stays flush with the 1280px track's right edge. -->
        <UColorModeButton
          size="sm"
          class="hidden sm:inline-flex"
        />

        <div
          v-if="locales.length > 1"
          class="
            hidden h-[30px] items-center gap-1.5 rounded-md border
            border-default px-2 font-mono text-[11.5px] leading-none
            text-dimmed
            sm:flex
          "
        >
          <template
            v-for="(code, index) in locales"
            :key="code"
          >
            <span
              v-if="index > 0"
              aria-hidden="true"
            >/</span>
            <button
              type="button"
              class="uppercase transition-colors"
              :class="code === locale
                ? 'text-default'
                : 'hover:text-default'"
              :aria-current="code === locale ? 'true' : undefined"
              @click="pick(code)"
            >
              {{ code }}
            </button>
          </template>
        </div>

        <NuxtLinkLocale
          v-if="cta"
          :to="(cta.to ?? CONTACT_PATH) as RouteLocationNamedI18n"
          class="
            hidden h-[34px] items-center gap-1.5 rounded-md bg-primary px-4
            text-[13px] font-semibold text-inverted transition-colors
            hover:bg-primary/85
            sm:inline-flex
          "
        >
          {{ cta.label }}
          <UIcon
            name="i-lucide:arrow-right"
            class="size-3.5"
          />
        </NuxtLinkLocale>

        <!-- Mobile: the artboard shows the current locale as plain
             text — not the switch pill, which needs both codes and the
             separator to read as one — then a bordered burger square,
             and nothing else. -->
        <span
          v-if="locales.length > 1"
          class="
            font-mono text-[11.5px] text-muted uppercase
            sm:hidden
          "
        >{{ locale }}</span>
        <button
          type="button"
          class="
            flex size-10 items-center justify-center rounded-md border
            border-default text-default
            lg:hidden
          "
          :aria-label="t('menu')"
          :aria-expanded="mobileOpen"
          @click="mobileOpen = !mobileOpen"
        >
          <UIcon
            :name="mobileOpen ? 'i-lucide:x' : 'i-lucide:menu'"
            class="size-5"
          />
        </button>
      </div>
    </div>

    <div
      v-if="mobileOpen"
      class="border-t border-default px-5 pb-5 lg:hidden"
    >
      <nav
        class="flex flex-col gap-1 pt-3"
        :aria-label="t('navigation')"
      >
        <NuxtLinkLocale
          to="index"
          class="py-2 text-[15px] text-default"
          @click="mobileOpen = false"
        >
          {{ t('home') }}
        </NuxtLinkLocale>
        <NuxtLinkLocale
          v-for="item in links"
          :key="item.label"
          :to="(item.to ?? '/') as RouteLocationNamedI18n"
          class="py-2 text-[15px] text-default"
          @click="mobileOpen = false"
        >
          {{ item.label }}
        </NuxtLinkLocale>
        <NuxtLinkLocale
          v-if="cta"
          :to="(cta.to ?? CONTACT_PATH) as RouteLocationNamedI18n"
          class="
            mt-3 flex items-center justify-center gap-1.5 rounded-md
            bg-primary px-4 py-3 text-[15px] font-semibold text-inverted
          "
          @click="mobileOpen = false"
        >
          {{ cta.label }}
          <UIcon
            name="i-lucide:arrow-right"
            class="size-4"
          />
        </NuxtLinkLocale>
        <div
          v-if="locales.length > 1"
          class="mt-3 flex items-center gap-3 font-mono text-xs"
        >
          <button
            v-for="code in locales"
            :key="code"
            type="button"
            class="uppercase"
            :class="code === locale ? 'text-default' : 'text-dimmed'"
            @click="pick(code)"
          >
            {{ code }}
          </button>
        </div>
      </nav>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  home: Αρχική
  navigation: Πλοήγηση
  menu: Μενού
en:
  home: Home
  navigation: Navigation
  menu: Menu
</i18n>
