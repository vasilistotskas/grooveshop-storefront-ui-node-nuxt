# Composables

All of these are auto-imported. Signatures are in
`node_modules/@nuxt/ui/dist/runtime/composables/*.d.ts`; the docs list the rest
(`useFormField`, `useScrollspy`, `useFileUpload`, …):
[ui.nuxt.com/docs/composables](https://ui.nuxt.com/docs/composables).

## useToast

Needs the `UApp` wrapper (it renders the toaster).

```ts
const toast = useToast()

const shown = toast.add({
  title: t('saved'),
  description: t('savedHint'),
  color: 'success',         // any semantic colour
  icon: 'i-lucide-check-circle',
  duration: 5000,           // 0 keeps it open
  actions: [{ label: t('undo'), onClick: () => undo() }],
})

toast.update(shown.id, { description: t('savedAgain') })
toast.remove(shown.id)
toast.clear()

// One toast across a promise: loading, then success or error
await toast.promise(save(), {
  loading: t('saving'),
  success: t('saved'),
  error: t('notSaved'),
})
```

A toast with the same `id` as an open one pulses it instead of stacking a second.
A failed API call is never toasted by hand: `useApiError().notify(id, error, { title })`
toasts Django's reason in the page's language (`ui-and-pages.md`, Failed calls).

## useOverlay

Opens a component as an overlay from script. The storefront has no caller: its
overlays are declarative (`v-model:open`, see [SKILL.md](../SKILL.md#overlays)).
When one is needed:

```ts
const overlay = useOverlay()

// create() takes the component object and returns a reusable instance
const confirm = overlay.create(ConfirmDialog)

// open() takes the component's props; its result settles with the value
// the component emits as `close`: emit('close', true)
const confirmed = await confirm.open({ title: t('deleteTitle') }).result

confirm.close()          // close from outside
confirm.patch({ title }) // change props while open
```

The overlay instance also has `overlay.closeAll()`, `overlay.isOpen(id)` and
`overlay.unmount(id)`.

## defineShortcuts

```ts
defineShortcuts({
  meta_k: () => openSearch(),   // Cmd+K on macOS, Ctrl+K elsewhere
  escape: () => close(),
  'g-p': () => goToProducts(),  // a chain: G, then P
  meta_enter: {
    handler: () => submit(),
    usingInput: true,           // also fires while an input is focused
  },
})
```

| Key part | Meaning |
|---|---|
| `meta` | Cmd on macOS, Ctrl elsewhere |
| `ctrl`, `alt`, `shift` | Those modifiers |
| `_` | Joins the keys of one combination (`meta_shift_p`) |
| `-` | Separates the steps of a chain (`g-p`) |

The config may be a `computed` to switch shortcuts on and off (`app/components/Builder/Editor.vue`).
The options argument takes `chainDelay` (ms between chain steps) and `layoutIndependent`.

## extractShortcuts

Builds a `defineShortcuts` map from menu items that have `kbds` and `onSelect` (or
`onClick`), nested `children` and `items` included:

```ts
const items = [
  { label: t('newPage'), kbds: ['meta', 'n'], onSelect: () => createPage() },
  { label: t('save'), kbds: ['meta', 's'], onSelect: () => save() },
]

defineShortcuts(extractShortcuts(items))
```

## Locales: defineLocale, extendLocale

`UApp` follows the `@nuxtjs/i18n` locale and loads Nuxt UI's messages for the
locales `i18n.locales` lists, so the storefront passes no `locale` prop. Nuxt UI
`Locale` objects (`{ name, code, dir, messages }`, from `@nuxt/ui/locale`) are needed
only where a component takes them, such as `ULocaleSelect`; the repo imports them
by name in `app/utils/uiLocales.ts`, never as a namespace, which would bundle all of them.

`defineLocale({ name, code, dir, messages })` creates a locale and
`extendLocale(locale, { messages })` overrides part of one; pass the result to
`UApp`'s `locale` prop.
