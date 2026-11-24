# Dashboard Layout

The page editor (`app/components/Builder/Editor.vue`) is the only user of the
dashboard components: a three-pane frame with an outline on the left, the live
canvas in the middle and the settings on the right. Read that file first.

## Component tree

```
UDashboardGroup (unit="px", :persistent="false")
├── UDashboardSidebar id="builder-outline"    outline, resizable
├── UDashboardPanel id="builder-preview"      notices in #header, canvas in #body
└── UDashboardSidebar id="builder-settings"   side="right", inspector, resizable
```

## Rules

- `UDashboardSidebar` is used with `resizable`, `:toggle="false"` and a
  `v-model:open` ref. Each pane has its own close button in its `#header` for
  the phone, where the sidebar opens as an overlay.
- Pane sizes are pixels and come from `BUILDER_OUTLINE_PANE` and
  `BUILDER_SETTINGS_PANE` in `shared/constants/builderEditor.ts` (`min`, `default`,
  `max`): never literals in the template. `UDashboardGroup` takes `unit="px"` to match.
- `:persistent="false"`: the group does not store pane sizes in a cookie or local storage.
- Every pane has an `id`; the group needs it to track sizes.
- Panels use their `#header` and `#body` slots; the canvas scrolls in `#body`.
- Text goes through `t()` like everywhere else; the editor is a store admin
  surface and is verified in every design.

## Props

Props, slots and emits are in
`node_modules/@nuxt/ui/dist/runtime/components/DashboardGroup.vue.d.ts`,
`DashboardSidebar.vue.d.ts` and `DashboardPanel.vue.d.ts`. The group's `storage`
is `'cookie'` or `'local'` and applies while `persistent` is on.
