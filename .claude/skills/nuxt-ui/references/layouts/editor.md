# Editor Layout

The page editor's rich text field is `app/components/Builder/RichTextField.vue`,
a `UEditor` (TipTap) with a `UEditorToolbar`. It is the only editor in the
storefront; read it before changing it.

## Component tree

```
UEditor  content-type="html", v-model as HTML
└── UEditorToolbar  items from the field, a #link slot with a UPopover
```

## Rules

- The value is HTML (`content-type="html"`), and the editor may write only
  markup the store's sanitiser keeps (`src/core/utils/sanitize.py` in Django).
  So the `starter-kit` option turns off code blocks and inline code, limits
  headings to `BUILDER_RICH_TEXT_HEADING_LEVELS` and keeps links from opening
  on click; `:image="false"` and `:mention="false"`. A new node or mark needs
  the sanitiser to keep it first.
- The toolbar is built from `EditorToolbarItem[][]` groups. Every button has an
  `aria-label` and a tooltip from `t()`.
- The field's `aria-label` and `role="textbox"` go through `editor-props`.
- An emptied editor still holds an empty paragraph: the field reports `undefined`
  when TipTap's `isEmpty` is true, so a setting is removed instead of saved empty.
- Styling goes through the `ui` prop (`root`, `content`, `base`), with token
  classes (`ring-accented`, `border-default`).

## Props

`UEditor` and `UEditorToolbar` props, slots and the toolbar item kinds are in
`node_modules/@nuxt/ui/dist/runtime/components/Editor.vue.d.ts` and
`EditorToolbar.vue.d.ts`.
