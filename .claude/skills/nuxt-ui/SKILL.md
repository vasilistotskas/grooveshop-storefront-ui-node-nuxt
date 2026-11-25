---
name: nuxt-ui
description: Write storefront UI with Nuxt UI v4 (the `U*` components, `useToast`, `defineShortcuts`, `app.config.ts` theming) the way this repo uses it. Use when building or changing components, pages, forms, overlays, the shopping assistant's chat, the page editor's dashboard or rich text field, or when restyling a Nuxt UI component.
---

# Nuxt UI

Nuxt UI is the storefront's component library: Vue components built on
[Reka UI](https://reka-ui.com/), styled with Tailwind CSS through
[Tailwind Variants](https://www.tailwind-variants.org/). This skill covers how
this repo uses it. The repo rules win over anything here:
`.claude/rules/ui-and-pages.md` (styling, images, pages, designs) and `CLAUDE.md`.

## Where the truth is

- **The installed version** is the authority: `node_modules/@nuxt/ui/dist/runtime/components/<Name>.vue.d.ts`
  for props, slots and emits, `dist/runtime/composables/*.d.ts` for composables.
  Props a component inherits from Reka UI (`open`, `delayDuration`, `unmountOnHide`, …)
  are declared in `reka-ui`'s types, not in the Nuxt UI file.
- **The generated theme** of a component, its slots, variants and default classes:
  `.nuxt/ui/<kebab-name>.ts` (`.nuxt/ui/select-menu.ts`), written by `pnpm prepare`
  or `pnpm dev`. It shows the library's defaults only; this repo's overrides are in
  `app/app.config.ts`, merged at runtime.
- **The docs**: [ui.nuxt.com](https://ui.nuxt.com/docs/components), or the
  `nuxt-ui-remote` MCP server (`search-components`, `get-component-metadata`,
  `search-composables`, `get-documentation-page`). They describe the latest release,
  which can be ahead of the version `package.json` pins.

## Setup in this repo

Nuxt UI is installed and configured; do not re-run an installation guide.

- `nuxt.config.ts`: `@nuxt/ui` in `modules`, and
  `ui: { content: true, experimental: { componentDetection: true } }`. `content`
  registers the content components without `@nuxt/content` (the blog post's
  `UContentToc`). `componentDetection` generates a theme only for the components
  the source names; a component reached only dynamically must be added to that
  option as an array (`componentDetection: ['Modal']`).
- `app/assets/css/main.css`: `@import "tailwindcss" theme(static);` then
  `@import "@nuxt/ui";`, followed by the repo's tokens and colour-scheme blocks.
- `app/app.vue`: the app is wrapped in `UApp` (toaster position and duration set
  there). `UApp` follows the `@nuxtjs/i18n` locale by itself: pass no `locale` prop.
- `app/app.config.ts`: `ui.colors` (`primary: 'neutral'`, `neutral: 'zinc'`), the
  component overrides, and `icon: { mode: 'css', cssLayer: 'base' }`.

## Rules for UI code here

- **Auto-imports.** Components (`UButton`, your own `ProductCard`) and composables
  (`ref`, `computed`, `useToast`, `defineShortcuts`) are auto-imported: never import
  them. Types come from `@nuxt/ui` or `#ui/types`
  (`import type { FormSubmitEvent } from '#ui/types'`). Third-party libraries such
  as `zod` are imported as usual.
- **Text** goes through `t()`: a component with an `<i18n>` block takes it from
  `useStoreI18n('<its path under app/, no .vue>')`. No hardcoded Greek or English.
- **Tokens, not palette colours**: `text-default`, `bg-elevated`, `border-muted`,
  `text-primary`, never `text-zinc-700`. A store's theme rewrites the tokens per
  request, so a named colour ignores the store and the colour scheme.
  [references/theming.md](references/theming.md) lists them with the repo's own rules.
- **Images** go through `<NuxtImg>` / `ImgWithFallback` and the media-stream
  provider, never a raw `<img>` with a hand-built URL (`ui-and-pages.md`, Image Handling).
- **Click handlers** on `UButton` are typed `(e: MouseEvent) => void | Promise<void>`:
  write `@click="() => { open = true }"`, not `@click="open = true"`, or `pnpm typecheck` fails.
- **Failed API calls** are reported with `useApiError().notify()` or
  `useApiFormErrors()`, never a hand-written `toast.add({ color: 'error' })` in a
  `catch` (`test/unit/source-rules/errors-go-through-the-helper.spec.ts`).
- **Every design.** A component used by webside's tree is verified there too
  (`app/components/variants/webside/**`), and webside's own files are not restyled by accident.

## Icons

Icons are Iconify names in the form `i-{collection}-{name}`:

```vue
<UIcon name="i-lucide-sun" class="size-5" />
<UButton icon="i-lucide-plus" :label="t('add')" />
```

- The collections are the `@iconify-json/*` packages in `package.json`, listed again
  in `icon.serverBundle.collections` in `nuxt.config.ts`, plus the local `brand`
  collection (`app/assets/icons/brand/<file>.svg` is `i-brand-<file>`). A new
  collection needs both the package and the list entry.
- Icons render in CSS mode, and SSR resolves only what the client bundle holds:
  `icon.clientBundle.scan` collects names from `app/**` and `shared/**` `.vue`/`.ts`
  files. Write each name as a full literal string; a name assembled at runtime is not
  found by the scan and paints blank in the server render.
- `test/unit/source-rules/icon-names-exist.spec.ts` fails on a name its collection
  does not hold. Browse names at [icones.js.org](https://icones.js.org).

## Customizing a component

Highest priority first: the `ui` prop or `class` prop on the instance, then
`app/app.config.ts`, then the library theme.

```vue
<UButton :ui="{ base: 'rounded-none', trailingIcon: 'size-3 rotate-90' }" />
<UCard :ui="{ header: 'bg-muted', body: 'p-8' }" />
```

`class` lands on the component's `root` (or `base`) slot. Read the generated theme
for the slot names first. Global overrides, variants and the repo's token rules are
in [references/theming.md](references/theming.md).

## Forms

`UForm` validates its `state` against a Standard Schema (this repo uses Zod 4) and
emits `@submit` only with valid data.

```vue
<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const { t } = useStoreI18n('components/Example/SignInForm')

// `t()` runs inside the error callbacks, at validation time, so store text
// overrides that arrive later are used (see `useAuthEmailSchema()`)
const schema = z.object({
  email: z.email({ error: () => t('emailInvalid') }),
  password: z.string().min(8, { error: () => t('passwordShort') }),
})
type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({ email: undefined, password: undefined })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  // event.data is the parsed, valid Schema
}
</script>

<template>
  <UForm :schema="schema" :state="state" @submit="onSubmit">
    <UFormField name="email" :label="t('email')" required>
      <UInput v-model="state.email" type="email" />
    </UFormField>
    <UFormField name="password" :label="t('password')" required>
      <UInput v-model="state.password" type="password" />
    </UFormField>
    <UButton type="submit" :label="t('submit')" />
  </UForm>
</template>

<i18n lang="yaml">
el:
  email: Email
  # …
en:
  email: Email
  # …
</i18n>
```

The repo keeps a form's schema, state and submit in a composable
(`app/composables/useLoginCodeRequest.ts`), and puts server-side field errors under
their inputs with `useApiFormErrors(form, …).reportFailure(…)`
(`ui-and-pages.md`, Failed calls).

## Overlays

Overlays are declarative here: a `v-model:open` ref per overlay.

```vue
<UModal v-model:open="open" :title="t('edit')" :description="t('editHint')">
  <template #body>…</template>
  <template #footer>
    <UButton color="neutral" variant="ghost" :label="t('cancel')" @click="() => { open = false }" />
    <UButton :label="t('save')" @click="save" />
  </template>
</UModal>

<UDropdownMenu
  :items="[
    [{ label: t('edit'), icon: 'i-lucide-pencil', onSelect: edit }],
    [{ label: t('delete'), icon: 'i-lucide-trash', color: 'error', onSelect: remove }],
  ]"
>
  <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" :aria-label="t('actions')" />
</UDropdownMenu>
```

- `UModal`, `USlideover` and `UDrawer` keep their overlay: never `:overlay="false"`
  (`test/unit/source-rules/modal-overlays-keep-their-overlay.spec.ts`; the reka-ui
  patch it protects is described in `CLAUDE.md`).
- An overlay most visitors never open loads on its first open:
  `const mounted = useMountOnFirstOpen(open)` and `<LazyUModal v-if="mounted" v-model:open="open">`
  (`app/components/Chrome/Assistant.vue`). One every visitor taps (the phone menu) is
  premounted at idle: `const premount = useOverlayPremount()` and
  `:unmount-on-hide="!premount"` (`app/components/Chrome/MobileMenu.vue`).

## Layouts

Load the reference for the surface you work on:

| Surface | Reference |
|---|---|
| Store pages and page-builder sections (`UPageHero`, `UPageSection`, `UPageGrid`, `UPageCard`, `UContentToc`) | [layouts/page.md](references/layouts/page.md) |
| The page editor's three-pane frame (`UDashboardGroup`, `UDashboardSidebar`, `UDashboardPanel`) | [layouts/dashboard.md](references/layouts/dashboard.md) |
| The shopping assistant (`UChatPalette`, `UChatMessages`, `UChatPrompt`) | [layouts/chat.md](references/layouts/chat.md) |
| The page editor's rich text field (`UEditor`, `UEditorToolbar`) | [layouts/editor.md](references/layouts/editor.md) |

## Additional references

Load what the task needs, not all at once:

- [references/components.md](references/components.md): components by category with key props, and the repo's constraints on some of them
- [references/composables.md](references/composables.md): `useToast`, `useOverlay`, `defineShortcuts`, `extractShortcuts`, locales
- [references/theming.md](references/theming.md): semantic colours, token utilities, CSS variables, global overrides
