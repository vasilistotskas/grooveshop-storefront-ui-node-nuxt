# Components

The components below are the ones the storefront uses, with the props you reach
for most. They are not the whole library, and not every prop: the installed
`node_modules/@nuxt/ui/dist/runtime/components/<Name>.vue.d.ts` is the full API of
the pinned version, and [ui.nuxt.com/docs/components](https://ui.nuxt.com/docs/components)
(or the `nuxt-ui-remote` MCP server's `search-components`) lists everything else,
such as `UListbox`, `UToggleGroup`, `USplitter` or `USidebar`. Search there before
building a control yourself. Slot names and default classes are in the generated
theme, `.nuxt/ui/<kebab-name>.ts`.

## Layout

| Component | Use |
|---|---|
| `UApp` | Root wrapper in `app/app.vue`: toaster, tooltips, overlays, locale |
| `UMain` | Main area under the header, min-height from `--ui-header-height` (the repo's `app.config.ts` uses `100dvh`) |
| `UContainer` | Centered, max width `--ui-container` (the repo sets it in `main.css`) |
| `UFooter`, `UFooterColumns` | Footer (`#left`, `#default`, `#right`, `#top`, `#bottom`) and its link columns (`Chrome/Footer.vue`) |

The store's header, navbar and footer are the repo's own chrome, resolved per
design with `resolveChrome()` (`ui-and-pages.md`), not `UHeader`.

## Element

| Component | Key props |
|---|---|
| `UButton` | `label`, `icon`, `trailing-icon`, `color`, `variant`, `size`, `loading`, `loading-auto`, `disabled`, `to`, `block` |
| `UBadge` | `label`, `color`, `variant`, `size`, `icon` |
| `UAvatar` / `UAvatarGroup` | `src`, `alt`, `icon`, `text`, `size` / `max`, `size` |
| `UIcon` | `name` (size it with a `size-*` class) |
| `UCard` | `variant` (`outline` default, `solid`, `soft`, `subtle`); slots `#header`, `#default`, `#footer` |
| `UAlert` | `title`, `description`, `icon`, `color`, `variant`, `close`, `actions` |
| `UBanner` | `title`, `icon`, `close`, `to` (the announcement bar) |
| `UChip` | `color`, `size`, `position`, `text`; a dot on its child |
| `UKbd` | `value` |
| `USeparator` | `label`, `icon`, `orientation`, `type` (`solid`, `dashed`, `dotted`) |
| `USkeleton` | `class`; loading placeholder |
| `UProgress` | `v-model` (the value), `max`, `color`, `size` |
| `UCollapsible` | `v-model:open`; slots `#default` (trigger), `#content` |
| `UEmpty` | `icon`, `title`, `description`, `actions`, `loading`, `variant` |
| `UCalendar` | `v-model`, `range`, `multiple` |
| `UFieldGroup` | Joins buttons and inputs into one control |

## Form

| Component | Key props |
|---|---|
| `UForm` | `schema`, `state`, `@submit` (a `FormSubmitEvent<T>`), `validate-on` |
| `UFormField` | `name`, `label`, `description`, `hint`, `help`, `error`, `required` |
| `UInput` | `v-model`, `type`, `placeholder`, `icon`, `loading` |
| `UTextarea` | `v-model`, `rows`, `autoresize`, `maxrows` |
| `USelect` | `v-model`, `items` (flat `T[]` or grouped `T[][]`), `placeholder` |
| `USelectMenu` | `v-model`, `items`, `multiple`, `search-input` (the search field; `false` hides it) |
| `UInputMenu` | `v-model`, `items`, `multiple`; an autocomplete input |
| `UInputNumber` | `v-model`, `min`, `max`, `step` |
| `UInputDate` / `UInputTime` | `v-model`, `range`, `granularity`, `hour-cycle` (date and time formats follow `UApp`'s locale) |
| `UInputTags` | `v-model`, `max`, `max-length`, `placeholder` |
| `UInputRating` | `v-model`, `length`, `step`, `readonly` |
| `UPinInput` | `v-model`, `length`, `type`, `mask`, `otp` |
| `UCheckbox` / `UCheckboxGroup` | `v-model`, `label`, `description` / `v-model`, `items`, `orientation` |
| `URadioGroup` | `v-model`, `items`, `orientation` |
| `USwitch` | `v-model`, `label`, `checked-icon`, `unchecked-icon` |
| `USlider` | `v-model`, `min`, `max`, `step` |
| `UColorPicker` | `v-model`, `format` (`hex`, `rgb`, `hsl`, `cmyk`, `lab`), `size` |
| `UFileUpload` | `v-model`, `accept`, `multiple`, `variant` (`area`, `button`); slot `#actions` gets `{ open, files, removeFile }` |
| `UAuthForm` | `fields`, `schema`, `providers`, `submit`, `@submit`; a whole sign-in form |

Form validation with Zod 4 is shown in [SKILL.md](../SKILL.md#forms).

## Data

| Component | Key props |
|---|---|
| `UTable` | `data`, `columns`, `loading`, `sticky` |
| `UAccordion` | `items`, `type` (`single`, `multiple`), `collapsible` |
| `UCarousel` | `items`, `orientation`, `arrows`, `dots`, `autoplay` |
| `UTimeline` | `items` |
| `UTree` | `items` |
| `UUser` | `name`, `description`, `avatar` |
| `UMarquee` | `repeat`, `reverse`, `orientation`, `pause-on-hover` |
| `UScrollArea` | Scroll container with a styled scrollbar |
| `UChart` | `type`, `data`, `index`, `categories` (`Product/PriceTrend.vue`) |

`UCarousel` hangs its arrows outside the box from `sm` up: an arrow override in `:ui`
needs its `sm:` twin for every horizontal inset it sets
(`test/unit/source-rules/carousel-arrow-overrides.spec.ts`).

## Navigation

| Component | Key props |
|---|---|
| `UNavigationMenu` | `items` (flat or grouped), `orientation` |
| `UBreadcrumb` | `items` |
| `UTabs` | `items`, `orientation`, `variant` |
| `UStepper` | `items`, `orientation`, `color` |
| `UPagination` | `v-model:page`, `total`, `items-per-page` |
| `ULink` | `to`, `active`, `active-class`, `inactive-class`, `locale` |
| `UCommandPalette` | `groups` (`{ id, label?, items }[]`), `v-model:search-term`, `placeholder`; rendered inside a `UModal` |

With `@nuxtjs/i18n` installed, `ULink` and `UButton` localize a string `to` that
does not already start with a locale prefix (`:locale="false"` turns that off).
Build `to` the way `ui-and-pages.md` says anyway: a route name through
`localePath()`, `pathLocation()` for a runtime path, `useLinkTo()` for a link a store wrote.

## Overlay

| Component | Key props |
|---|---|
| `UModal` | `v-model:open`, `title`, `description`, `fullscreen`, `scrollable`, `dismissible`, `close` |
| `USlideover` | `v-model:open`, `title`, `side` (`left`, `right`, `top`, `bottom`) |
| `UDrawer` | `v-model:open`, `title`, `handle` |
| `UPopover` | `mode` (`click`, `hover`), `arrow`, `content: { side, align }`, `open-delay`, `close-delay` |
| `UTooltip` | `text`, `content: { side }`, `delay-duration` |
| `UDropdownMenu` | `items` (flat, or grouped `T[][]` with separators between groups; `children` for submenus; `type: 'separator'` for a divider) |
| `UContextMenu` | `items`; right-click menu |
| `UToast` | Shown through `useToast()` ([composables.md](composables.md)) |

`UModal`, `USlideover` and `UDrawer` share the slots `#content` (replaces the whole
panel), `#header`, `#title`, `#description`, `#actions`, `#close`, `#body`, `#footer`.
None of them may set `:overlay="false"` (see [SKILL.md](../SKILL.md#overlays)).

## Page

Used by the page-builder sections and a few webside pages; where each is used is in
[layouts/page.md](layouts/page.md).

| Component | Use |
|---|---|
| `UPageHero` | Hero with `title`, `description`, `links`, `orientation`, `reverse` |
| `UPageSection` | Section with `headline`, `title`, `description`, `features`, `links`, `orientation`, `reverse` |
| `UPageGrid` | Responsive grid for cards |
| `UPageCard` | Card with `title`, `description`, `icon`, `to`, `orientation`, `spotlight`, `variant` |
| `UPageFeature` | One feature: `title`, `description`, `icon` |
| `UPageHeader` | Page title block: `headline`, `title`, `description`, `links` |
| `UContentToc` | Table of contents: `links`, `title`, `color`, `highlight` (`Storefront/BlogPost.vue`) |

## Dashboard, Chat, Editor

Each has one place in this repo; see its layout reference:

- `UDashboardGroup`, `UDashboardSidebar`, `UDashboardPanel`: the page editor's frame, [layouts/dashboard.md](layouts/dashboard.md)
- `UChatPalette`, `UChatMessages`, `UChatTool`, `UChatShimmer`, `UChatPrompt`, `UChatPromptSubmit`: the shopping assistant, [layouts/chat.md](layouts/chat.md)
- `UEditor`, `UEditorToolbar`: the page editor's rich text field, [layouts/editor.md](layouts/editor.md)

## Color mode and locale

| Component | Use |
|---|---|
| `UColorModeButton`, `UColorModeSelect` | Light/dark toggle and system/light/dark select |
| `ULocaleSelect` | Language select over Nuxt UI `Locale` objects (`locales`, `v-model`); the repo builds the list with `toUiLocales()` (`app/utils/uiLocales.ts`) |
