# Chat Layout

The shopping assistant is a first-party chat widget. It does not use the Vercel AI
SDK: `app/composables/useShopChat.ts` talks to the agent gateway's same-origin
`POST /chat` server-sent-events endpoint, and `app/components/Chrome/AssistantPanel.vue`
renders the result with Nuxt UI's chat components. Read both files before changing it.

The assistant exists in two designs, resolved by `app/utils/variantRegistry.ts`: the
default design uses `Chrome/Assistant.vue`, webside uses `Chat/Widget.vue` with
`Chat/Panel.vue`. A change to the chat is verified in both.

## Component tree

```
Chrome/Assistant.vue            lazy UModal, mounted on first open
└── Chrome/AssistantPanel.vue
    └── UChatPalette
        ├── UChatMessages       #content renders text, tool chips and product cards
        │   └── UChatTool, UChatShimmer (loading indicator)
        └── UChatPrompt         #footer holds UChatPromptSubmit
```

## Rules

- `UChatMessages` consumes the `UIMessage` shape (`{ id, role, parts }`). The
  composable's `ShopChatMessage` is mapped onto text parts, and what a `UIMessage`
  cannot carry (tool activity, product lists in the order they happened) is looked up
  by message id in the `#content` slot.
- The status passed to `UChatMessages` is `submitted` while the assistant bubble is
  still empty, so its indicator shows; `streaming` and `error` follow `useShopChat`.
- Every string goes through `t()`; the panel's `<i18n>` block holds the Greek and English text.
- The overlay is lazy: see Overlays in [../../SKILL.md](../../SKILL.md).

## Components

Props, slots and emits for `UChatPalette`, `UChatMessages`, `UChatPrompt`,
`UChatPromptSubmit`, `UChatTool` and `UChatShimmer` are in
`node_modules/@nuxt/ui/dist/runtime/components/<Name>.vue.d.ts`.
